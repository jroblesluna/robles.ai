import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictation for a text field, backed by the browser's own speech recognition
 * (Web Speech API). We never touch the audio ourselves: Chrome and Edge stream
 * it to the vendor's speech service, Safari uses its own recognizer. Firefox
 * ships no implementation, so `supported` is false there and callers are
 * expected to hide the button rather than show one that does nothing.
 */

/** The spec is not in lib.dom, and the vendor shapes differ, so this stays loose. */
type Recognition = any;

function recognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

/**
 * Starting and stopping are not instant: the recognizer takes a moment to open
 * the mic, and `stop()` keeps the session alive until it has transcribed the
 * last words. Both waits get their own state so the UI can show them rather
 * than appear stuck.
 */
export type SpeechState = "idle" | "starting" | "listening" | "stopping" | "denied" | "error";

const TRANSIENT: SpeechState[] = ["starting", "listening", "stopping"];

export function useSpeechInput({ lang, onResult }: { lang: string; onResult: (text: string) => void }) {
  const [supported] = useState(() => Boolean(recognitionCtor()));
  const [state, setState] = useState<SpeechState>("idle");
  /** Words the recognizer has heard but not committed yet, for a live preview. */
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  // Held in a ref so a re-render never leaves the live session calling a stale handler.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    // `onend` lands a beat later, once the tail of the audio is transcribed.
    setState((prev) => (prev === "starting" || prev === "listening" ? "stopping" : prev));
    recognitionRef.current.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec: Recognition = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onResultRef.current(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    // Fires once the service is actually listening — not when start() returns.
    rec.onstart = () => setState((prev) => (prev === "starting" ? "listening" : prev));
    rec.onerror = (event: any) => {
      // A pause in speech and our own stop() both surface as errors; neither is one.
      if (event.error === "no-speech" || event.error === "aborted") return;
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setState(denied ? "denied" : "error");
    };
    rec.onend = () => {
      recognitionRef.current = null;
      setInterim("");
      // A failure already set its own state and must survive the end event.
      setState((prev) => (TRANSIENT.includes(prev) ? "idle" : prev));
    };

    recognitionRef.current = rec;
    setState("starting");
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      setState("error");
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  // Abort on unmount, so the browser's recording indicator never outlives the page.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return {
    supported,
    state,
    listening: state === "listening",
    /** Mid-transition: the button should spin and ignore clicks. */
    busy: state === "starting" || state === "stopping",
    interim,
    toggle,
    stop,
  };
}
