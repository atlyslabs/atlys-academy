"use client";

import { useEffect, useRef } from "react";
import type { DayId } from "@/content/onboarding/types";
import { JOURNEY_LEGS } from "@/content/onboarding/journey";
import { getLandPoints } from "./landmask";

/**
 * The stage's main character: the world drawn in ASCII, telling the journey.
 *
 * The camera tours the five-leg route (SYD to DEL): it eases to a stop,
 * dwells while the caption reads, then swings on to the next. Each stop is
 * framed east of centre so the airport clears the edition card floating over
 * the middle of the stage. Hovering a chapter row overrides the tour with
 * that day's stop (`focusDay`); `onStoryDay` reports whichever stop the
 * camera is committed to, so the caption and the index stay in step.
 *
 * Every landmass dot is a glyph whose character and colour come from its
 * depth, so the sphere shades itself. The cursor excites nearby glyphs: they
 * brighten through the brand-blue ramp and get pushed gently away, springing
 * back as the excitement decays.
 *
 * Pure canvas, no deps. A glyph atlas is pre-rendered so the frame loop is
 * drawImage calls, not fillText. Under reduced motion it renders one static
 * frame with Sydney framed (the story's first stop) and mounts no listeners;
 * the loop also parks when the tab is hidden or the canvas leaves the
 * viewport.
 */

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/** Glyph ramp, dim to bright, one colour per step so the atlas is two rows. */
const RAMP = [".", ":", "-", "=", "+", "*", "#", "%", "@"] as const;
const GREYS = [
  "#33383c",
  "#3e4448",
  "#4a5055",
  "#585f64",
  "#6b7278",
  "#848b92",
  "#a4aab0",
  "#cbcfd3",
  "#f1f2f4",
];
const BRAND = [
  "#383db0",
  "#454bd0",
  "#5057ea",
  "#6167ec",
  "#7379ee",
  "#8489f0",
  "#969af2",
  "#c0c2f8",
  "#ffffff",
];

const ROUTE_PERIOD = 11; // seconds for the light to fly the whole route
const ARC_SAMPLES = 64; // per leg
const ARC_LIFT = 0.07; // how high the flight path bows above the surface

/** How long the camera rests at a stop before touring on, in seconds. */
const DWELL = 7;
/**
 * The camera is a critically damped spring, not an exponential snap: its
 * velocity carries through a retarget, so flipping between two stops mid-
 * swing reverses direction as a curve rather than a kink. Stiffness sets the
 * settle time (~1.1s); damping at 2*sqrt(k) means it never oscillates.
 */
const SWING_K = 13;
const SWING_C = 2 * Math.sqrt(SWING_K);
/**
 * Stops are framed this far east of dead centre, so the focused airport
 * surfaces beside the edition card instead of behind it.
 */
const VIEW_OFFSET = 55 * DEG;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function toVec(latDeg: number, lonDeg: number): Vec3 {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return {
    x: Math.cos(lat) * Math.sin(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.cos(lon),
  };
}

/** Spherical interpolation between two unit vectors. */
function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const ka = Math.sin((1 - t) * omega) / s;
  const kb = Math.sin(t * omega) / s;
  return {
    x: ka * a.x + kb * b.x,
    y: ka * a.y + kb * b.y,
    z: ka * a.z + kb * b.z,
  };
}

/** Signed shortest way round the circle from 0 to `a`. */
function shortestAngle(a: number): number {
  return ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}

