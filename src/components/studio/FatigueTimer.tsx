"use client";
/**
 * Fatigue timer — 20-20-20 rule from the big workspace design:
 * every 20 minutes of reading, look ~20 feet away for 20 seconds.
 * Soft, dismissible — never blocks the radiologist.
 */
import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";

const TWENTY_MIN = 20 * 60 * 1000;

export function FatigueTimer() {
  const [show, setShow] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setN((v) => v + 1);
      setShow(true);
    }, TWENTY_MIN);
    return () => clearInterval(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-72 rounded-xl border border-border bg-card p-3.5 shadow-2xl">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Eye className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold">20-20-20 break</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {n > 1 ? `${n} reading cycles done. ` : ""}Look at something ~20 feet away for 20 seconds — your eyes will thank you.
          </p>
        </div>
        <button
          onClick={() => setShow(false)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-foreground"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
