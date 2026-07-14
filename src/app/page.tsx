'use client';

import { useAppStore, type TabValue } from '@/lib/store';
import FolderUpload from '@/components/mri/FolderUpload';
import ReportList from '@/components/mri/ReportList';
import ReportForm from '@/components/mri/ReportForm';
import Dashboard from '@/components/mri/Dashboard';
import SettingsPage from '@/components/mri/SettingsPage';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useCallback } from 'react';
import type { TemplateData } from '@/lib/store';
import {
  Upload,
  FileText,
  FilePlus,
  LayoutDashboard,
  Database,
  Settings,
  Download,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function ComponentGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        {fallback || <p>Component failed to load. <button onClick={() => setError(null)} className="underline">Retry</button></p>}
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (e) {
    setError(e as Error);
    return null;
  }
}

export default function Home() {
  const { activeTab, setActiveTab } = useAppStore();
  const [templates, setTemplates] = useState<TemplateData | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'healthy' | 'broken' | 'fixing'>('checking');

  const checkDb = useCallback(() => {
    setDbStatus('checking');
    fetch('/api/db-setup')
      .then(r => r.json())
      .then(data => setDbStatus(data.healthy ? 'healthy' : 'broken'))
      .catch(() => setDbStatus('broken'));
  }, []);

  useEffect(() => {
    // Load templates
    fetch('/api/reports/templates')
      .then(r => r.json())
      .then(setTemplates)
      .catch(() => {
        // Return hardcoded fallbacks
        setTemplates({
          bodyRegions: ['Brain', 'Spine - Cervical', 'Spine - Thoracic', 'Spine - Lumbar', 'Knee', 'Shoulder', 'Hip', 'Elbow', 'Wrist', 'Ankle', 'Foot', 'Hand', 'Abdomen', 'Pelvis', 'Chest', 'Neck', 'Cardiac', 'Breast', 'Prostate', 'Other'],
          studyTypes: { Brain: ['T1', 'T2', 'FLAIR', 'DWI/ADC'] },
          defaultTemplates: [],
          customTemplates: [],
        });
      });

    // Seed findings in background
    fetch('/api/reports/seed-findings', { method: 'POST' }).catch(() => {});

    // Check DB health
    checkDb();
  }, [checkDb]);

  const handleFixDb = async () => {
    setDbStatus('fixing');
    try {
      const res = await fetch('/api/db-setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDbStatus('healthy');
        // Reload templates
        fetch('/api/reports/templates')
          .then(r => r.json())
          .then(setTemplates)
          .catch(() => {});
        fetch('/api/reports/seed-findings', { method: 'POST' }).catch(() => {});
      } else {
        setDbStatus('broken');
      }
    } catch {
      setDbStatus('broken');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Database className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">MRI Report Manager</h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Synology-Deployable</p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="create" className="text-xs sm:text-sm px-2 sm:px-3 gap-1.5">
                  <FilePlus className="w-3.5 h-3.5 hidden sm:block" />
                  <span className="hidden sm:inline">New Report</span>
                  <span className="sm:hidden">New</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 sm:px-3 gap-1.5">
                  <FileText className="w-3.5 h-3.5 hidden sm:block" />
                  <span>Reports</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs sm:text-sm px-2 sm:px-3 gap-1.5">
                  <Upload className="w-3.5 h-3.5 hidden sm:block" />
                  <span>Upload</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-2 sm:px-3 gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 hidden sm:block" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-3 gap-1.5">
                  <Settings className="w-3.5 h-3.5 hidden sm:block" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* DB Health Banner */}
      {dbStatus === 'broken' && (
        <div className="bg-destructive/10 border-b border-destructive/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Database tables are missing or broken.</span>
            </div>
            <Button size="sm" variant="destructive" onClick={handleFixDb} className="ml-3 flex-shrink-0">
              Fix Database
            </Button>
          </div>
        </div>
      )}
      {dbStatus === 'fixing' && (
        <div className="bg-muted border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Fixing database...</span>
          </div>
        </div>
      )}
      {dbStatus === 'healthy' && (
        <div className="bg-emerald-50 border-b border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span>Database OK</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'upload' && <ComponentGuard><FolderUpload /></ComponentGuard>}
        {activeTab === 'reports' && <ComponentGuard><ReportList /></ComponentGuard>}
        {activeTab === 'create' && (
          <ComponentGuard>
            <ReportForm
              editId="new"
              onComplete={() => setActiveTab('reports')}
              onCancel={() => setActiveTab('reports')}
              templates={templates}
            />
          </ComponentGuard>
        )}
        {activeTab === 'dashboard' && <ComponentGuard><Dashboard /></ComponentGuard>}
        {activeTab === 'settings' && <ComponentGuard><SettingsPage /></ComponentGuard>}
      </main>

      {/* Sticky Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>MRI Report Manager — Synology NAS Ready</span>
          <a
            href="/api/download"
            download="mri-reports.tar.gz"
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download Project
          </a>
        </div>
      </footer>
    </div>
  );
}