export function AsciiGlobe({
  className,
  focusDay = null,
  onStoryDay,
}: {
  className?: string;
  /** Pin the camera on one day's stop (a hovered chapter row). */
  focusDay?: DayId | null;
  /** Fires when the camera commits to a stop, hover or tour alike. */
  onStoryDay?: (day: DayId) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Props are read through refs inside the frame loop, so prop changes never
  // tear down and rebuild the whole scene.
  const focusRef = useRef<DayId | null>(focusDay);
  const storyRef = useRef(onStoryDay);
  useEffect(() => {
    focusRef.current = focusDay;
  }, [focusDay]);
  useEffect(() => {
    storyRef.current = onStoryDay;
  }, [onStoryDay]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // ---- static geometry -------------------------------------------------
    // Antarctica is dropped: at this tilt it reads as a detached smudge on
    // the bottom rim, and dotted globes conventionally omit it.
    const pts = getLandPoints();
    const keep: number[] = [];
    for (let i = 0; i < pts.length / 2; i++) {
      if (pts[i * 2] > -60) keep.push(i);
    }
    const n = keep.length;
    const cosLat = new Float32Array(n);
    const sinLat = new Float32Array(n);
    const lonArr = new Float32Array(n);
    const phase = new Float32Array(n);
    const excite = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const i = keep[k];
      const lat = pts[i * 2] * DEG;
      cosLat[k] = Math.cos(lat);
      sinLat[k] = Math.sin(lat);
      lonArr[k] = pts[i * 2 + 1] * DEG;
      const h = Math.sin(i * 127.1) * 43758.5453;
      phase[k] = (h - Math.floor(h)) * TAU;
    }

    // Route: great-circle samples between consecutive legs, bowed upward.
    const legVecs = JOURNEY_LEGS.map((leg) => toVec(leg.lat, leg.lon));
    const arcCount = (legVecs.length - 1) * ARC_SAMPLES;
    const arcCosLat = new Float32Array(arcCount);
    const arcSinLat = new Float32Array(arcCount);
    const arcLon = new Float32Array(arcCount);
    const arcLift = new Float32Array(arcCount);
    for (let leg = 0; leg < legVecs.length - 1; leg++) {
      for (let s = 0; s < ARC_SAMPLES; s++) {
        const t = s / (ARC_SAMPLES - 1);
        const v = slerp(legVecs[leg], legVecs[leg + 1], t);
        const i = leg * ARC_SAMPLES + s;
        const lat = Math.asin(Math.min(1, Math.max(-1, v.y)));
        arcCosLat[i] = Math.cos(lat);
        arcSinLat[i] = v.y;
        arcLon[i] = Math.atan2(v.x, v.z);
        arcLift[i] = 1 + ARC_LIFT * Math.sin(Math.PI * t);
      }
    }
    const airports = JOURNEY_LEGS.map((leg) => ({
      code: leg.code,
      dayId: leg.dayId,
      cosLat: Math.cos(leg.lat * DEG),
      sinLat: Math.sin(leg.lat * DEG),
      lon: leg.lon * DEG,
    }));

    /** Camera longitude that frames stop `i` east of the card. */
    const stopRot = (i: number) => -airports[i].lon + VIEW_OFFSET;

    // ---- view state --------------------------------------------------------
    const TILT = -14 * DEG;
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);
    let size = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let radius = 0;
    let cell = 0;
    let cellDev = 0;
    let hoverR = 0;
    let atlas: HTMLCanvasElement | null = null;

    // The story starts framed on Sydney - no opening swing.
    let tourIdx = 0;
    let dwellLeft = DWELL;
    let rot = stopRot(0);
    let rotVel = 0;
    let focusIdx = 0;
    let told: DayId | null = null;
    // Pointer state lives in client coordinates and is converted to canvas
    // space fresh each frame: the parallax plate is still easing when the
    // event fires, so a rect captured at event time goes stale a frame later
    // and the excite field wobbles against it.
    let clientX = -1e6;
    let clientY = -1e6;
    let pointerCalm = false;
    let px = -1e6;
    let py = -1e6;
    let lastNow = 0;

    const tell = (idx: number) => {
      const day = airports[idx].dayId;
      if (told === day) return;
      told = day;
      storyRef.current?.(day);
    };

    const sans = getComputedStyle(document.body).fontFamily;
    const mono = "SFMono-Regular, Menlo, Consolas, monospace";

    function buildAtlas() {
      atlas = document.createElement("canvas");
      atlas.width = cellDev * RAMP.length;
      atlas.height = cellDev * 2;
      const a = atlas.getContext("2d");
      if (!a) return;
      a.textAlign = "center";
      a.textBaseline = "middle";
      a.font = `${Math.round((cell - 4) * dpr)}px ${mono}`;
      for (let k = 0; k < RAMP.length; k++) {
        a.fillStyle = GREYS[k];
        a.fillText(RAMP[k], k * cellDev + cellDev / 2, cellDev / 2);
        a.fillStyle = BRAND[k];
        a.fillText(RAMP[k], k * cellDev + cellDev / 2, cellDev + cellDev / 2);
      }
    }

    // Scratch output of project(); reused to avoid per-point allocation.
    const P = { x: 0, y: 0, z: 0 };
    function project(cLat: number, sLat: number, lon: number, lift: number) {
      const a = lon + rot;
      const x0 = cLat * Math.sin(a);
      const z0 = cLat * Math.cos(a);
      P.x = cx + x0 * radius * lift;
      const y = sLat * cosT - z0 * sinT;
      P.z = sLat * sinT + z0 * cosT;
      P.y = cy - y * radius * lift;
    }

    function draw(t: number) {
      if (!atlas) return;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, size, size);

      // Land glyphs.
      const half = cell / 2;
      for (let i = 0; i < n; i++) {
        project(cosLat[i], sinLat[i], lonArr[i], 1);
        if (P.z <= 0) {
          excite[i] *= 0.9;
          continue;
        }
        let sx = P.x;
        let sy = P.y;

        let e = excite[i];
        if (!reduced && !coarse) {
          const dx = sx - px;
          const dy = sy - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < hoverR * hoverR) {
            const d = Math.sqrt(d2) || 1;
            const t01 = d / hoverR;
            // Ease toward the target rather than snapping to it, and shape
            // the displacement as a bulge - zero under the cursor, zero at
            // the rim, peak between. A glyph straight under the pointer has
            // no stable push direction, so it must not be pushed at all;
            // both together are what keep the hover calm instead of shaky.
            e += (1 - t01 - e) * 0.22;
            const bulge = 4 * t01 * (1 - t01);
            const push = e * bulge * cell * 0.75;
            sx += (dx / d) * push;
            sy += (dy / d) * push;
          }
          excite[i] = e * 0.93;
        }

        // A flat-ish ramp on purpose: with the full range, isolated
        // landmasses at the sphere's centre (Madagascar, notably) hit the
        // @ end of the ramp and read as a glitch. Only the cursor gets to
        // push glyphs into the bright end.
        const twinkle = reduced ? 0 : 0.06 * Math.sin(t * 0.9 + phase[i]);
        let b = 0.2 + P.z * 0.42 + twinkle + e * 0.95;
        if (b < 0) b = 0;
        if (b > 1) b = 1;
        const k = Math.min(RAMP.length - 1, Math.floor(b * RAMP.length));
        const row = e > 0.3 ? 1 : 0;
        ctx!.drawImage(
          atlas,
          k * cellDev,
          row * cellDev,
          cellDev,
          cellDev,
          sx - half,
          sy - half,
          cell,
          cell,
        );
      }

      // Route arcs: quiet brand dots, brighter as they face the camera.
      for (let i = 0; i < arcCount; i++) {
        project(arcCosLat[i], arcSinLat[i], arcLon[i], arcLift[i]);
        if (P.z <= -0.04) continue;
        const a = 0.16 + Math.max(0, P.z) * (reduced ? 0.7 : 0.45);
        ctx!.fillStyle = `rgba(115, 121, 238, ${a.toFixed(3)})`;
        ctx!.fillRect(P.x - 0.8, P.y - 0.8, 1.6, 1.6);
      }

      // The travelling light: a bright head with a fading tail.
      if (!reduced) {
        const head = ((t % ROUTE_PERIOD) / ROUTE_PERIOD) * arcCount;
        const TAIL = 26;
        for (let k = TAIL; k >= 0; k--) {
          const idx = Math.floor(head) - k;
          if (idx < 0 || idx >= arcCount) continue;
          project(arcCosLat[idx], arcSinLat[idx], arcLon[idx], arcLift[idx]);
          if (P.z <= 0) continue;
          const fade = 1 - k / TAIL;
          if (k === 0) {
            ctx!.save();
            ctx!.shadowColor = "#969af2";
            ctx!.shadowBlur = 10;
            ctx!.fillStyle = "#ffffff";
            ctx!.beginPath();
            ctx!.arc(P.x, P.y, 2.4, 0, TAU);
            ctx!.fill();
            ctx!.restore();
          } else {
            ctx!.fillStyle = `rgba(150, 154, 242, ${(fade * 0.8).toFixed(3)})`;
            const s = 1 + fade * 1.4;
            ctx!.fillRect(P.x - s / 2, P.y - s / 2, s, s);
          }
        }
      }

      // Airports: a marker, a slow pulse ring, and the IATA code. The stop
      // the camera is committed to speaks up: brighter ring, larger label.
      for (let i = 0; i < airports.length; i++) {
        const ap = airports[i];
        const focused = i === focusIdx;
        project(ap.cosLat, ap.sinLat, ap.lon, 1.012);
        if (P.z <= 0.1) continue;
        const pulse = reduced ? 0.4 : (t * 0.55 + i * 0.37) % 1;
        const ringA = (1 - pulse) * (focused ? 0.85 : 0.4);
        ctx!.strokeStyle = `rgba(150, 154, 242, ${ringA.toFixed(3)})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(P.x, P.y, 3 + pulse * (focused ? 12 : 9), 0, TAU);
        ctx!.stroke();
        if (focused) {
          ctx!.save();
          ctx!.shadowColor = "#969af2";
          ctx!.shadowBlur = 9;
          ctx!.fillStyle = "#ffffff";
          ctx!.beginPath();
          ctx!.arc(P.x, P.y, 2.4, 0, TAU);
          ctx!.fill();
          ctx!.restore();
        } else {
          ctx!.fillStyle = "#ffffff";
          ctx!.beginPath();
          ctx!.arc(P.x, P.y, 2.1, 0, TAU);
          ctx!.fill();
        }
        // Labels stay out of the middle of the stage unless the camera is
        // on them: the edition card sits there, and a code glowing through
        // the glass behind the wordmark reads as clutter, not depth. On a
        // small stage (phones) the card covers the whole globe, so codes
        // are texture at best - skip them entirely.
        if (size < 500) continue;
        const clearOfCard =
          Math.abs(P.x - cx) > radius * 0.72 ||
          Math.abs(P.y - cy) > radius * 0.78;
        if (P.z > (focused ? 0.12 : 0.24) && (focused || clearOfCard)) {
          const base = Math.max(9, Math.round(size / 64));
          const px2 = focused ? Math.round(base * 1.3) : base;
          ctx!.font = `600 ${px2}px ${sans}`;
          ctx!.textAlign = "left";
          ctx!.textBaseline = "alphabetic";
          ctx!.fillStyle = focused
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(150, 154, 242, 0.75)";
          ctx!.fillText(ap.code, P.x + 8, P.y - 7);
        }
      }
    }

    function resize() {
      const w = wrap!.clientWidth;
      if (!w) return;
      size = w;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(size * dpr);
      canvas!.height = Math.round(size * dpr);
      canvas!.style.width = `${size}px`;
      canvas!.style.height = `${size}px`;
      cx = size / 2;
      cy = size / 2;
      radius = size * 0.42;
      cell = Math.max(11, Math.round(size / 54));
      cellDev = Math.ceil(cell * dpr);
      hoverR = size * 0.17;
      buildAtlas();
      if (reduced) draw(0);
    }

    // ---- loop and listeners ----------------------------------------------
    let raf = 0;
    let running = false;
    let inView = true;

    const frame = (now: number) => {
      const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0;
      lastNow = now;

      // The tour. A hovered chapter pins the camera and resets the clock, so
      // the story lingers where the reader is looking and resumes from there.
      const focus = focusRef.current;
      if (focus != null) {
        tourIdx = focus - 1;
        dwellLeft = DWELL;
      }
      focusIdx = tourIdx;
      tell(tourIdx);

      const delta = shortestAngle(stopRot(tourIdx) - rot);
      rotVel += (SWING_K * delta - SWING_C * rotVel) * dt;
      rot += rotVel * dt;
      // Arrived means settled: close to the stop AND no longer gliding.
      if (
        focus == null &&
        Math.abs(delta) < 0.02 &&
        Math.abs(rotVel) < 0.05
      ) {
        dwellLeft -= dt;
        if (dwellLeft <= 0) {
          tourIdx = (tourIdx + 1) % airports.length;
          dwellLeft = DWELL;
        }
      }

      // Convert the pointer to canvas space against the plate's position
      // *this frame*, not the one at event time.
      if (pointerCalm || clientX === -1e6) {
        px = -1e6;
        py = -1e6;
      } else {
        const rect = canvas!.getBoundingClientRect();
        px = ((clientX - rect.left) / rect.width) * size;
        py = ((clientY - rect.top) / rect.height) * size;
      }

      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    };

    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (next) {
        lastNow = 0;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    const onVisibility = () =>
      setRunning(!document.hidden && inView && !reduced);

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      onVisibility();
    });
    io.observe(canvas);

    const onMove = (event: PointerEvent) => {
      // Anywhere inside a [data-globe-calm] surface (the edition card), the
      // globe goes still: the reader is navigating, not playing.
      const target = event.target;
      pointerCalm =
        target instanceof Element &&
        target.closest("[data-globe-calm]") !== null;
      clientX = event.clientX;
      clientY = event.clientY;
    };
    const onLeave = (event: PointerEvent) => {
      // pointerout bubbles on every element boundary crossed; only a null
      // relatedTarget means the pointer actually left the window. Without
      // this guard, sweeping across the card's rows strobes the field.
      if (event.relatedTarget) return;
      clientX = -1e6;
      clientY = -1e6;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    if (!reduced) {
      document.addEventListener("visibilitychange", onVisibility);
      if (!coarse) {
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerout", onLeave, { passive: true });
      }
      setRunning(true);
    }

    return () => {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
    };
    // Scene setup is intentionally mount-once; live prop reads go through
    // focusRef/storyRef above.
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
