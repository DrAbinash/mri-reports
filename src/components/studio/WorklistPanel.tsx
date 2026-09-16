"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useStudio } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";

export function WorklistPanel() {
  const { orders, setOrders, openReporting } = useStudio();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"pending" | "all" | "orthanc">("pending");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const syncing = useRef(false);

  const sync = useCallback(async (showToast = true) => {
    if (syncing.current) return;
    syncing.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode });
      if (search) params.set("search", search);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      
      const res = await fetch(`/api/worklist/sync?${params}`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (showToast) toast.success(`Synced ${data.count || 0} studies from ${mode}`);
    } catch (e: any) {
      if (showToast) toast.error(`Sync failed: ${e.message}`);
    } finally {
      setLoading(false);
      syncing.current = false;
    }
  }, [mode, search, fromDate, toDate]);

  useEffect(() => {
    sync(false);
    const interval = setInterval(() => sync(false), 60000);
    return () => clearInterval(interval);
  }, [sync]);

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.patientName?.toLowerCase().includes(s) ||
      o.accessionNumber?.toLowerCase().includes(s) ||
      o.patientMrn?.toLowerCase().includes(s) ||
      o.testName?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Worklist</h2>
          <Button size="sm" onClick={() => sync(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing..." : "Sync"}
          </Button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-3">
          <Button size="sm" variant={mode === "pending" ? "default" : "outline"} onClick={() => setMode("pending")}>Pending</Button>
          <Button size="sm" variant={mode === "all" ? "default" : "outline"} onClick={() => setMode("all")}>All Studies</Button>
          <Button size="sm" variant={mode === "orthanc" ? "default" : "outline"} onClick={() => setMode("orthanc")}>From Orthanc</Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patient, accession, MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded text-sm"
          />
        </div>

        {/* Date filters */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" />
          </div>
        </div>

        {/* Quick date buttons */}
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => { const today = new Date().toISOString().split("T")[0]; setFromDate(today); setToDate(today); }}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => { const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]; setFromDate(yesterday); setToDate(yesterday); }}>Yesterday</Button>
          <Button size="sm" variant="outline" onClick={() => { const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]; const today = new Date().toISOString().split("T")[0]; setFromDate(weekAgo); setToDate(today); }}>Last Week</Button>
          <Button size="sm" variant="outline" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{loading ? "Loading..." : "No studies found"}</div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} onClick={() => openReporting(order.id)} className="p-4 border-b hover:bg-accent cursor-pointer transition-colors">
              <div className="flex items-start justify-between mb-1">
                <div className="font-semibold text-sm">{order.patientName}</div>
                <div className="text-xs text-muted-foreground">{order.accessionNumber}</div>
              </div>
              <div className="text-xs text-muted-foreground mb-1">{order.testName} • {order.modality}</div>
              {order.studyDate && <div className="text-xs text-muted-foreground">{new Date(order.studyDate).toLocaleDateString("en-IN")}</div>}
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t bg-panel text-xs text-muted-foreground text-center">{filteredOrders.length} of {orders.length} studies</div>
    </div>
  );
}
