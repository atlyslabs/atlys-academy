#!/usr/bin/env node
/**
 * Measure the crop box of every stamp on `public/stamps.jpg`.
 *
 * The sheet is a grid of stamps printed on cream, each cell numbered in
 * neutral grey. The ink is colourful and the cell numbers are not, so a
 * saturation threshold isolates the stamp from both the paper and its own
 * number - which is what lets the boxes be measured rather than eyeballed.
 *
 * Emits the `STAMP_SPRITES` table for `src/lib/stamp-sprites.ts`. Re-run it
 * whenever the sheet is redrawn: the grid changed from 5x6 to 6x5 in Aug 2026
 * and every y coordinate moved, which no amount of careful hand-editing would
 * have caught.
 *
 * Usage:
 *   node scripts/measure-stamps.mjs --cols 5 --rows 6
 *   node scripts/measure-stamps.mjs --margin 6 --sat 0.22
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launch } from "./lib/cdp.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SHEET = resolve(arg("sheet", "public/stamps.jpg"));
const COLS = parseInt(arg("cols", "5"), 10);
const ROWS = parseInt(arg("rows", "6"), 10);
/** Breathing room so a stamp rotated by the renderer never clips its own ink. */
const MARGIN = parseInt(arg("margin", "6"), 10);
/** Saturation above which a pixel counts as stamp ink rather than paper or a number. */
const SAT = Number(arg("sat", "0.22"));

const dataUrl = `data:image/jpeg;base64,${(await readFile(SHEET)).toString("base64")}`;

const { cdp, dispose } = await launch({ width: 600, height: 400 });
try {
  await cdp.send("Runtime.enable");

  const { result } = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const img = new Image();
      img.src = ${JSON.stringify(dataUrl)};
      await img.decode();

      const W = img.naturalWidth, H = img.naturalHeight;
      const canvas = new OffscreenCanvas(W, H);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, W, H);

      const COLS = ${COLS}, ROWS = ${ROWS}, MARGIN = ${MARGIN}, SAT = ${SAT};
      const cellW = W / COLS, cellH = H / ROWS;
      const boxes = [];

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          // Search strictly inside the cell so a neighbour's ink, or its
          // grunge texture crossing the boundary, cannot pull the box out.
          const x0 = Math.floor(col * cellW), x1 = Math.floor((col + 1) * cellW) - 1;
          const y0 = Math.floor(row * cellH), y1 = Math.floor((row + 1) * cellH) - 1;

          let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
          for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
              const i = (y * W + x) * 4;
              const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
              const max = Math.max(r, g, b), min = Math.min(r, g, b);
              // HSV saturation. Cream paper and the grey cell numbers sit far
              // below the threshold; every stamp ink on this sheet sits above.
              const s = max === 0 ? 0 : (max - min) / max;
              if (s < SAT) continue;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }

          if (maxX < 0) { boxes.push(null); continue; }

          const bx = Math.max(x0, minX - MARGIN);
          const by = Math.max(y0, minY - MARGIN);
          const bw = Math.min(x1, maxX + MARGIN) - bx + 1;
          const bh = Math.min(y1, maxY + MARGIN) - by + 1;
          boxes.push([bx, by, bw, bh]);
        }
      }
      return { W, H, boxes };
    })()`,
  });

  if (result.subtype === "error") throw new Error(result.description);
  const { W, H, boxes } = result.value;

  console.log(`// sheet ${W}x${H}, ${COLS} cols x ${ROWS} rows, margin ${MARGIN}px, sat >= ${SAT}`);
  boxes.forEach((box, i) => {
    if (!box) {
      console.log(`  // cell ${i + 1}: EMPTY (no ink found)`);
      return;
    }
    console.log(`  { place: "cell ${i + 1}", box: [${box.join(", ")}] },`);
  });
} finally {
  await dispose();
}
