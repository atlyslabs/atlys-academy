"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { isSpeechSupported, speak, stopSpeaking } from "@/lib/speech";

// Speech support never changes within a session, so subscribing is a no-op;
// useSyncExternalStore is just the hydration-safe way to read it (server says
// no, the client corrects itself after mounting).
const subscribeNever = () => () => {};

/**
 * Ghost pill that reads `text` aloud through the browser's own voices, or
 * stops it if it is already talking. Renders nothing where speech synthesis
 * does not exist, so callers can place it unconditionally.
 */
export function SpeakButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const supported = useSyncExternalStore(
    subscribeNever,
    isSpeechSupported,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  // Stop on unmount, but only if *this* button started the speech - a blanket
  // cancel here would cut off a sibling button mid-sentence.
  useEffect(
    () => () => {
      if (speakingRef.current) stopSpeaking();
    },
    [],
  );

  function setIsSpeaking(value: boolean) {
    speakingRef.current = value;
    setSpeaking(value);
  }

  function toggle() {
    if (speakingRef.current) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    // `speak` cancels whatever else was playing; that cancellation fires the
    // old utterance's end/error, which resets any sibling button's state.
    speak(text, { onEnd: () => setIsSpeaking(false) });
    setIsSpeaking(true);
  }

  if (!supported) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-pressed={speaking}
      className={className}
    >
      {speaking ? "⏹ Stop" : "🔊 Read aloud"}
    </Button>
  );
}
