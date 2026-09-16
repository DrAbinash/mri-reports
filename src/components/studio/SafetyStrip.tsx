"use client";
import { useEffect, useMemo, useState } from "react";
import { detectCriticalFindings } from "@/lib/critical-findings";
import { validateReport } from "@/lib/report-validator";
import { parseMeasurements } from "@/lib/measurement-parser";
import { suggestFollowUp } from "@/lib/followup-suggester";

export default function SafetyStrip({ text, modality, onAddFollowUp }:
  { text: string; modality?: string; onAddFollowUp?: (line: string) => void }) {
  const [now, setNow] = useState(Date.now());
  const [criticalAt, setCriticalAt] = useState<number | null>(null);
  const [backup, setBackup] = useState<{ ok: boolean; last?: string } | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { fetch("/api/backup-status").then(r => r.json()).then(setBackup).catch(() => setBackup(null)); }, []);

  const criticals = useMemo(() => detectCriticalFindings(text), [text]);
  useEffect(() => {
    if (criticals.length && !criticalAt) setCriticalAt(Date.now());
    if (!criticals.length) setCriticalAt(null);
  }, [criticals.length, criticalAt]);

  const gate = useMemo(() => validateReport(text, modality || ""), [text, modality]);
  const meas = useMemo(() => parseMeasurements(text), [text]);
  const fu = useMemo(() => suggestFollowUp(text), [text]);

  const sla = criticalAt ? Math.max(0, 1800 - Math.floor((now - criticalAt) / 1000)) : null;
  const mm = sla !== null ? String(Math.floor(sla / 60)).padStart(2, "0") : "";
  const ss = sla !== null ? String(sla % 60).padStart(2, "0") : "";

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-semibold">
      {criticals.length > 0 && (
        <div className="shrink-0 whitespace-nowrap rounded border border-red-400 bg-red-50 px-2 py-1 text-red-800">
          🚨 CRITICAL: {criticals[0].message} · SLA {mm}:{ss}
        </div>
      )}
      <div className={`shrink-0 whitespace-nowrap rounded border px-2 py-1 ${
        gate.isValid ? (gate.warnings.length ? "border-amber-300 bg-amber-50 text-amber-800" : "border-green-300 bg-green-50 text-green-800")
                     : "border-red-400 bg-red-50 text-red-800"}`}>
        {gate.isValid ? `✓ Gate ${gate.warnings.length ? `· ${gate.warnings.length} warning(s)` : "ready"}` : `⛔ Gate: ${gate.errors.join(", ")}`}
      </div>
      {meas.length > 0 && (
        <div className="shrink-0 whitespace-nowrap rounded border border-blue-300 bg-blue-50 px-2 py-1 text-blue-800">
          📏 {meas.length} locked: {meas.slice(0, 3).map(m => `${m.level} ${m.value}${m.unit}`).join(" · ")}{meas.length > 3 ? " …" : ""}
        </div>
      )}
      {fu && (
        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-purple-300 bg-purple-50 px-2 py-1 text-purple-800">
          📅 {fu.label}
          {onAddFollowUp && <button onClick={() => onAddFollowUp(fu.line)} className="ml-1 rounded bg-purple-600 px-1.5 text-white">Add</button>}
        </div>
      )}
      <div className={`shrink-0 whitespace-nowrap rounded border px-2 py-1 ${backup?.ok ? "border-green-300 bg-green-50 text-green-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
        💾 Backup: {backup?.ok && backup.last ? backup.last : "not running"}
      </div>
    </div>
  );
}
