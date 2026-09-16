"use client";
import { useState } from "react";
import VoiceButton from "@/components/VoiceButton";
import ImageReaderPanel from "@/components/studio/ImageReaderPanel";
import SafetyStrip from "@/components/studio/SafetyStrip";
import ShortcutRibbon from "@/components/studio/ShortcutRibbon";

function section(text: string, head: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex(l => l.replace(/[*_]/g, "").toUpperCase().includes(head));
  if (start < 0) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const u = lines[i].replace(/[*_]/g, "").trim();
    if (/^(TECHNIQUE|FINDINGS|IMPRESSION|CONCLUSION|RECOMMENDATION|CLINICAL INDICATION)/.test(u)) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

export default function AIAssistPanel({ studyId, modality, bodyPart, clinicalInfo, currentFindings, mrn, accession, patientName, onInsertTechnique, onSetImpression, onAppendImpression }: {
  studyId?: string; modality?: string; bodyPart?: string; clinicalInfo?: string; currentFindings?: string;
  mrn?: string; accession?: string; patientName?: string;
  onInsertTechnique?: (t: string) => void; onSetImpression?: (t: string) => void; onAppendImpression?: (t: string) => void;
}) {
  const [buffer, setBuffer] = useState("");
  const [accepted, setAccepted] = useState<string[]>([]);
  const [ai, setAi] = useState<{ report: string; provider: string; model: string; fallback: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prior, setPrior] = useState<{ accessionNumber: string; studyDate?: string | null; testName?: string | null; impression?: string | null } | null>(null);
  const [priorBusy, setPriorBusy] = useState(false);

  const liveText = [currentFindings, buffer, ...accepted, ai?.report].filter(Boolean).join("\n");

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/ai-draft", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modality: modality || bodyPart || "MRI", indication: clinicalInfo || "", rawFindings: liveText, measurements: "" }) });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setAi(d);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const loadPrior = async () => {
    setPriorBusy(true);
    try {
      const r = await fetch(`/api/prior-report?mrn=${encodeURIComponent(mrn || "")}&name=${encodeURIComponent(patientName || "")}&exclude=${encodeURIComponent(accession || "")}`).then(x => x.json());
      setPrior(r.prior || null);
    } catch { setPrior(null); } finally { setPriorBusy(false); }
  };

  const putTechnique = () => { const t = section(ai?.report || "", "TECHNIQUE"); if (!t) { alert("No TECHNIQUE section in the draft"); return; } onInsertTechnique?.(t); };
  const putImpression = () => { const t = section(ai?.report || "", "IMPRESSION"); if (!t) { alert("No IMPRESSION section in the draft"); return; } onSetImpression?.(t); };
  const compLine = (stable: boolean) => {
    if (!prior) return;
    const d = prior.studyDate ? new Date(String(prior.studyDate)).toLocaleDateString("en-IN") : "the previous study";
    onAppendImpression?.(stable
      ? `COMPARISON: ${prior.testName || "Previous study"} dated ${d}. No significant interval change.`
      : `COMPARISON: ${prior.testName || "Previous study"} dated ${d}. `);
  };

  return (
    <div className="flex flex-col gap-3 p-3 border rounded bg-white">
      <ShortcutRibbon />
      <SafetyStrip text={liveText} modality={modality} onAddFollowUp={(line) => setBuffer(b => (b ? b + "\n" + line : line))} />
      <h3 className="font-bold text-sm">AI Assist — Voice + Image Reader + Composer</h3>
      <VoiceButton onTranscript={(t, _c) => setBuffer(b => (b ? b + " " + t : t))} />
      <textarea value={buffer} onChange={e => setBuffer(e.target.value)} className="w-full h-24 p-2 border rounded text-xs" placeholder="Dictated / typed findings land here..." />
      <ImageReaderPanel studyId={studyId} modality={modality} bodyPart={bodyPart} clinicalInfo={clinicalInfo} radiologistFindings={currentFindings || ""} onAccept={l => setAccepted(a => [...a, l])} />
      {accepted.length > 0 && <div className="border rounded p-2 bg-green-50 text-xs"><b>Accepted image observations:</b><ul className="list-disc ml-4">{accepted.map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
      <button onClick={generate} disabled={busy} className="bg-blue-600 text-white py-2 rounded font-bold text-sm disabled:bg-gray-300">{busy ? "Composing…" : "Generate AI Draft (local GPU → cloud fallback)"}</button>
      {err && <div className="bg-red-50 border border-red-300 rounded px-2 py-1 text-red-800 text-xs">{err}</div>}
      {ai && (
        <div className="flex flex-col gap-1.5">
          <div className={`rounded px-2 py-1 text-[10px] font-bold ${ai.fallback ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}`}>
            {ai.fallback ? "⚠ FALLBACK DRAFT" : "✓ AI READY"} — {ai.provider} · {ai.model}
          </div>
          <pre className="whitespace-pre-wrap bg-gray-50 border rounded p-2 text-xs max-h-72 overflow-auto">{ai.report}</pre>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => navigator.clipboard.writeText(ai.report)} className="bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-bold">Copy full report</button>
            <button onClick={putTechnique} className="bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-bold">→ Technique</button>
            <button onClick={putImpression} className="bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-bold">→ Impression</button>
            <button onClick={loadPrior} disabled={priorBusy} className="bg-teal-600 text-white px-2 py-1 rounded text-[10px] font-bold disabled:bg-gray-300">{priorBusy ? "…" : "Prior study"}</button>
            {prior && <button onClick={() => compLine(false)} className="bg-purple-600 text-white px-2 py-1 rounded text-[10px] font-bold">+ COMPARISON line</button>}
            {prior && <button onClick={() => compLine(true)} className="bg-purple-800 text-white px-2 py-1 rounded text-[10px] font-bold">+ "no interval change"</button>}
          </div>
          {prior && (
            <div className="text-[10px] bg-teal-50 border border-teal-300 rounded px-2 py-1 text-teal-900">
              Prior: {prior.testName} · {prior.studyDate ? new Date(String(prior.studyDate)).toLocaleDateString("en-IN") : ""} {prior.impression ? `— ${prior.impression.slice(0, 140)}…` : "(no saved report text)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
