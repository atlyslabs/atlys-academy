/**
 * Interface clicks, synthesised. No audio asset and no dependency - an
 * oscillator plus a gain envelope is a few lines of code where an mp3 would be
 * a network request, a decode, and a file to keep in the repo.
 *
 * Two constraints shape the module. Browsers refuse to start an AudioContext
 * outside a user gesture, so the context is built lazily inside `playClick`,
 * which only ever runs from an event handler - constructing it at import time
 * would yield a permanently suspended context. And the preference **defaults to
 * off**: audio nobody asked for is hostile, so every entry point is a no-op
 * until the joinee flips the toggle themselves.
 *
 * Nothing here throws. Where Web Audio is missing or blocked, calls silently do
 * nothing, so no caller needs a `try`.
 */

export type ClickKind = "tap" | "stamp";

const STORAGE_KEY = "atlys-onboarding.sound";

interface ClickSpec {
  type: OscillatorType;
  /** Start and end of the pitch sweep, in Hz. The fall is what stops it ringing. */
  from: number;
  to: number;
  /** Seconds. Long enough to register, short enough not to become a beep. */
  duration: number;
  /** Peak gain. Deliberately quiet: this plays over whatever else is running. */
  peak: number;
  /** Layer a noise burst under the tone - the rubber-on-paper part of a stamp. */
  noise: boolean;
}

const CLICKS: Record<ClickKind, ClickSpec> = {
  // High and instant: the interface acknowledging a press, nothing more.
  tap: {
    type: "triangle",
    from: 1200,
    to: 900,
    duration: 0.04,
    peak: 0.08,
    noise: false,
  },
  // Low and square, so it lands as a thud rather than a note.
  stamp: {
    type: "square",
    from: 180,
    to: 90,
    duration: 0.09,
    peak: 0.12,
    noise: true,
  },
};

/**
 * Undefined until first read. `false` is a real stored answer, so it cannot
 * double as the "not yet loaded" sentinel.
 */
let enabled: boolean | undefined;
let context: AudioContext | null = null;

const listeners = new Set<() => void>();

type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  // Safari shipped only the prefixed constructor until 14.1, and iOS Home
  // Screen webviews lag further behind still. Intersecting with `typeof window`
  // rather than `Window` keeps the unprefixed global's own declaration in scope.
  const scope = window as typeof window & {
    webkitAudioContext?: AudioContextCtor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function isSoundSupported(): boolean {
  return audioContextCtor() !== null;
}

export function isSoundEnabled(): boolean {
  if (enabled !== undefined) return enabled;
  // Never cache a server answer: module state outlives a request there, and the
  // real preference lives in a store the server cannot see.
  if (typeof window === "undefined") return false;

  try {
    // Only the explicit opt-in string enables sound; anything else is off.
    enabled = window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    // Storage disabled (private browsing) - stay silent for the session.
    enabled = false;
  }
  return enabled;
}

/**
 * Watch the preference. The store exists so the toggle can read through
 * `useSyncExternalStore` instead of copying the value into component state in an
 * effect: that keeps every mounted toggle in agreement, and keeps the read out
 * of render, where `localStorage` does not exist on the server.
 */
export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      // Quota or private browsing: the choice holds for this session only.
    }
  }

  for (const listener of listeners) listener();
}

function getContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;

  try {
    context ??= new Ctor();
  } catch {
    return null;
  }

  // A context can also be suspended by the browser after a spell of silence,
  // and a suspended context plays nothing at all.
  if (context.state === "suspended") {
    void context.resume().catch(() => {});
  }
  return context;
}

/**
 * ~30ms of lowpassed white noise, written into a one-shot buffer. This is the
 * scrape of the stamp meeting paper; without it the low oscillator alone reads
 * as a bass note.
 */
function playNoise(ctx: AudioContext, at: number, duration: number): void {
  const frames = Math.max(
    1,
    Math.floor(ctx.sampleRate * Math.min(duration, 0.03)),
  );
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    // Faded across its length so it lands as an impact, not a hiss.
    channel[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, at);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05, at);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(at);
}

/** Play one click. Silent unless the joinee has switched sound on. */
export function playClick(kind: ClickKind = "tap"): void {
  if (!isSoundEnabled()) return;

  const ctx = getContext();
  if (!ctx) return;

  try {
    const spec = CLICKS[kind];
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    // Exponential ramps reject a target of 0, hence the near-zero floor - and
    // an exponential tail is what removes the click-off at the end of the note.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(spec.peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.from, now);
    osc.frequency.exponentialRampToValueAtTime(spec.to, now + spec.duration);
    osc.connect(gain);
    osc.start(now);
    // Stopped a beat after the envelope closes; the node is discarded on end.
    osc.stop(now + spec.duration + 0.02);

    if (spec.noise) playNoise(ctx, now, spec.duration);
  } catch {
    // An exhausted or policy-blocked audio pipeline must never take the click
    // handler that called us down with it.
  }
}
