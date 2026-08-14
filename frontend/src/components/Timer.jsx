import { useEffect, useRef, useState } from "react";

/**
 * Counts down from durationSec. Calls onExpire once when it hits 0.
 * Resets automatically whenever `resetKey` changes.
 */
export default function Timer({ durationSec, onExpire, resetKey }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSec);
  const expiredRef = useRef(false);

  useEffect(() => {
    setSecondsLeft(durationSec);
    expiredRef.current = false;
  }, [durationSec, resetKey]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onExpire]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const isLow = secondsLeft <= 10;

  return (
    <div className={`timer ${isLow ? "timer-low" : ""}`}>
      ⏱ {mm}:{ss}
    </div>
  );
}
