import { useEffect, useRef, useState } from "react";

/**
 * Counts down from durationSec. Calls onExpire once when it hits 0.
 * Resets automatically whenever `resetKey` changes.
 *
 * onExpire is kept in a ref instead of a dependency of the countdown
 * effect. Every call site passes a fresh inline function (e.g.
 * `onExpire={() => goNext()}`), so its identity changes on every render
 * of the parent - including on every keystroke in a sibling input. If the
 * countdown effect depended on `onExpire` directly, that identity churn
 * would re-run the effect and re-arm the 1-second setTimeout from scratch
 * before it ever fired, which is why the countdown used to visibly freeze
 * while typing. Worse, when a section swapped in a NEW Timer configuration
 * on the same render that onExpire's identity changed (e.g. Passage Recall
 * flipping from the "reading" timer to the "writing" timer), the effect
 * could re-fire once more using the previous, stale `secondsLeft` value -
 * which is what caused the writing phase to sometimes get skipped
 * entirely. Reading onExpire from a ref (always current, never a
 * dependency) avoids both.
 */
export default function Timer({ durationSec, onExpire, resetKey }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSec);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setSecondsLeft(durationSec);
    expiredRef.current = false;
  }, [durationSec, resetKey]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const isLow = secondsLeft <= 10;

  return (
    <div className={`timer ${isLow ? "timer-low" : ""}`}>
      ⏱ {mm}:{ss}
    </div>
  );
}
