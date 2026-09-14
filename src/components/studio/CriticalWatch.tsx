"use client";
/**
 * Critical-finding interrupt — ported from the big workspace design.
 * Watches the open report; when critical language appears, an interrupt
 * banner demands acknowledgement and tracks the communication SLA clock.
 */
import { useEffect, useMemo, useState } from "react";
import {
  scanCritical, readCriticalAck, writeCriticalAck, formatElapsed, type CriticalHit, type CriticalAck,
} from "@/lib/workspace-enhance";
import { Siren, PhoneCall, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SLA_TARGET_MS = 30 * 60 * 1000; // communicate within 30 minutes

export function CriticalWatch({
  reportId,
  findings,
  impression,
  recommendation,
  onChanged,
}: {
  reportId: string;
  findings: { id: string; text: string }[];
  impression: string;
  recommendation: string;
  onChanged?: (communicated: boolean, hits: number) => void;
}) {
  const hits = useMemo<CriticalHit[]>(
    () => scanCritical({ findings, impression, recommendation }),
    [findings, impression, recommendation],
  );
  // Stable signature of the current hit set — identity-safe for effect deps.
  const hitKey = useMemo(() => hits.map((h) => h.phrase).sort().join(","), [hits]);
  const [ack, setAck] = useState<CriticalAck | null>(null);
  const [now, setNow] = useState(Date.now());
  const [dismissed, setDismissed] = useState(false);

  // Load / detect — runs only when the hit set or report actually changes.
  useEffect(() => {
    setDismissed(false);
    if (hitKey === "") {
      setAck(readCriticalAck(reportId));
      return;
    }
    const existing = readCriticalAck(reportId);
    if (existing && existing.hits.sort().join(",") === hitKey) {
      setAck(existing);
    } else {
      // Keep the original detection time when critical language persists.
      const fresh: CriticalAck = {
        hits: hitKey.split(","),
        detectedAt: existing?.detectedAt ?? Date.now(),
        acknowledgedAt: null,
        communicatedAt: null,
      };
      writeCriticalAck(reportId, fresh);
      setAck(fresh);
    }
  }, [reportId, hitKey]);

  // SLA clock
  useEffect(() => {
    if (!ack?.detectedAt || ack.communicatedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ack?.detectedAt, ack?.communicatedAt]);

  // Notify parent about gate state
  useEffect(() => {
    onChanged?.(!!ack?.communicatedAt, hits.length);
  }, [ack?.communicatedAt, hits.length, onChanged]);

  if (hits.length === 0 || dismissed) return null;

  const elapsed = ack?.communicatedAt
    ? ack.communicatedAt - (ack.detectedAt ?? ack.communicatedAt)
    : now - (ack?.detectedAt ?? now);
  const overSla = !ack?.communicatedAt && elapsed > SLA_TARGET_MS;

  const mark = (communicated: boolean) => {
    const next: CriticalAck = {
      hits: hits.map((h) => h.phrase),
      detectedAt: ack?.detectedAt ?? Date.now(),
      acknowledgedAt: ack?.acknowledgedAt ?? Date.now(),
      communicatedAt: communicated ? Date.now() : null,
    };
    writeCriticalAck(reportId, next);
    setAck(next);
    if (communicated) setDismissed(true);
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-3.5 shadow-lg",
      ack?.communicatedAt ? "border-ok-line bg-ok-bg" : "border-bad/50 bg-bad-bg",
    )}>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-orange-400" aria-hidden />
      <div className="flex items-start gap-3">
        <span className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
          ack?.communicatedAt ? "bg-ok" : "animate-pulse bg-bad",
        )}>
          {ack?.communicatedAt ? <Check className="h-4 w-4" /> : <Siren className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-foreground">
              {ack?.communicatedAt ? "Critical result communicated" : "Critical finding language detected"}
            </span>
            {!ack?.communicatedAt ? (
              <span className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums",
                overSla ? "animate-pulse bg-red-600 text-white" : "bg-red-100 text-red-700",
              )} title="Time since the critical language was first detected">
                ⏱ {formatElapsed(elapsed)} / 30:00
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {ack?.communicatedAt
              ? "Documented as communicated — this report passes the quality gate."
              : "Results matching: "}
            {!ack?.communicatedAt ? (
              <b className="text-foreground">{hits.map((h) => h.phrase).join(", ")}</b>
            ) : null}
            {!ack?.communicatedAt ? ". Call the referring doctor now, then mark it communicated — this is tracked before finalize." : null}
          </p>
          {!ack?.communicatedAt ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => mark(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-bad px-3 text-[12px] font-bold text-white shadow transition-transform active:scale-[0.97]"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Called & communicated
              </button>
              <button
                onClick={() => mark(false)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-semibold text-muted-foreground"
              >
                Acknowledge only
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-faint hover:text-foreground"
                title="Hide the banner (communication is still tracked)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
