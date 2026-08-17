/**
 * Tiny wrapper over the browser's SpeechSynthesis API. Free, built-in voices -
 * no paid TTS, no network round-trip. Every entry point is SSR-safe, so this
 * module can be imported anywhere without a `typeof window` dance at the
 * call site.
 */

export interface SpeakOptions {
  /** Slightly under 1 by default - the stock voices rush at full speed. */
  rate?: number;
  /** Fires on `end` and on `error` - Chrome reports interruption as an error. */
  onEnd?: () => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesListenerAttached = false;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Chrome populates the voice list lazily: the first `getVoices()` often
 * returns `[]` and the real list only arrives with `voiceschanged`. Cache
 * whatever we get and refresh on that event, so a later `speak()` picks a
 * proper voice instead of the engine default.
 */
function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];

  if (!voicesListenerAttached) {
    voicesListenerAttached = true;
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      cachedVoices = window.speechSynthesis.getVoices();
    });
  }

  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

/**
 * The local voices sound robotic; the ones browsers label Google / Natural /
 * Neural / Online are noticeably less so. Prefer those, fall back to any
 * English voice, and let the engine default stand if there are none.
 */
function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  const english = getVoices().filter((voice) =>
    voice.lang.toLowerCase().startsWith("en"),
  );
  return (
    english.find((voice) => /google|natural|neural|online/i.test(voice.name)) ??
    english[0]
  );
}

/** Speak `text`, cancelling anything already queued or playing. */
export function speak(
  text: string,
  opts: SpeakOptions = {},
): SpeechSynthesisUtterance | null {
  if (!isSpeechSupported()) return null;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickEnglishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 0.98;

  if (opts.onEnd) {
    utterance.addEventListener("end", opts.onEnd);
    utterance.addEventListener("error", opts.onEnd);
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}
