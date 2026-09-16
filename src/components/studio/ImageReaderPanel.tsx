"use client";
import { useState, useRef, useCallback } from "react";
interface Img { id: string; base64: string; label: string }
export default function ImageReaderPanel({ studyId, modality, bodyPart, clinicalInfo, radiologistFindings, onAccept }:
  { studyId?: string; modality?: string; bodyPart?: string; clinicalInfo?: string; radiologistFindings: string; onAccept: (line: string, prov: string) => void }) {
  const [images, setImages] = useState<Img[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [picker, setPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = (b64: string, label: string) => setImages(p => p.length >= 6 ? p : [...p, { id: `${Date.now()}-${label}`, base64: b64, label }]);
  const loadSeries = async () => { if (!studyId) return; setBusy("loading"); setError(null);
    try { const r = await fetch(`/api/orthanc-render?study=${studyId}`); const d = await r.json(); if (!d.success) throw new Error(d.error); setSeries(d.series); setPicker(true); }
    catch (e: any) { setError(e.message); } finally { setBusy(null); } };
  const addSlice = async (id: string, label: string) => { setBusy("render"); try { const r = await fetch(`/api/orthanc-render?instance=${id}`); const d = await r.json(); if (!d.success) throw new Error(d.error); add(d.base64, label); } catch (e: any) { setError(e.message); } finally { setBusy(null); } };
  const ingest = (f: File, label?: string) => { const rd = new FileReader(); rd.onload = () => add(String(rd.result).replace(/^data:image\/[a-z]+;base64,/, ""), label || f.name); rd.readAsDataURL(f); };
  const onPaste = useCallback((e: React.ClipboardEvent) => { const it = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/")); const f = it?.getAsFile(); if (f) { e.preventDefault(); ingest(f, "Pasted"); } }, []);
  const analyse = async () => { setBusy("reading"); setError(null); setResult(null); setAccepted(new Set());
    try { const r = await fetch("/api/vision-analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: images.map(i => ({ base64: i.base64, label: i.label })), modality, bodyPart, clinicalInfo }) });
      const d = await r.json(); if (!d.success) throw new Error(d.error); setResult(d);
      if (radiologistFindings.trim().length > 20) { const c = await fetch("/api/vision-conflicts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ observations: d.observations, radiologistFindings }) }).then(x => x.json()).catch(() => ({ conflicts: [] })); setConflicts(c.conflicts || []); } }
    catch (e: any) { setError(e.message); } finally { setBusy(null); } };
  return (
    <div onPaste={onPaste} className="flex flex-col gap-2 text-xs">
      <div className="bg-amber-50 border border-amber-300 rounded px-2 py-1 text-amber-900">AI IMAGE READER — UNVERIFIED. Selected slices only. Never auto-merged. Your findings override.</div>
      <div className="flex gap-1.5">
        <button onClick={loadSeries} disabled={!!busy || !studyId} className="px-2 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300">From DICOM</button>
        <button onClick={() => fileRef.current?.click()} disabled={!!busy} className="px-2 py-1 bg-slate-600 text-white rounded disabled:bg-gray-300">Upload</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => Array.from(e.target.files || []).forEach(f => ingest(f))} />
      </div>
      {images.length > 0 && <div className="flex flex-wrap gap-1">{images.map((im, i) => <img key={im.id} src={`data:image/png;base64,${im.base64}`} alt={im.label} className="w-14 h-14 object-cover border rounded bg-black" onClick={() => setImages(p => p.filter((_, j) => j !== i))} />)}</div>}
      <button onClick={analyse} disabled={!!busy || !images.length} className="px-2 py-1.5 bg-purple-700 text-white rounded font-bold disabled:bg-gray-300">{busy || (images.length ? `Read ${images.length} image(s)` : "Add images")}</button>
      {error && <div className="bg-red-50 border border-red-300 rounded px-2 py-1 text-red-800">{error}</div>}
      {conflicts.length > 0 && <div className="bg-red-50 border-l-4 border-red-600 rounded px-2 py-1 text-red-900"><b>CONFLICT — review required.</b> Your dictation preserved.</div>}
      {result && <div className="border rounded divide-y bg-white">
        {result.observations.map((line: string, i: number) => (
          <div key={i} className="px-2 py-1.5 flex gap-2 items-start">
            <button onClick={() => { setAccepted(p => new Set(p).add(i)); onAccept(`[image-reader] ${line}`, result.provenance); }} disabled={accepted.has(i)}
              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${accepted.has(i) ? "bg-green-100 text-green-800" : "bg-green-600 text-white"}`}>{accepted.has(i) ? "Accepted" : "Accept"}</button>
            <span>{line}</span>
          </div>))}
      </div>}
      {picker && <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPicker(false)}>
        <div className="bg-white rounded-lg max-w-xl w-full max-h-[70vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
          {series.map((s: any) => <div key={s.id} className="mb-3"><div className="font-semibold text-xs mb-1">{s.description}</div>
            <div className="flex flex-wrap gap-1">{s.instances.slice(0, 40).map((iid: string, idx: number) => <button key={iid} onClick={() => addSlice(iid, `${s.description} #${idx + 1}`)} className="w-7 h-7 border rounded text-[10px] hover:bg-blue-50">{idx + 1}</button>)}</div></div>)}
        </div></div>}
    </div>
  );
}
