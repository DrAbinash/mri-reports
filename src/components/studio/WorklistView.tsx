"use client";
/** Worklist — three buckets, billing badges, sync, search, manual match. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudio, type Order } from "@/lib/store";
import { BillingBadge, ModalityChip, StatusChip, SectionLabel } from "./bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, RefreshCw, ChevronRight, Hourglass, ImageOff, CheckCircle2, Link2, EyeOff, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { patientAccent } from "@/lib/workspace-enhance";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function modGroup(m: string): string { const u = (m || "").toUpperCase(); if (u.startsWith("MR")) return "MRI"; if (u.startsWith("CT")) return "CT"; if (u.includes("US") || u.includes("DOPPLER") || u.includes("ECHO")) return "USG"; if (u.startsWith("X") || u.includes("RAY")) return "X-Ray"; return u || "OTHER"; }
function OrderRow({ order, onClick, action }: { order: Order; onClick?: () => void; action?: React.ReactNode }) {
  const accent = patientAccent(order.patientName, order.patientMrn);
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-[0_2px_12px_-4px_rgba(46,109,164,0.25)]",
      )}
      onClick={onClick}
    >
      {/* Identity accent — same patient always paints the same colour */}
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-l" style={{ background: accent.band }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ModalityChip modality={order.modality} />
          <span className="truncate text-[13px] font-semibold">{order.patientName}</span>
          <span className="shrink-0 text-[11px] text-faint">{order.patientAge ?? ""}</span>
          <span className="hidden shrink-0 font-mono text-[10px] text-faint sm:inline">{order.accessionNumber}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{order.testName ?? "—"}</span>
          {order.referringDoctor ? <span className="hidden shrink-0 text-faint sm:inline">· {order.referringDoctor}</span> : null}
          {order.studyDate ? <span className="shrink-0 text-faint">· {timeAgo(order.studyDate)}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <BillingBadge status={order.billingStatus} />
        <StatusChip status={order.status} />
        {action}
        {onClick ? <ChevronRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5" /> : null}
      </div>
    </div>
  );
}

