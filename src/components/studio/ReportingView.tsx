"use client";
/**
 * Reporting screen — patient rail + findings editor + viewer panel.
 * Enhanced (ported from the big workspace design):
 *   • per-patient identity accent band
 *   • next / previous patient (Alt+↓/↑ or Alt+J/K) + Next-up strip + prefetch
 *   • critical-finding interrupt with SLA clock
 *   • pre-finalize quality gate checklist
 *   • zero-click read loop (auto-advance after finalize)
 *   • draft snapshots (crash recovery) — restore banner
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio, type Order } from "@/lib/store";
import { FindingsEditor, type Finding, type Phrase, type ReportCore, type FormatOption } from "./FindingsEditor";
import type { KeyImage } from "./KeyImages";
import { ViewerPanel } from "./ViewerPanel";
import { PrintOverlay } from "./PrintOverlay";
import { CriticalWatch } from "./CriticalWatch";
import { BillingBadge, ModalityChip, StatusChip, SectionLabel } from "./bits";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Printer, Save, Stamp, ArrowLeft, FileText, ChevronUp, ChevronDown, Zap, History, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { batchSort } from "@/lib/batch-sort";
import {
  patientAccent, qualityGate, readLoopEnabled, setReadLoopEnabled,
  saveDraftSnapshot, listDraftSnapshots, clearDraftSnapshots, prefetchReportBundle,
} from "@/lib/workspace-enhance";

type ReportBundle = {
  report: ReportCore & { finalizedAt: string | null };
  order: {
    id: string; accessionNumber: string; patientName: string; patientAge: string | null;
    patientGender: string | null; patientMrn: string | null; referringDoctor: string | null;
    testName: string | null; modality: string; bodyRegion: string; billingStatus: string | null;
    status: string; studyDate: string | null; studyInstanceUid: string | null;
  };
  findings: Finding[];
  phrases: Phrase[];
  images: KeyImage[];
};

/** Live editor progress — emitted by FindingsEditor for the quality gate / critical watch / snapshots. */
export type EditorProgress = {
  technique: string;
  impression: string;
  recommendation: string;
  opening: string;
  rows: Finding[];
};

