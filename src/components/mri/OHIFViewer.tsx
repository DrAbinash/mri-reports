'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Maximize2, Minimize2, Scan, Eye } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function OHIFViewer() {
  const orthancUrl = useAppStore((s) => {
    // We'll get orthancUrl from hospitalSettings passed via context or prop
    return '';
  });
  const { showOhifViewer, setShowOhifViewer, ohifViewerWidth, setOhifViewerWidth } = useAppStore();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [orthancUrlLocal, setOrthancUrlLocal] = useState('');

  // Fetch hospital settings for orthanc URL
  useEffect(() => {
    fetch('/api/reports/hospital-settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings?.orthancUrl) {
          setOrthancUrlLocal(data.settings.orthancUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Build the OHIF viewer URL
  const getViewerUrl = (): string => {
    if (!orthancUrlLocal) return '';
    const base = orthancUrlLocal.replace(/\/+$/, '');
    return `${base}/ohif/`;
  };

  const viewerUrl = getViewerUrl();

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOhifViewer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowOhifViewer]);

  const handleDoubleClickHeader = () => {
    setLocalCollapsed((prev) => !prev);
  };

  const handleSliderChange = (value: number[]) => {
    const clamped = Math.min(70, Math.max(20, value[0]));
    setOhifViewerWidth(clamped);
    if (localCollapsed) setLocalCollapsed(false);
  };

  if (!showOhifViewer) return null;

  return (
    <div
      className="fixed top-14 right-0 h-[calc(100vh-3.5rem)] z-30 flex flex-col border-l border-border bg-background shadow-2xl transition-[width] duration-200 ease-out"
      style={{ width: localCollapsed ? 'auto' : `${ohifViewerWidth}vw` }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 cursor-pointer select-none shrink-0"
        onDoubleClick={handleDoubleClickHeader}
        title="Double-click to collapse/expand"
      >
        <Eye className="h-4 w-4 text-primary shrink-0" />

        <span className="text-sm font-semibold truncate">
          DICOM Viewer
        </span>

        {/* Width slider — hidden when collapsed */}
        {!localCollapsed && (
          <div className="flex items-center gap-2 ml-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Width</span>
            <Slider
              value={[ohifViewerWidth]}
              min={20}
              max={70}
              step={1}
              onValueChange={handleSliderChange}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
              {ohifViewerWidth}%
            </span>
          </div>
        )}

        {/* Toggle collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setLocalCollapsed((prev) => !prev);
          }}
          title={localCollapsed ? 'Expand viewer' : 'Collapse viewer'}
        >
          {localCollapsed ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Minimize2 className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setShowOhifViewer(false);
          }}
          title="Close viewer (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Iframe / placeholder content */}
      {!localCollapsed && (
        <div className="flex-1 relative overflow-hidden">
          {!orthancUrlLocal ? (
            // No URL configured — show placeholder
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground p-6">
              <Scan className="h-12 w-12 opacity-40" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Orthanc/OHIF Not Configured</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Go to <strong>Settings</strong> and set the Orthanc PACS URL to enable the DICOM viewer.
                </p>
              </div>
            </div>
          ) : (
            // Embedded OHIF viewer
            <iframe
              src={viewerUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="OHIF DICOM Viewer"
              allow="clipboard-read; clipboard-write"
            />
          )}
        </div>
      )}
    </div>
  );
}