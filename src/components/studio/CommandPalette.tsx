"use client";
/**
 * Command palette (Ctrl+K) — ported from the big workspace design.
 * Fuzzy-searchable: patients, views, and studio actions.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStudio, type View } from "@/lib/store";
import type { Order } from "@/lib/store";
import { patientAccent } from "@/lib/workspace-enhance";
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown, ListChecks, Waves, BookLock, Settings2,
  RefreshCw, LogOut, Printer, Stamp, Zap, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  group: "Go to" | "Patients" | "Actions";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  accent?: React.ReactNode;
  run: () => void;
};

function score(query: string, text: string): number {
  // Simple subsequence match — every query char must appear in order.
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let ti = 0;
  let hits = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return 0;
    ti = idx + 1;
    hits++;
  }
  return hits / q.length === 1 ? 1 : 0;
}

export function CommandPalette({ onPrint, onFinalize }: { onPrint?: () => void; onFinalize?: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { orders, setView, openReporting, setSyncing } = useStudio();

  // Global open/close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) { setQ(""); setSel(0); }
          return !v;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const views: { id: View; label: string; icon: React.ReactNode }[] = [
      { id: "worklist", label: "Worklist", icon: <ListChecks className="h-3.5 w-3.5" /> },
      { id: "usg", label: "USG Studio", icon: <Waves className="h-3.5 w-3.5" /> },
      { id: "library", label: "Library", icon: <BookLock className="h-3.5 w-3.5" /> },
      { id: "settings", label: "Settings", icon: <Settings2 className="h-3.5 w-3.5" /> },
    ];
    const out: Item[] = views.map((v) => ({
      id: `view-${v.id}`, group: "Go to", label: v.label, icon: v.icon,
      hint: "view", run: () => setView(v.id),
    }));

    const candidates: Order[] = orders
      .filter((o) => !o.ignored && (o.status === "TO_REPORT" || o.status === "REPORTING"))
      .slice(0, 12);
    for (const o of candidates) {
      out.push({
        id: `pt-${o.id}`, group: "Patients", label: o.patientName,
        hint: `${o.accessionNumber} · ${o.testName ?? o.modality}`,
        icon: (
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ background: patientAccent(o.patientName, o.patientMrn).dot }}
          />
        ),
        run: () => openReporting(o.id),
      });
    }

    out.push({
      id: "act-sync", group: "Actions", label: "Sync worklist now", icon: <RefreshCw className="h-3.5 w-3.5" />,
      hint: "CARE + Orthanc", run: async () => {
        setSyncing(true);
        const r = await fetch("/api/worklist/sync", { method: "POST" }).then((x) => x.json()).catch(() => null);
        setSyncing(false);
        if (r?.ok) window.dispatchEvent(new CustomEvent("care-studio:resync-worklist"));
      },
    });
    if (onPrint) out.push({ id: "act-print", group: "Actions", label: "Preview & print report", icon: <Printer className="h-3.5 w-3.5" />, hint: "Ctrl+P", run: onPrint });
    if (onFinalize) out.push({ id: "act-finalize", group: "Actions", label: "Finalize & bill", icon: <Stamp className="h-3.5 w-3.5" />, hint: "Ctrl+Enter", run: onFinalize });
    out.push({
      id: "act-loop", group: "Actions", label: "Toggle read loop (auto-advance)", icon: <Zap className="h-3.5 w-3.5" />,
      hint: "zero-click next patient", run: () => {
        const el = window.dispatchEvent(new CustomEvent("care-studio:toggle-read-loop"));
        return el;
      },
    });
    out.push({
      id: "act-lock", group: "Actions", label: "Lock the studio", icon: <LogOut className="h-3.5 w-3.5" />, run: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.reload();
      },
    });
    return out;
  }, [orders, setView, openReporting, setSyncing, onPrint, onFinalize]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    return items
      .map((it) => ({ it, s: Math.max(score(q, it.label), score(q, it.hint ?? "") * 0.8) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.it)
      .slice(0, 14);
  }, [items, q]);

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open || typeof document === "undefined") return null;

  const grouped: { group: string; items: Item[] }[] = [];
  for (const it of filtered) {
    let g = grouped.find((x) => x.group === it.group);
    if (!g) { g = { group: it.group, items: [] }; grouped.push(g); }
    g.items.push(it);
  }
  let idx = -1;

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[sel];
      if (it) { setOpen(false); it.run(); }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search className="h-4 w-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search patients, views, actions…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-faint">esc</kbd>
        </div>
        <div ref={listRef} className="studio-scroll max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-faint">Nothing matches “{q}”.</p>
          ) : (
            grouped.map((g) => (
              <div key={g.group} className="mb-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{g.group}</div>
                {g.items.map((it) => {
                  idx++;
                  const i = idx;
                  return (
                    <button
                      key={it.id}
                      data-idx={i}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => { setOpen(false); it.run(); }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                        i === sel ? "bg-accent text-accent-foreground" : "text-foreground",
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">{it.icon}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                      {it.hint ? <span className="shrink-0 text-[11px] text-faint">{it.hint}</span> : null}
                      {i === sel ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-transparent" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-border bg-panel px-3.5 py-2 text-[10.5px] text-faint">
          <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> run</span>
          <span className="ml-auto">CARE Reporting Studio</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
