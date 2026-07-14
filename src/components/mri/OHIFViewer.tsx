'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Maximize2, Minimize2, Scan } from 'lucide-react';

interface OHIFViewerProps {
  orthancUrl: string;
  studyInstanceUid?: string;
  onClose?: () => void;
}

export default function OHIFViewer({
  orthancUrl,
  studyInstanceUid,
  onClose,
}: OHIFViewerProps) {
  const [widthPercent, setWidthPercent] = useState(40);
  const [collapsed, setCollapsed] = useState(false);

  // Build the OHIF viewer URL
  const getViewerUrl = (): string => {
    if (!orthancUrl) return '';
    const base = orthancUrl.replace(/\/+$/, '');
    if (studyInstanceUid) {
      return `${base}/ohif/viewer?studyUID=${encodeURIComponent(studyInstanceUid)}`;
    }
    return `${base}/ohif/`;
  };

  const viewerUrl = getViewerUrl();

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDoubleClickHeader = () => {
    setCollapsed((prev) => !prev);
  };

  const handleSliderChange = (value: number[]) => {
    // Ensure value stays within 30-70 range
    const clamped = Math.min(70, Math.max(30, value[0]));
    setWidthPercent(clamped);
    if (collapsed) setCollapsed(false);
  };

  return (
    <div
      className="fixed top-0 right-0 h-screen z-50 flex flex-col border-l border-border bg-background shadow-2xl"
      style={{ width: collapsed ? 'auto' : `${widthPercent}vw` }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 cursor-pointer select-none shrink-0"
        onDoubleClick={handleDoubleClickHeader}
        title="Double-click to collapse/expand"
      >
        <Scan className="h-4 w-4 text-muted-foreground shrink-0" />

        <span className="text-sm font-semibold truncate">
          DICOM Viewer
        </span>

        {/* Width slider — hidden when collapsed */}
        {!collapsed && (
          <div className="flex items-center gap-2 ml-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">Width</span>
            <Slider
              value={[widthPercent]}
              min={30}
              max={70}
              step={1}
              onValueChange={handleSliderChange}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
              {widthPercent}%
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
            setCollapsed((prev) => !prev);
          }}
          title={collapsed ? 'Expand viewer' : 'Collapse viewer'}
        >
          {collapsed ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Minimize2 className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close viewer"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Iframe / placeholder content */}
      {!collapsed && (
        <div className="flex-1 relative overflow-hidden">
          {!orthancUrl ? (
            // No URL configured — show placeholder
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground p-6">
              <Scan className="h-12 w-12 opacity-40" />
              <p className="text-sm text-center">
                Configure Orthanc/OHIF URL in Settings
              </p>
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