function Bucket({ icon, title, hint, tone, children }: {
  icon: React.ReactNode; title: string; hint?: string; tone: string; children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <SectionLabel>{title}</SectionLabel>
        {hint ? <span className="text-[10px] text-faint">{hint}</span> : null}
        <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold", tone)}>{/* count injected by children wrapper */}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function WorklistView() {
  const { orders, setWorklist, syncing, setSyncing, openReporting, search, setSearch } = useStudio();
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [modFilter, setModFilter] = useState<string>("MRI");
  const [matchOrder, setMatchOrder] = useState<Order | null>(null);
  const [matchValue, setMatchValue] = useState("");

  const load = useCallback(() => {
    fetch("/api/worklist")
      .then((r) => r.json())
      .then((r) => {
        if (r && !r.error) setWorklist(r);
      })
      .catch(() => {});
  }, [setWorklist]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000); // 5-minute background sync
    // The command palette fires this after its own sync.
    const resync = () => load();
    window.addEventListener("care-studio:resync-worklist", resync);
    return () => {
      clearInterval(t);
      window.removeEventListener("care-studio:resync-worklist", resync);
    };
  }, [load]);

  const sync = async () => {
    setSyncing(true);
    const r = await fetch("/api/worklist/sync", { method: "POST" }).then((r) => r.json()).catch(() => null);
    setSyncing(false);
    if (r?.ok) {
      if (r.lastError && !String(r.lastError).includes("Demo")) {
        toast.warning(r.lastError);
      } else if (r.careConfigured || r.orthancConfigured) {
        toast.success(`Synced · CARE ${r.careOk ? "✓" : "✗"} · Orthanc ${r.orthancOk ? "✓" : "✗"}`);
      } else {
        toast.info("Demo mode — configure CARE / Orthanc in Settings to sync live data");
      }
      await load();
    } else {
      toast.error("Sync failed"); setSyncing(false);
    }
  };

  const openReport = async (order: Order) => {
    const r = await fetch(`/api/orders/${order.id}/report`, { method: "POST" }).then((r) => r.json());
    if (r.error) {
      toast.error(r.error);
      return;
    }
    if (r.finalized) {
      toast.info("Already finalized — opening Library");
      useStudio.getState().setView("library");
      return;
    }
    openReporting(order.id);
  };

  const doMatch = async () => {
    if (!matchOrder) return;
    const r = await fetch("/api/worklist/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: matchOrder.id, accession: matchValue, uid: /^\d+(\.\d+)+$/.test(matchValue) ? matchValue : "" }),
    }).then((r) => r.json());
    if (r.ok) {
      toast.success("Study matched — moved to To Report");
      setMatchOrder(null);
      setMatchValue("");
      load();
    } else {
      toast.error(r.error ?? "Match failed");
    }
  };

  const ignore = async (order: Order) => {
    await fetch("/api/worklist/ignore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, ignore: !order.ignored }),
    });
    load();
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.patientName.toLowerCase().includes(q) ||
        o.accessionNumber.toLowerCase().includes(q) ||
        (o.testName ?? "").toLowerCase().includes(q),
    );
  }, [orders, search]);
  const dated = useMemo(() => shown.filter((o) => { const d = String((o as any).studyDate || (o as any).createdAt || ""); const day = d.slice(0, 10); if (!dateFrom && !dateTo) return true; if (!day) return false; if (dateFrom && day < dateFrom) return false; if (dateTo && day > dateTo) return false; return true; }), [shown, dateFrom, dateTo]);
  const filtered = useMemo(() => dated.filter((o) => modFilter === "ALL" || modGroup(String((o as any).modality || "")) === modFilter), [dated, modFilter]);

  // Drafts in progress (REPORTING) stay visible in "To report" — a case
  // must never vanish from the worklist just because it was opened.
  const toReport = filtered.filter(
    (o) => (o.status === "TO_REPORT" || o.status === "REPORTING") && !o.ignored && !o.accessionNumber.startsWith("ORTH-"),
  );
  const awaiting = filtered.filter((o) => o.status === "AWAITING_IMAGES" && !o.ignored);
  const unlinked = filtered.filter((o) => o.status === "TO_REPORT" && o.accessionNumber.startsWith("ORTH-") && !o.ignored);
  const reportedToday = filtered.filter(
    (o) => o.status === "REPORTED" && o.studyDate && Date.now() - new Date(o.studyDate).getTime() < 36 * 3600 * 1000,
  );
  const reportedPast = filtered.filter(
    (o) => o.status === "REPORTED" && !(o.studyDate && Date.now() - new Date(o.studyDate).getTime() < 36 * 3600 * 1000),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-7 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, accession, study…"
            className="h-10 border-border bg-card pl-9 text-[13px]"
          />
        </div>
        <Button
          onClick={sync}
          disabled={syncing}
          variant="outline"
          className="h-10 border-border bg-card text-[13px]"
        >
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><Button size="sm" variant="outline" onClick={() => { const t = new Date().toISOString().slice(0, 10); setDateFrom(t); setDateTo(t); }}>Today</Button><Button size="sm" variant="outline" onClick={() => { const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10); setDateFrom(y); setDateTo(y); }}>Yesterday</Button><Button size="sm" variant="outline" onClick={() => { setDateFrom(new Date(Date.now() - 604800000).toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); }}>Last 7d</Button><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 rounded-md border border-input bg-card px-2 text-xs" /><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 rounded-md border border-input bg-card px-2 text-xs" />{(dateFrom || dateTo) && <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">{["MRI", "CT", "USG", "X-Ray", "ALL"].map((g) => (<Button key={g} size="sm" variant={modFilter === g ? "default" : "outline"} onClick={() => setModFilter(g)}>{g}</Button>))}</div>
      </div>

      {/* To Report */}
      <Bucket
        icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
        title={`To report · ${toReport.length}`}
        tone="bg-[#e8f0f7] text-[#24567f]"
      >
        {toReport.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-3 py-6 text-center text-[12px] text-faint">
            Nothing waiting — the list is clear.
          </div>
        ) : (
          toReport.map((o) => <OrderRow key={o.id} order={o} onClick={() => openReport(o)} />)
        )}
      </Bucket>

      {/* Awaiting images */}
      <Bucket
        icon={<Hourglass className="h-4 w-4 text-warn" />}
        title={`Awaiting images · ${awaiting.length}`}
        hint="ordered in CARE, not yet in Orthanc"
        tone="bg-warn-bg text-warn"
      >
        {awaiting.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-3 py-4 text-center text-[12px] text-faint">
            No orders are waiting for images.
          </div>
        ) : (
          awaiting.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-warn-line bg-warn-bg px-2 text-[11px] font-semibold text-warn hover:bg-warn-bg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMatchOrder(o);
                  }}
                >
                  <ScanSearch className="mr-1 h-3 w-3" />
                  Match
                </Button>
              }
            />
          ))
        )}
      </Bucket>

      {/* Unlinked */}
      <Bucket
        icon={<ImageOff className="h-4 w-4 text-muted-foreground" />}
        title={`Unlinked Orthanc studies · ${unlinked.length}`}
        hint="in Orthanc, no CARE order"
        tone="bg-muted text-muted-foreground"
      >
        {unlinked.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-3 py-4 text-center text-[12px] text-faint">
            No unlinked studies.
          </div>
        ) : (
          unlinked.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              onClick={() => openReport(o)}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-faint hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    ignore(o);
                  }}
                >
                  <EyeOff className="mr-1 h-3 w-3" />
                  {o.ignored ? "Unignore" : "Ignore"}
                </Button>
              }
            />
          ))
        )}
      </Bucket>

      {/* Reported */}
      {reportedToday.length + reportedPast.length > 0 ? (
        <Bucket
          icon={<CheckCircle2 className="h-4 w-4 text-ok" />}
          title={`Reported · ${reportedToday.length + reportedPast.length}`}
          tone="bg-ok-bg text-ok"
        >
          {[...reportedToday, ...reportedPast].slice(0, 8).map((o) => (
            <OrderRow key={o.id} order={o} onClick={() => useStudio.getState().setView("library")} />
          ))}
        </Bucket>
      ) : null}

      {/* Match dialog */}
      <Dialog open={!!matchOrder} onOpenChange={(v) => !v && setMatchOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Link2 className="h-4 w-4 text-primary" />
              Match study to order
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              Paste the accession number or Study Instance UID of the Orthanc study that belongs to{" "}
              <b>{matchOrder?.patientName}</b> ({matchOrder?.accessionNumber}).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            placeholder="e.g. CARE-24085 or 1.2.840…"
            className="h-10 font-mono text-[12px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-[12px]" onClick={() => setMatchOrder(null)}>
              Cancel
            </Button>
            <Button className="text-[12px]" disabled={!matchValue.trim()} onClick={doMatch}>
              Match study
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