export function ReportingView() {
  const { activeOrderId, orders, setView, openReporting } = useStudio();
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [studyName, setStudyName] = useState<string | null | undefined>(undefined);
  const [viewerUrls, setViewerUrls] = useState({ lan: "", tailscale: "" });
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<EditorProgress | null>(null);
  const [criticalCommunicated, setCriticalCommunicated] = useState(false);
  const [criticalHitsCount, setCriticalHitsCount] = useState(0);
  const [readLoop, setReadLoop] = useState(() => readLoopEnabled());
  const [recovery, setRecovery] = useState<{ impression: string; at: number } | null>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const order = bundle?.order;
  const accent = order ? patientAccent(order.patientName, order.patientMrn) : null;

  // Read-loop pref — remount-safe via key={activeOrderId}; sync when toggled elsewhere (palette).
  useEffect(() => {
    const onLoop = () => setReadLoop(readLoopEnabled());
    window.addEventListener("care-studio:read-loop-changed", onLoop);
    return () => window.removeEventListener("care-studio:read-loop-changed", onLoop);
  }, []);

  // Load bundle — the component is remounted per patient (key={activeOrderId}),
  // so local state starts clean on every switch.
  useEffect(() => {
    if (!activeOrderId) return;
    let alive = true;
    fetch(`/api/orders/${activeOrderId}/report`, { method: "POST" })
      .then((r) => r.json())
      .then((boot) => {
        if (!alive || boot.error) {
          if (boot.error) toast.error(boot.error);
          return;
        }
        return fetch(`/api/reports/${boot.reportId}`).then((res) => res.json());
      })
      .then((r) => {
        if (alive && r && !r.error) {
          setBundle(r);
          setStudyName(r.report.studyName ?? null);
          // Crash-recovery: server has no impression but a local snapshot does.
          const snaps = listDraftSnapshots(r.report.id);
          if ((!r.report.impression || r.report.impression.trim() === "") && snaps.length > 0 && snaps[0].impression.trim() !== "") {
            setRecovery({ impression: snaps[0].impression, at: snaps[0].at });
          }
          return fetch(`/api/formats?modality=${encodeURIComponent(r.order.modality)}&region=${encodeURIComponent(r.order.bodyRegion)}`)
            .then((res) => res.json())
            .then((f) => {
              if (alive && f.formats) setFormats(f.formats);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (alive && s.settings) setViewerUrls({ lan: s.settings.ohifLanUrl ?? "", tailscale: s.settings.ohifTailscaleUrl ?? "" });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeOrderId]);

  // To-report queue + neighbours (for next/prev + read loop + prefetch)
  const queue = useMemo(
    () => batchSort(orders.filter((o) => (o.status === "TO_REPORT" || o.status === "REPORTING") && !o.ignored && !o.accessionNumber.startsWith("ORTH-"))),
    [orders],
  );
  const qIndex = queue.findIndex((o) => o.id === activeOrderId);
  const nextOrder: Order | null = qIndex >= 0 && qIndex + 1 < queue.length ? queue[qIndex + 1] : null;
  const prevOrder: Order | null = qIndex > 0 ? queue[qIndex - 1] : null;

  // Prefetch the next study (like “preload next at 80%”, but simpler and always on)
  useEffect(() => {
    if (!bundle || !nextOrder) return;
    const t = setTimeout(() => { void prefetchReportBundle(nextOrder.id); }, 2500);
    return () => clearTimeout(t);
  }, [bundle, nextOrder]);

  const goPatient = useCallback(
    (dir: 1 | -1) => {
      const target = dir === 1 ? nextOrder : prevOrder;
      if (!target) {
        toast.info(dir === 1 ? "This is the last patient in the queue" : "This is the first patient in the queue");
        return;
      }
      // Flush any pending autosave before switching.
      window.dispatchEvent(new CustomEvent("care-studio:flush-save"));
      openReporting(target.id);
    },
    [nextOrder, prevOrder, openReporting],
  );

  const openPreview = useCallback(async () => {
    if (!bundle) return;
    const r = await fetch(`/api/reports/${bundle.report.id}/preview`).then((res) => res.json());
    if (r.html) setPrintHtml(r.html);
  }, [bundle]);

  const finalize = useCallback(async () => {
    if (!bundle) return;
    setConfirmFinalize(false);
    setBusy(true);
    window.dispatchEvent(new CustomEvent("care-studio:flush-save"));
    const r = await fetch(`/api/reports/${bundle.report.id}/finalize`, { method: "POST" }).then((res) => res.json());
    setBusy(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    clearDraftSnapshots(bundle.report.id);
    if (r.localOnly) {
      toast.warning(`Finalized locally — CARE finalize failed (${r.careError}). Will retry.`);
    } else if (r.careOk) {
      toast.success("Finalized & billed in CARE");
    } else if (r.alreadyFinalized) {
      toast.info("Already finalized");
    } else {
      toast.success("Finalized");
    }
    // Zero-click read loop: jump straight to the next patient.
    if (readLoop && nextOrder) {
      toast.success(`Read loop → ${nextOrder.patientName}`);
      openReporting(nextOrder.id);
    } else {
      setView("worklist");
    }
  }, [bundle, readLoop, nextOrder, openReporting, setView]);

  // Hotkeys: Alt+↓/↑ + Alt+J/K navigation, Ctrl+P print, Ctrl+Enter finalize.
  // The command palette fires the same events, so both paths share one handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.altKey && (e.key === "ArrowDown" || e.key.toLowerCase() === "j")) && !typing) {
        e.preventDefault();
        goPatient(1);
      }
      if ((e.altKey && (e.key === "ArrowUp" || e.key.toLowerCase() === "k")) && !typing) {
        e.preventDefault();
        goPatient(-1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p" && !typing) {
        e.preventDefault();
        void openPreview();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !typing) {
        e.preventDefault();
        if (bundle && bundle.report.status !== "FINALIZED") setConfirmFinalize(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("care-studio:flush-save"));
        toast.success("Draft saved");
      }
    };
    const onCmdPrint = () => void openPreview();
    const onCmdFinalize = () => { if (bundle && bundle.report.status !== "FINALIZED") setConfirmFinalize(true); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("care-studio:cmd-print", onCmdPrint);
    window.addEventListener("care-studio:cmd-finalize", onCmdFinalize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("care-studio:cmd-print", onCmdPrint);
      window.removeEventListener("care-studio:cmd-finalize", onCmdFinalize);
    };
  }, [goPatient, openPreview, bundle]);

  // Snapshot the live draft (debounced, crash-recovery safety net)
  useEffect(() => {
    if (!bundle || !progress) return;
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      saveDraftSnapshot({
        reportId: bundle.report.id,
        accession: bundle.order.accessionNumber,
        patientName: bundle.order.patientName,
        technique: progress.technique,
        impression: progress.impression,
        recommendation: progress.recommendation,
        opening: progress.opening,
        rows: progress.rows.map((r) => ({ text: r.text, concept: r.concept })),
        at: Date.now(),
      });
    }, 2500);
    return () => { if (snapTimer.current) clearTimeout(snapTimer.current); };
  }, [bundle, progress]);

  const restoreSnapshot = async () => {
    if (!bundle || !recovery) return;
    const r = await fetch(`/api/reports/${bundle.report.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ impression: recovery.impression }),
    }).then((res) => res.json()).catch(() => null);
    if (r && !r.error) {
      setBundle((b) => (b ? { ...b, report: { ...b.report, impression: recovery.impression } } : b));
      setRecovery(null);
      toast.success("Recovered the lost impression draft from a local snapshot");
    } else {
      toast.error("Could not restore the snapshot");
    }
  };

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <FileText className="h-4 w-4 animate-pulse" /> Opening report…
        </div>
      </div>
    );
  }

  const finalized = bundle.report.status === "FINALIZED";

  // Pre-finalize quality gate
  const gate = qualityGate({
    technique: progress?.technique ?? bundle.report.technique ?? "",
    opening: progress?.opening ?? bundle.report.findingsOpening ?? "",
    findingsCount: progress?.rows.length ?? bundle.findings.length,
    impression: progress?.impression ?? bundle.report.impression ?? "",
    recommendation: progress?.recommendation ?? bundle.report.recommendation ?? "",
    criticalHits: criticalHitsCount,
    criticalCommunicated,
  });

  return (
    <div className="flex h-full min-h-0">
      {/* Left rail */}
      <aside className="studio-scroll w-64 shrink-0 overflow-y-auto border-r border-border bg-panel p-4">
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent("care-studio:flush-save")); setView("worklist"); }}
          className="mb-4 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Worklist
        </button>

        {/* Identity card with the patient accent — the wrong-patient guard */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-sm" style={{ borderColor: accent?.dot }}>
          <div className="absolute inset-x-0 top-0 h-[4px]" style={{ background: accent?.band }} aria-hidden />
          <div className="flex items-center gap-2 pt-1">
            <ModalityChip modality={bundle.order.modality} />
            <StatusChip status={bundle.order.status} />
          </div>
          <h2 className="mt-2.5 text-[15px] font-bold leading-tight">{bundle.order.patientName}</h2>
          <p className="text-[11.5px] text-muted-foreground">
            {bundle.order.patientAge ?? "—"} · {bundle.order.patientGender ?? "—"}
            {bundle.order.patientMrn ? ` · ${bundle.order.patientMrn}` : ""}
          </p>
          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-[11.5px]">
            {[
              ["Accession", bundle.order.accessionNumber],
              ["Study", bundle.order.testName ?? "—"],
              ["Region", bundle.order.bodyRegion || "—"],
              ["Referred by", bundle.order.referringDoctor ?? "—"],
              ["Study date", bundle.order.studyDate ? new Date(bundle.order.studyDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-2">
                <span className="shrink-0 text-faint">{k}</span>
                <span className="truncate font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <BillingBadge status={bundle.order.billingStatus} />
          </div>
        </div>

        {/* Queue position */}
        <div className="mt-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionLabel>Queue position</SectionLabel>
            <span className="text-[11px] font-bold text-primary">{qIndex >= 0 ? `${qIndex + 1} / ${queue.length}` : "—"}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              size="sm" variant="outline" disabled={!prevOrder}
              className="h-7 flex-1 gap-1 border-border text-[11px]"
              onClick={() => goPatient(-1)}
              title="Previous patient (Alt+↑)"
            >
              <ChevronUp className="h-3 w-3" /> Prev
            </Button>
            <Button
              size="sm" variant="outline" disabled={!nextOrder}
              className="h-7 flex-1 gap-1 border-border text-[11px]"
              onClick={() => goPatient(1)}
              title="Next patient (Alt+↓)"
            >
              Next <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          {nextOrder ? (
            <button
              onClick={() => goPatient(1)}
              className="mt-2 flex w-full items-center gap-2 rounded-lg bg-accent px-2.5 py-2 text-left transition-colors hover:bg-accent/70"
              title="Prefetched in the background — opens instantly"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: patientAccent(nextOrder.patientName, nextOrder.patientMrn).dot }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-semibold">{nextOrder.patientName}</span>
                <span className="block truncate text-[10px] text-faint">{nextOrder.testName ?? nextOrder.modality}</span>
              </span>
              <ArrowUpRight className="h-3 w-3 shrink-0 text-faint" />
            </button>
          ) : (
            <p className="mt-2 rounded-lg bg-ok-bg px-2.5 py-2 text-[11px] font-medium text-ok">Last case in the queue 🎉</p>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <Button
            variant="outline"
            className="h-9 w-full justify-start gap-2 border-border bg-card text-[12.5px]"
            onClick={() => { window.dispatchEvent(new CustomEvent("care-studio:flush-save")); toast.success("Draft saved"); }}
          >
            <Save className="h-3.5 w-3.5" /> Draft saved (auto)
          </Button>
          <Button
            variant="outline"
            className="h-9 w-full justify-start gap-2 border-border bg-card text-[12.5px]"
            onClick={openPreview}
          >
            <Printer className="h-3.5 w-3.5" /> Preview & Print A4
          </Button>
          <Button
            className="h-9 w-full justify-start gap-2 text-[12.5px]"
            disabled={finalized || busy}
            onClick={() => setConfirmFinalize(true)}
          >
            <Stamp className="h-3.5 w-3.5" /> {finalized ? "Finalized" : busy ? "Finalizing…" : "Finalize & bill"}
          </Button>
          {/* Zero-click read loop */}
          <button
            onClick={() => { const v = !readLoop; setReadLoopEnabled(v); setReadLoop(v); }}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-colors",
              readLoop
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
            title="After finalize, jump straight to the next patient"
          >
            <Zap className={cn("h-3.5 w-3.5", readLoop && "fill-violet-500 text-violet-600")} />
            Read loop {readLoop ? "ON" : "OFF"}
          </button>
        </div>

        <p className="mt-3 rounded-md bg-accent px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground ring-1 ring-border">
          Tick <b>“Background graphics”</b> in the print dialog so the header band prints.
        </p>
      </aside>

      {/* Editor */}
      <div className="studio-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
          {/* Crash-recovery banner */}
          {recovery ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5">
              <History className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-amber-900">Local draft snapshot found</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-800">
                  This report has an empty impression on the server, but a local snapshot from{" "}
                  {new Date(recovery.at).toLocaleString("en-IN")} contains recovered text.
                </p>
                <p className="mt-1.5 rounded-lg bg-white/60 p-2 text-[11.5px] italic text-amber-900 line-clamp-3">{recovery.impression}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-7 bg-amber-600 hover:bg-amber-700 text-[11px]" onClick={restoreSnapshot}>Restore impression</Button>
                  <Button size="sm" variant="outline" className="h-7 border-amber-300 bg-white text-[11px] text-amber-800" onClick={() => setRecovery(null)}>Discard</Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Critical-finding interrupt */}
          <CriticalWatch
            reportId={bundle.report.id}
            findings={progress?.rows ?? bundle.findings}
            impression={progress?.impression ?? bundle.report.impression ?? ""}
            recommendation={progress?.recommendation ?? bundle.report.recommendation ?? ""}
            onChanged={(communicated, hits) => { setCriticalCommunicated(communicated); setCriticalHitsCount(hits); }}
          />

          <div className="mb-1">
            <SectionLabel>Report</SectionLabel>
            <h1 className="mt-1 text-lg font-bold tracking-tight" data-testid="report-title">
              {studyName || bundle.order.testName || bundle.order.bodyRegion}
              <span className="ml-2 font-mono text-[12px] font-medium text-faint">{bundle.order.accessionNumber}</span>
            </h1>
          </div>
          <FindingsEditor
            report={bundle.report}
            order={bundle.order}
            findings={bundle.findings}
            phrases={bundle.phrases}
            formats={formats}
            images={bundle.images ?? []}
            onMetaChange={(m) => {
              if (typeof m.studyName !== "undefined") setStudyName(m.studyName);
            }}
            onProgress={setProgress}
            onImagesChanged={() => {
              // Viewer capture landed — refresh the bundle so the strip updates.
              fetch(`/api/reports/${bundle.report.id}`)
                .then((res) => res.json())
                .then((r) => { if (r && !r.error) setBundle((b) => (b ? { ...b, images: r.images ?? [] } : b)); })
                .catch(() => {});
            }}
          />
        </div>
      </div>

      {/* Viewer */}
      <ViewerPanel
        lanUrl={viewerUrls.lan}
        tailscaleUrl={viewerUrls.tailscale}
        studyInstanceUid={bundle.order.studyInstanceUid}
        testName={bundle.order.testName}
        reportId={bundle.report.id}
        onImageCaptured={() => {
          fetch(`/api/reports/${bundle.report.id}`)
            .then((res) => res.json())
            .then((r) => { if (r && !r.error) setBundle((b) => (b ? { ...b, images: r.images ?? [] } : b)); })
            .catch(() => {});
        }}
      />

      {/* Print overlay */}
      {printHtml ? <PrintOverlay html={printHtml} onClose={() => setPrintHtml(null)} /> : null}

      {/* Finalize confirm — now with the quality gate checklist */}
      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Finalize this report?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px] leading-relaxed">
              The report is frozen as a PDF-style snapshot, marked Reported, and sent to CARE to create the billing row.
              Findings stay editable for reuse — but the printed report never changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 rounded-lg border border-border bg-panel p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Pre-finalize quality gate</span>
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                gate.score >= 85 ? "bg-ok-bg text-ok" : gate.score >= 60 ? "bg-warn-bg text-warn" : "bg-bad-bg text-bad",
              )}>
                {gate.score} / 100
              </span>
            </div>
            {gate.checks.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-[12px]">
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  c.ok ? "bg-ok-bg text-ok" : c.weight > 0 ? "bg-warn-bg text-warn" : "bg-muted text-faint")}>
                  {c.ok ? "✓" : "!"}
                </span>
                <span className={cn("leading-snug", c.ok ? "text-foreground" : "text-muted-foreground")}>
                  {c.label}
                  {!c.ok ? <span className="block text-[11px] text-faint">{c.hint}</span> : null}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[12px]">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="text-[12px] disabled:opacity-50"
              disabled={gate.blocking}
              onClick={finalize}
            >
              Finalize & bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
