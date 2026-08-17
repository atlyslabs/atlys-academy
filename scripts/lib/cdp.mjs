/**
 * Minimal Chrome DevTools Protocol client, shared by the screenshot and contrast harnesses.
 *
 * Node 22 ships a global WebSocket, so driving the installed Chrome needs zero dependencies
 * and never touches the runtime bundle. Extracted from scripts/shoot.mjs when
 * scripts/contrast.mjs needed the same launch-and-attach dance; one copy, two consumers.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class CDP {
  #ws;
  #id = 0;
  #pending = new Map();
  #listeners = new Map();

  static async attach(url) {
    const c = new CDP();
    c.#ws = new WebSocket(url);
    await new Promise((ok, fail) => {
      c.#ws.addEventListener('open', ok, { once: true });
      c.#ws.addEventListener('error', () => fail(new Error(`CDP connect failed: ${url}`)), {
        once: true,
      });
    });
    c.#ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      if (msg.id !== undefined) {
        const p = c.#pending.get(msg.id);
        if (!p) return;
        c.#pending.delete(msg.id);
        if (msg.error) p.fail(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? {})})`));
        else p.ok(msg.result);
        return;
      }
      for (const fn of c.#listeners.get(msg.method) ?? []) fn(msg.params);
    });
    return c;
  }

  send(method, params = {}) {
    const id = ++this.#id;
    this.#ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, fail) => {
      this.#pending.set(id, { ok, fail });
      setTimeout(() => {
        if (this.#pending.delete(id)) fail(new Error(`${method} timed out`));
      }, 60_000);
    });
  }

  on(method, fn) {
    const list = this.#listeners.get(method) ?? [];
    list.push(fn);
    this.#listeners.set(method, list);
  }

  close() {
    this.#ws.close();
  }
}

export function findChrome(override = '') {
  return (
    override ||
    [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ].find((p) => existsSync(p))
  );
}

/** Poll the DevTools HTTP endpoint until Chrome is listening. */
async function waitForChrome(port) {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error('Chrome never opened its DevTools port');
}

/**
 * Launch headless Chrome and attach to its first page target.
 *
 * `--enable-unsafe-swiftshader` is the software fallback so a run without a usable GPU still
 * produces a frame instead of a blank canvas. Returns a `dispose()` that kills the browser
 * and removes the throwaway profile.
 */
export async function launch({ chrome, port = 9333, width = 1440, height = 900, keepProfile = false }) {
  const bin = findChrome(chrome);
  if (!bin) throw new Error('No Chrome found. Pass --chrome <path to chrome.exe>.');

  const profile = join(tmpdir(), `atlys-cdp-${process.pid}-${port}`);
  const proc = spawn(
    bin,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--headless=new',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );

  const version = await waitForChrome(port);
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  const page = (await res.json()).find((t) => t.type === 'page');
  if (!page) throw new Error('No page target');
  const cdp = await CDP.attach(page.webSocketDebuggerUrl);

  return {
    cdp,
    version,
    async dispose() {
      cdp.close();
      proc.kill();
      await sleep(400);
      if (!keepProfile) await rm(profile, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

/**
 * In-page expression: scroll the document to an exact timeline progress.
 *
 * Progress is no longer `scrollY / range`. `PACING` in journey/config.ts redistributes the page so
 * the landing earns two and a half times the scrolling it used to, which means the position that
 * photographs progress 0.09 is nowhere near 9% down the document. The engine publishes the inverse
 * of that map on `window.__journeyScrollFor`; the linear fallback covers the window before the
 * engine chunk has booted, and every caller here re-applies afterwards.
 */
export const scrollToProgress = (p) => `(() => {
  const m = document.documentElement.scrollHeight - window.innerHeight;
  const f = window.__journeyScrollFor ? window.__journeyScrollFor(${p}) : ${p};
  window.scrollTo(0, f * m);
  return m;
})()`;

/**
 * Pin window.scrollY to an exact timeline progress before the engine boots.
 *
 * createJourney() seeds its progress straight from window.scrollY, so the timeline starts
 * exactly at `p` with nothing to damp. The rAF loop keeps re-applying while the spacer and
 * streamed assets settle the document height under it — and, since it outlives the engine's
 * idle-callback boot, its later ticks pick up the exact pacing inverse and correct the linear
 * guess the first few frames used.
 */
export function pinScroll(cdp, p) {
  return cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const apply = () => { ${scrollToProgress(p)}; };
      document.addEventListener('DOMContentLoaded', apply);
      window.addEventListener('load', apply);
      let n = 0;
      const tick = () => { apply(); if (++n < 150) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    })()`,
  });
}
