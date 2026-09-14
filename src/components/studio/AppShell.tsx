"use client";
/** App shell: slim header + left nav + main region. Single-screen studio. */
import { useEffect, useState } from "react";
import { useStudio } from "@/lib/store";
import { WorklistView } from "./WorklistView";
import { ReportingView } from "./ReportingView";
import { LibraryView } from "./LibraryView";
import { SettingsView } from "./SettingsView";
import { UsgStudioView } from "./usg/UsgStudioView";
import { CommandPalette } from "./CommandPalette";
import { FatigueTimer } from "./FatigueTimer";
import { Stethoscope, ListChecks, BookLock, Settings2, LogOut, RefreshCw, Waves, Command, Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { patientAccent, readLoopEnabled, setReadLoopEnabled } from "@/lib/workspace-enhance";
import type { View } from "@/lib/store";

const NAV: { id: View; label: string; icon: typeof ListChecks; tint: string }[] = [
  { id: "worklist", label: "Worklist", icon: ListChecks, tint: "text-violet-600 bg-violet-50 ring-violet-200" },
  { id: "usg", label: "USG Studio", icon: Waves, tint: "text-rose-700 bg-rose-50 ring-rose-200" },
  { id: "library", label: "Library", icon: BookLock, tint: "text-teal-700 bg-teal-50 ring-teal-200" },
  { id: "settings", label: "Settings", icon: Settings2, tint: "text-amber-700 bg-amber-50 ring-amber-200" },
];

const SHORTCUTS: [string, string][] = [
  ["Ctrl + K", "Command palette — patients, views, actions"],
  ["Alt + ↓ / Alt + J", "Next patient (while reporting)"],
  ["Alt + ↑ / Alt + K", "Previous patient (while reporting)"],
  ["Ctrl + P", "Preview & print the open report"],
  ["Ctrl + Enter", "Finalize & bill the open report"],
  ["Ctrl + S", "Save the draft now"],
  [":trigger + Tab", "Expand a snippet macro in any text box"],
  ["?", "Show / hide this cheat sheet"],
];

export function AppShell() {
  const { view, setView, activeOrderId, orders, syncedAt, careOk, orthancOk, syncing, lastError } = useStudio();
  const router = useRouter();
  const [showKeys, setShowKeys] = useState(false);

  const toReport = orders.filter((o) => (o.status === "TO_REPORT" || o.status === "REPORTING") && !o.ignored).length;

  // Active patient accent (wrong-patient guard — the identity band follows the case)
  const active = orders.find((o) => o.id === activeOrderId);
  const accent = active ? patientAccent(active.patientName, active.patientMrn) : null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Studio locked");
    router.refresh();
    window.location.reload();
  };

  // Global shortcuts: "?" cheat sheet. Print/finalize/sync are event-driven
  // so the palette and hotkeys share one path.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setShowKeys((v) => !v);
      }
    };
    const onLoopToggle = () => {
      const next = !readLoopEnabled();
      setReadLoopEnabled(next);
      window.dispatchEvent(new CustomEvent("care-studio:read-loop-changed", { detail: next }));
      toast.success(next ? "Read loop ON — auto-advances to the next patient after finalize" : "Read loop OFF");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("care-studio:toggle-read-loop", onLoopToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("care-studio:toggle-read-loop", onLoopToggle);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header — gradient identity strip */}
      <header className="relative flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" aria-hidden />
        {/* Per-patient identity band — same case always paints the same colour */}
        {accent && view === "reporting" ? (
          <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: accent.band }} aria-hidden />
        ) : null}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ background: "linear-gradient(135deg,#7c3aed 0%,#d946ef 55%,#06b6d4 130%)" }}
          >
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold tracking-tight">CARE Reporting Studio</div>
            <div className="text-[10px] text-faint">Single-radiologist workspace</div>
          </div>
        </div>

        {/* Patient chip while reporting */}
        {active && view === "reporting" ? (
          <div
            className="ml-2 hidden items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:flex"
            style={{ background: accent?.soft, color: accent?.text, borderColor: accent?.dot }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent?.dot }} />
            <span className="max-w-[180px] truncate">{active.patientName}</span>
            <span className="font-mono text-[10px] opacity-70">{active.accessionNumber}</span>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
            className="hidden h-8 items-center gap-2 rounded-md border border-border bg-panel px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:flex"
            title="Command palette"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="font-semibold">Ctrl K</span>
          </button>
          <button
            onClick={() => setShowKeys(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin text-primary")} />
            {syncedAt
              ? `Synced ${new Date(syncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Not synced yet"}
            <span className={cn("h-1.5 w-1.5 rounded-full", careOk ? "bg-ok" : "bg-faint")} title="CARE ERP" />
            <span className={cn("h-1.5 w-1.5 rounded-full", orthancOk ? "bg-ok" : "bg-faint")} title="Orthanc" />
          </div>
          <button
            onClick={logout}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Lock
          </button>
        </div>
      </header>
      {lastError && !lastError.includes("Demo mode") ? (
        <div className="shrink-0 bg-warn-bg px-4 py-1.5 text-[11px] font-medium text-warn ring-1 ring-warn-line">
          {lastError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Left nav */}
        <nav className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-panel py-3 md:w-44 md:items-stretch md:px-2.5">
          {NAV.map((n) => {
            const activeNav = view === n.id || (n.id === "worklist" && view === "reporting");
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "relative flex h-10 items-center justify-center gap-2.5 rounded-lg text-[13px] font-medium transition-all md:justify-start md:px-3",
                  activeNav
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-md md:h-7 md:w-7", activeNav ? `ring-1 ${n.tint}` : "")}>
                  <n.icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="hidden md:inline">{n.label}</span>
                {n.id === "worklist" && toReport > 0 ? (
                  <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-1 text-[9px] font-bold text-white shadow md:static md:ml-auto">
                    {toReport}
                  </span>
                ) : null}
                {activeNav ? <span className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-r bg-gradient-to-b from-violet-600 to-fuchsia-500 md:block" /> : null}
              </button>
            );
          })}
          {view === "reporting" && activeOrderId ? (
            <button
              onClick={() => setView("worklist")}
              className="mt-auto flex h-9 items-center justify-center gap-2 rounded-lg text-[12px] text-faint transition-colors hover:text-foreground md:justify-start md:px-3"
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Back to list</span>
            </button>
          ) : null}
        </nav>

        {/* Main */}
        <main className="studio-scroll min-h-0 flex-1 overflow-y-auto">
          {view === "worklist" && <WorklistView />}
          {view === "reporting" && activeOrderId && <ReportingView key={activeOrderId} />}
          {view === "usg" && <UsgStudioView />}
          {view === "library" && <LibraryView />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Command palette + fatigue reminder */}
      <CommandPalette
        onPrint={() => window.dispatchEvent(new CustomEvent("care-studio:cmd-print"))}
        onFinalize={() => window.dispatchEvent(new CustomEvent("care-studio:cmd-finalize"))}
      />
      <FatigueTimer />

      {/* Shortcuts cheat sheet */}
      {showKeys ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]" onClick={() => setShowKeys(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                <span className="text-[14px] font-bold">Keyboard shortcuts</span>
              </div>
              <button onClick={() => setShowKeys(false)} className="flex h-6 w-6 items-center justify-center rounded text-faint hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent">
                  <kbd className="min-w-[110px] rounded-md border border-border bg-panel px-2 py-1 text-center text-[11px] font-bold text-muted-foreground">{k}</kbd>
                  <span className="text-[12.5px]">{d}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-md bg-accent px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
              Snippet macros: type <b>:fu6</b> then <b>Tab</b> in any text box to expand “Follow-up ultrasound after 6 weeks is advised.”.
              Manage snippets in Settings → Productivity.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
