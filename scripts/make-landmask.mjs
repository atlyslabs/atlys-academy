/**
 * Generates src/components/fx/landmask.ts: an equal-area sampling of the
 * world's landmass as (lat, lon) points, packed as base64 Int16 pairs.
 *
 * One-off build tool, checked in so the data can be regenerated or re-tuned:
 *
 *   node scripts/make-landmask.mjs
 *
 * Source: Natural Earth 110m land polygons (public domain), fetched from the
 * natural-earth-vector mirror. The sampling is a latitude-banded grid with
 * cos(lat)-scaled column counts, so dot density is even on the sphere rather
 * than bunching at the poles.
 */

const SOURCES = [
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
];

/** Latitude step in degrees; equator column step matches it. */
const LAT_STEP = 1.6;
const LAT_MAX = 84; // skip the pole caps; they never read on the globe
const OUT = new URL("../src/components/fx/landmask.ts", import.meta.url);

async function fetchGeo() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geo = await res.json();
      console.log(`fetched ${url}`);
      return geo;
    } catch (err) {
      console.warn(`failed ${url}: ${err.message}`);
    }
  }
  throw new Error("no GeoJSON source reachable");
}

/**
 * Unwrap a ring's longitudes into one continuous sequence, so edges that
 * cross the antimeridian do not become false chords across the whole map
 * (that bug painted a band of "land" through the Indian Ocean). A ring that
 * circles the globe once after unwrapping (Antarctica) is closed over the
 * nearest pole so the polar cap tests as inside.
 */
function unwrap(raw) {
  const ring = [[raw[0][0], raw[0][1]]];
  let offset = 0;
  for (let i = 1; i < raw.length; i++) {
    let x = raw[i][0] + offset;
    const prev = ring[i - 1][0];
    if (x - prev > 180) {
      offset -= 360;
      x -= 360;
    } else if (x - prev < -180) {
      offset += 360;
      x += 360;
    }
    ring.push([x, raw[i][1]]);
  }
  const drift = ring[ring.length - 1][0] - ring[0][0];
  if (Math.abs(drift) > 180) {
    const poleLat = ring[0][1] < 0 ? -90 : 90;
    ring.push([ring[ring.length - 1][0], poleLat], [ring[0][0], poleLat]);
  }
  return ring;
}

/** Flatten Polygon/MultiPolygon features to unwrapped rings with bboxes. */
function collectRings(geo) {
  const rings = [];
  for (const feature of geo.features) {
    const g = feature.geometry;
    if (!g) continue;
    const polys =
      g.type === "Polygon" ? [g.coordinates]
      : g.type === "MultiPolygon" ? g.coordinates
      : [];
    for (const poly of polys) {
      for (const raw of poly) {
        const ring = unwrap(raw);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        rings.push({ ring, minX, minY, maxX, maxY });
      }
    }
  }
  return rings;
}

/**
 * Even-odd ray cast across every ring, so holes subtract naturally. Each
 * ring lives in its own unwrapped longitude frame, so the point is tested at
 * lon, lon-360 and lon+360; images outside the ring's bbox contribute
 * nothing.
 */
function isLand(rings, lon, lat) {
  let inside = false;
  for (const { ring, minX, minY, maxX, maxY } of rings) {
    if (lat < minY || lat > maxY) continue;
    for (const cand of [lon - 360, lon, lon + 360]) {
      if (cand < minX || cand > maxX) continue;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > lat !== yj > lat) {
          const cross = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
          if (cand < cross) inside = !inside;
        }
      }
    }
  }
  return inside;
}

const geo = await fetchGeo();
const rings = collectRings(geo);
console.log(`${rings.length} rings`);

const points = [];
const rows = Math.floor((LAT_MAX * 2) / LAT_STEP);
for (let r = 0; r <= rows; r++) {
  const lat = -LAT_MAX + r * LAT_STEP;
  const cols = Math.max(1, Math.round((360 / LAT_STEP) * Math.cos((lat * Math.PI) / 180)));
  for (let c = 0; c < cols; c++) {
    const lon = -180 + ((c + 0.5) / cols) * 360;
    if (isLand(rings, lon, lat)) points.push([lat, lon]);
  }
}
console.log(`${points.length} land points`);

// Sanity probes: known land, known ocean, the antimeridian and the Caspian.
const probes = [
  ["Delhi", 28.6, 77.2, true],
  ["Sydney", -33.9, 151.2, true],
  ["mid-Atlantic", 20, -40, false],
  ["south Pacific", -30, -120, false],
  ["Indian Ocean a", -12, 65, false],
  ["Indian Ocean b", -15, 78, false],
  ["Indian Ocean c", -18, 88, false],
  ["Fiji", -17.8, 177.9, true],
  ["Antarctica 0E", -78, 0, true],
  // 179.5, not 180: exactly on the seam is a degenerate boundary case the
  // half-cell-offset sample grid never produces.
  ["Antarctica 179.5E", -78, 179.5, true],
  ["Caspian (hole)", 41.5, 50.5, false],
];
for (const [name, lat, lon, want] of probes) {
  const got = isLand(rings, lon, lat);
  console.log(`${got === want ? "ok " : "BAD"} ${name}: land=${got}`);
}

const buf = new Int16Array(points.length * 2);
points.forEach(([lat, lon], i) => {
  buf[i * 2] = Math.round(lat * 10);
  buf[i * 2 + 1] = Math.round(lon * 10);
});
const b64 = Buffer.from(buf.buffer).toString("base64");

const ts = `/**
 * Land-dot sampling of the world for the ASCII globe. GENERATED FILE:
 * regenerate with \`node scripts/make-landmask.mjs\` (Natural Earth 110m land,
 * public domain). ${points.length} points, packed as base64 Int16 pairs of
 * (lat x10, lon x10), latitude-banded so density is even on the sphere.
 */
const PACKED =
  "${b64.replace(/(.{100})/g, '$1" +\n  "')}";

export const LAND_POINT_COUNT = ${points.length};

let cache: Float32Array | null = null;

/** Decodes to a flat Float32Array of [lat0, lon0, lat1, lon1, ...] degrees. */
export function getLandPoints(): Float32Array {
  if (cache) return cache;
  const raw = atob(PACKED);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const packed = new Int16Array(bytes.buffer);
  const out = new Float32Array(packed.length);
  for (let i = 0; i < packed.length; i++) out[i] = packed[i] / 10;
  cache = out;
  return out;
}
`;

const { writeFile } = await import("node:fs/promises");
await writeFile(OUT, ts);
console.log(`wrote ${OUT.pathname}`);
