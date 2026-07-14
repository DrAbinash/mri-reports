'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FindingItem {
  id: string;
  bodyRegion: string;
  label: string;
  text: string;
  isAbnormal: boolean;
  sortOrder: number;
}

interface Props {
  bodyRegion: string;
  onSelectionChange: (selectedTexts: { text: string; isAbnormal: boolean }[]) => void;
}

export default function FindingCheckboxes({ bodyRegion, onSelectionChange }: Props) {
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const regionRef = useRef(bodyRegion);

  const fetchFindings = useCallback((region: string) => {
    fetch(`/api/reports/seed-findings`, { method: 'POST' }).catch(() => {});
    setTimeout(() => {
      fetch(`/api/reports/finding-templates?bodyRegion=${encodeURIComponent(region)}`)
        .then(r => r.json())
        .then(data => {
          if (data.templates) setFindings(data.templates);
          setLoading(false);
        });
    }, 400);
  }, []);

  useEffect(() => {
    if (regionRef.current !== bodyRegion) {
      regionRef.current = bodyRegion;
    }
    fetchFindings(bodyRegion);
  }, [bodyRegion, fetchFindings]);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const selectedItems = findings.filter(f => selected.has(f.id));
    onSelectionChange(selectedItems.map(f => ({ text: f.text, isAbnormal: f.isAbnormal })));
  }, [selected, findings, onSelectionChange]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-3">Loading findings for {bodyRegion}...</div>;
  }

  if (findings.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-3">
        No quick-select findings for {bodyRegion}. Add custom findings in Settings.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Quick Select — {bodyRegion}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {findings.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => toggle(f.id)}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all
              ${selected.has(f.id)
                ? f.isAbnormal
                  ? 'bg-red-50 border-red-300 text-red-800 shadow-sm'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
              selected.has(f.id)
                ? f.isAbnormal
                  ? 'bg-red-500 border-red-500'
                  : 'bg-emerald-500 border-emerald-500'
                : 'border-gray-300'
            }`}>
              {selected.has(f.id) && (
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {f.label}
            {f.isAbnormal && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
          </button>
        ))}
      </div>
    </div>
  );
}