#!/usr/bin/env node
/**
 * Measure real rendered contrast on a route.
 *
 * Token maths tells you what a colour pair *should* measure. It does not account
 * for what the page actually paints on top: this canvas carries a grain veil and
 * a vignette over every surface, both of which move the effective background.
 * So this reads the composited pixels instead - it screenshots the page, samples
 * the backdrop immediately around each text node, and computes the ratio against
 * the text's own computed colour.
 *
 * Usage:
 *   node scripts/contrast.mjs --url http://localhost:3000/ --at 0
 */

import { launch, sleep } from "./lib/cdp.mjs";
import { inflateSync } from "node:zlib";

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const URL_ = arg("url", "http://localhost:3000/");
const AT = Number(arg("at", "0"));
const WIDTH = 1440;
const HEIGHT = 900;

/** Minimal PNG reader: returns {width, height, rgba} for 8-bit RGB/RGBA. */
function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat = [];
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    pos += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, data: out, channels };
}

const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]) =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const { cdp, dispose } = await launch({ width: WIDTH, height: HEIGHT });
try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send("Page.navigate", { url: URL_ });
  await cdp.send("Runtime.evaluate", {
    expression: "document.fonts.ready.then(()=>1)",
    awaitPromise: true,
  });
  await sleep(2600);
  await cdp.send("Runtime.evaluate", {
    expression: `window.scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*${AT},behavior:'instant'})`,
  });
  await sleep(1400);

  // Collect every visible text node worth checking, with its colour, font size
  // and a point just outside its glyphs to sample the backdrop from.
  const { result } = await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const out = [];
      const seen = new Set();
      for (const el of document.querySelectorAll('h1,h2,h3,p,span,a,dd,dt,li')) {
        const text = (el.textContent || '').trim();
        if (!text || text.length > 90) continue;
        if (el.querySelector('h1,h2,h3,p,span,a,dd,dt,li')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.top < 0 || r.bottom > innerHeight) continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || Number(s.opacity) < 0.05) continue;
        const key = text.slice(0, 28) + Math.round(r.top);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          text: text.slice(0, 34),
          color: s.color,
          size: parseFloat(s.fontSize),
          weight: s.fontWeight,
          x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
      return JSON.stringify(out);
    })()`,
  });
  const nodes = JSON.parse(result.value);

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  const png = decodePng(Buffer.from(shot.data, "base64"));
  const px = (x, y) => {
    const i = (y * png.width + x) * png.channels;
    return [png.data[i], png.data[i + 1], png.data[i + 2]];
  };

  console.log(
    "text".padEnd(36) + "size  color".padEnd(24) + "bg".padEnd(18) + "ratio  AA",
  );
  console.log("-".repeat(96));

  let fails = 0;
  for (const n of nodes) {
    const fg = n.color.match(/\d+/g).slice(0, 3).map(Number);
    // Backdrop sampled from the darkest pixel in a band just below the text box,
    // which is canvas rather than glyph, and includes the grain and vignette.
    const samples = [];
    for (let dx = 0; dx < n.w; dx += Math.max(1, Math.floor(n.w / 24))) {
      const sx = Math.min(png.width - 1, Math.max(0, n.x + dx));
      const sy = Math.min(png.height - 1, Math.max(0, n.y + n.h + 2));
      samples.push(px(sx, sy));
    }
    if (!samples.length) continue;
    // Median of the samples: a mean would be pulled by any glyph that leaks in.
    const med = [0, 1, 2].map((c) => {
      const v = samples.map((s) => s[c]).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)];
    });
    const r = ratio(fg, med);
    const large = n.size >= 24 || (n.size >= 18.66 && Number(n.weight) >= 700);
    const need = large ? 3 : 4.5;
    const ok = r >= need;
    if (!ok) fails += 1;
    console.log(
      n.text.padEnd(36) +
        `${n.size.toFixed(0)}px`.padEnd(6) +
        `rgb(${fg.join(",")})`.padEnd(18) +
        `rgb(${med.join(",")})`.padEnd(18) +
        `${r.toFixed(2)}  ${ok ? "pass" : `FAIL (needs ${need})`}`,
    );
  }
  console.log("-".repeat(96));
  console.log(`${nodes.length} nodes, ${fails} below AA`);
} finally {
  await dispose();
}
