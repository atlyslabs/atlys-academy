#!/usr/bin/env node
/**
 * Screenshot a route at given scroll offsets.
 *
 * The agent Browser pane in this environment runs with a 0x0 viewport and never
 * composites frames, so it cannot review a page whose signature element is an
 * animated canvas. This drives the installed Chrome over the DevTools Protocol
 * instead. Node 22 ships a global WebSocket, so the harness needs no
 * dependencies and never touches the app bundle.
 *
 * Usage:
 *   node scripts/shoot.mjs --url http://localhost:3000/ --at 0,0.35,0.7
 *   node scripts/shoot.mjs --at 0 --size 390x844 --dpr 3 --label mobile
 *   node scripts/shoot.mjs --at 0 --motion reduce
 *   node scripts/shoot.mjs --at 0.4 --hover "[href='/onboarding/day-2']"
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { launch, sleep } from "./lib/cdp.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URL_ = arg("url", "http://localhost:3000/");
const OUT = resolve(arg("out", "screenshots"));
const SHOTS = arg("at", "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Number.isFinite);
const [WIDTH, HEIGHT] = arg("size", "1440x900")
  .split("x")
  .map((n) => parseInt(n, 10));
const DPR = Number(arg("dpr", "1.5"));
const MOTION = arg("motion", "");
const LABEL = arg("label", "");
const HOVER = arg("hover", "");
/** Viewport coordinates to park the pointer at, e.g. --hover-at "1000,470". */
const HOVER_AT = arg("hover-at", "");
/** Extra settle time, in ms. The dither intro runs 1500ms. */
const SETTLE = Number(arg("settle", "2200"));
/**
 * DevTools port. Two concurrent harness runs (e.g. two agent sessions on the
 * same checkout) MUST use different ports: `launch` attaches to whatever
 * Chrome already answers on the port, so a shared port screenshots the other
 * run's tab.
 */
const PORT = Number(arg("port", "9333"));

await mkdir(OUT, { recursive: true });

const { cdp, dispose } = await launch({ width: WIDTH, height: HEIGHT, port: PORT });

try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: DPR,
    mobile: WIDTH < 768,
  });
  if (MOTION) {
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: MOTION }],
    });
  }

  const errors = [];
  cdp.on("Runtime.exceptionThrown", (p) => {
    errors.push(p?.exceptionDetails?.exception?.description ?? "exception");
  });
  cdp.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") {
      errors.push(p.args?.map((a) => a.value ?? a.description).join(" "));
    }
  });

  for (const at of SHOTS) {
    await cdp.send("Page.navigate", { url: URL_ });
    await cdp.send("Runtime.evaluate", {
      expression: "new Promise(r => requestAnimationFrame(() => r(1)))",
      awaitPromise: true,
    });
    // Fonts first: a shot taken before Tinos loads measures the fallback serif.
    await cdp.send("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => 1)",
      awaitPromise: true,
    });
    await sleep(SETTLE);

    // Scroll as a fraction of the scrollable height, then let the reveals and
    // Lenis settle before the frame is taken.
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: max * ${at}, behavior: 'instant' });
        return max;
      })()`,
    });
    await sleep(at > 0 ? 1500 : 400);

    if (HOVER) {
      const { result } = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(HOVER)});
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        })()`,
      });
      if (result.value) {
        const { x, y } = JSON.parse(result.value);
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x,
          y,
          buttons: 0,
        });
        await sleep(600);
      }
    } else if (HOVER_AT) {
      const [x, y] = HOVER_AT.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x,
          y,
          buttons: 0,
        });
        await sleep(600);
      }
    }

    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const name = [
      "home",
      LABEL || `${WIDTH}x${HEIGHT}`,
      MOTION ? `motion-${MOTION}` : "",
      `at${String(at).replace(".", "_")}`,
    ]
      .filter(Boolean)
      .join("-");
    const file = join(OUT, `${name}.png`);
    await writeFile(file, Buffer.from(data, "base64"));
    console.log(`wrote ${file}`);
  }

  if (errors.length) {
    console.log(`\nconsole errors (${errors.length}):`);
    for (const e of new Set(errors)) console.log(`  ${e}`);
  } else {
    console.log("\nno console errors");
  }
} finally {
  await dispose();
}
