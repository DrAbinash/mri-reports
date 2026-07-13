'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, type MriReport, type TemplateData } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import ReportViewer from './ReportViewer';
import ReportForm from './ReportForm';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-amber-100 text-amber-800 border-amber-200',
  Final: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Amended: 'bg-blue-100 text-blue-800 border-blue-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  Routine: 'bg-slate-100 text-slate-700',
  Urgent: 'bg-orange-100 text-orange-800',
  STAT: 'bg-red-100 text-red-800',
};

export default function ReportList() {
  const [reports, setReports] = useState<MriReport[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    selectedReportId,
    setSelectedReportId,
    editingReportId,
    setEditingReportId,
    searchQuery,
    setSearchQuery,
    filterRegion,
    setFilterRegion,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
  } = useAppStore();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (searchQuery) params.set('search', searchQuery);
      if (filterRegion) params.set('bodyRegion', filterRegion);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);

      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterRegion, filterStatus, filterPriority]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetch('/api/reports/templates')
      .then(r => r.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (selectedReportId === id) setSelectedReportId(null);
      fetchReports();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const selectedReport = reports.find(r => r.id === selectedReportId);

  // If editing, show form
  if (editingReportId) {
    return (
      <ReportForm
        editId={editingReportId}
        onComplete={() => {
          setEditingReportId(null);
          fetchReports();
        }}
        onCancel={() => setEditingReportId(null)}
        templates={templates}
      />
    );
  }

  // If viewing a report, show viewer
  if (selectedReport) {
    return (
      <ReportViewer
        report={selectedReport}
        onBack={() => setSelectedReportId(null)}
        onEdit={() => setEditingReportId(selectedReport.id)}
        onDelete={() => handleDelete(selectedReport.id)}
      />
    );
  }

  const activeFilterCount = [filterRegion, filterStatus, filterPriority].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MRI Reports</h2>
          <p className="text-muted-foreground mt-1">
            {loading ? 'Loading...' : `${reports.length} report${reports.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setEditingReportId('new')}>
          <FileText className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, ID, accession #, findings..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={activeFilterCount > 0 ? 'border-primary bg-primary/5' : ''}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Select value={filterRegion} onValueChange={(v) => { setFilterRegion(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Body Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {templates?.bodyRegions.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                      <SelectItem value="Amended">Amended</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="STAT">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(filterRegion || filterStatus || filterPriority) && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setFilterRegion(''); setFilterStatus(''); setFilterPriority(''); setPage(1); }}>
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports List */}
      <Card>
        <ScrollArea className="max-h-[600px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium mb-1">No Reports Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || filterRegion || filterStatus || filterPriority
                  ? 'Try adjusting your search or filters.'
                  : 'Upload your MRI report folder or create a new report.'}
              </p>
              {(!searchQuery && !filterRegion && !filterStatus && !filterPriority) && (
                <Button variant="outline" onClick={() => useAppStore.getState().setActiveTab('upload')}>
                  <Filter className="w-4 h-4 mr-2" />
                  Upload Reports
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {reports.map((report, idx) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedReportId(report.id)}
                >
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{report.patientName}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[report.reportStatus] || ''}`}>
                        {report.reportStatus}
                      </Badge>
                      {report.priority !== 'Routine' && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[report.priority] || ''}`}>
                          {report.priority === 'STAT' && <AlertTriangle className="w-3 h-3 mr-0.5" />}
                          {report.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {report.bodyRegion} — {report.studyType}
                      </span>
                      {report.studyDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(report.studyDate), 'MMM d, yyyy')}
                        </span>
                      )}
                      {report.referringDoctor && (
                        <span className="hidden sm:flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {report.referringDoctor}
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {format(new Date(report.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedReportId(report.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingReportId(report.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(report.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}