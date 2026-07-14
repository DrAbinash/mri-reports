'use client';

import { useAppStore, type TabValue } from '@/lib/store';
import FolderUpload from '@/components/mri/FolderUpload';
import ReportList from '@/components/mri/ReportList';
import ReportForm from '@/components/mri/ReportForm';
import Dashboard from '@/components/mri/Dashboard';
import SettingsPage from '@/components/mri/SettingsPage';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import type { TemplateData } from '@/lib/store';
import {
  Upload,
  FileText,
  FilePlus,
  LayoutDashboard,
  Database,
  Settings,
  Download,
} from 'lucide-react';

export default function Home() {
  const { activeTab, setActiveTab } = useAppStore();
  const [templates, setTemplates] = useState<TemplateData | null>(null);

  useEffect(() => {
    // Auto-migrate database on first load (ensures tables exist on Synology)
    fetch('/api/migrate').catch(() => {});
    fetch('/api/reports/templates')
      .then(r => r.json())
      .then(setTemplates)
      .catch(console.error);
    // Seed finding defaults on first load
    fetch('/api/reports/seed-findings', { method: 'POST' }).catch(() => {});
  }, []);

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

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'upload' && <FolderUpload />}
        {activeTab === 'reports' && <ReportList />}
        {activeTab === 'create' && (
          <ReportForm
            editId="new"
            onComplete={() => setActiveTab('reports')}
            onCancel={() => setActiveTab('reports')}
            templates={templates}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'settings' && <SettingsPage />}
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