'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, type TemplateData } from '@/lib/store';
import { generateTechnique, generateStudyHeading, combineBodyRegions, combineStudyTypes, getDefaultsForRegion, type Study } from '@/lib/techniqueTemplates';
import { NORMAL_ANATOMY, type AnatomyItem } from '@/lib/normalAnatomy';
import FindingCheckboxes from './FindingCheckboxes';
import OHIFViewer from './OHIFViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Save, Loader2, FileText, Plus, X, GripVertical,
  Sparkles, Scan, CheckSquare, BookOpen, Brain as BrainIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  editId: string | null;
  onComplete: () => void;
  onCancel: () => void;
  templates: TemplateData | null;
  hospitalSettings?: {
    orthancUrl?: string | null;
  } | null;
}

export default function ReportForm({ editId, onComplete, onCancel, templates, hospitalSettings }: Props) {
  const [loading, setLoading] = useState(false);
  const [studies, setStudies] = useState<Study[]>([
    { bodyRegion: 'Brain', studyTypes: getDefaultsForRegion('Brain', false) }
  ]);
  const [techniqueManuallyEdited, setTechniqueManuallyEdited] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [studyInstanceUid, setStudyInstanceUid] = useState('');
  const [excludedAnatomy, setExcludedAnatomy] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    patientName: '', patientId: '', patientAge: '' as string, patientGender: '',
    referringDoctor: '', studyDate: '', accessionNumber: '',
    scannerModel: '', fieldStrength: '1.5T' as string,
    clinicalIndication: '', clinicalHistory: '',
    technique: '', comparison: '', findings: '', impression: '',
    contrastAdministered: false, contrastAgent: '', contrastVolume: '', contrastRoute: 'IV',
    reportStatus: 'Draft', priority: 'Routine',
  });

  // Auto-generate technique
  const autoTechnique = useMemo(() => {
    return generateTechnique(studies, formData.fieldStrength, formData.contrastAdministered, formData.contrastAgent);
  }, [studies, formData.fieldStrength, formData.contrastAdministered, formData.contrastAgent]);

  useEffect(() => {
    if (!techniqueManuallyEdited) setFormData(prev => ({ ...prev, technique: autoTechnique }));
  }, [autoTechnique, techniqueManuallyEdited]);

  const studyHeading = useMemo(() => generateStudyHeading(studies), [studies]);

  const getStudyTypes = useCallback((region: string) => {
    return templates?.studyTypes?.[region] || templates?.studyTypes?.['Other'] || ['Standard'];
  }, [templates]);

  // Load report for editing
  useEffect(() => {
    if (editId && editId !== 'new') {
      setLoading(true);
      fetch(`/api/reports/${editId}`).then(r => r.json()).then(data => {
        if (data.report) {
          const r = data.report;
          const regions = r.bodyRegion?.split(' + ').map(s => s.trim()) || ['Brain'];
          const typesStr = r.studyType?.split(' | ') || [];
          const parsedStudies: Study[] = regions.map((region, idx) => ({
            bodyRegion: region,
            studyTypes: typesStr[idx]?.split(', ').map(s => s.trim()) || getDefaultsForRegion(region, false),
          }));
          setStudies(parsedStudies.length > 0 ? parsedStudies : [{ bodyRegion: 'Brain', studyTypes: getDefaultsForRegion('Brain', false) }]);
          setTechniqueManuallyEdited(true);
          setFormData({
            patientName: r.patientName || '', patientId: r.patientId || '',
            patientAge: r.patientAge?.toString() || '', patientGender: r.patientGender || '',
            referringDoctor: r.referringDoctor || '', studyDate: r.studyDate ? r.studyDate.split('T')[0] : '',
            accessionNumber: r.accessionNumber || '', scannerModel: r.scannerModel || '',
            fieldStrength: r.fieldStrength || '1.5T', clinicalIndication: r.clinicalIndication || '',
            clinicalHistory: r.clinicalHistory || '', technique: r.technique || '',
            comparison: r.comparison || '', findings: r.findings || '', impression: r.impression || '',
            contrastAdministered: r.contrastAdministered || false, contrastAgent: r.contrastAgent || '',
            contrastVolume: r.contrastVolume || '', contrastRoute: r.contrastRoute || 'IV',
            reportStatus: r.reportStatus || 'Draft', priority: r.priority || 'Routine',
          });
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [editId, getStudyTypes]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'technique') setTechniqueManuallyEdited(true);
  };

  // Study management
  const updateStudyRegion = (index: number, region: string) => {
    setStudies(prev => {
      const next = [...prev];
      next[index] = { bodyRegion: region, studyTypes: getDefaultsForRegion(region, formData.contrastAdministered) };
      return next;
    });
    setTechniqueManuallyEdited(false);
  };

  const toggleStudyType = (index: number, type: string) => {
    setStudies(prev => {
      const next = [...prev];
      const current = next[index].studyTypes;
      next[index] = {
        ...next[index],
        studyTypes: current.includes(type) ? current.filter(t => t !== type) : [...current, type],
      };
      return next;
    });
    setTechniqueManuallyEdited(false);
  };

  const selectAllStandard = (index: number) => {
    setStudies(prev => {
      const next = [...prev];
      const region = next[index].bodyRegion;
      next[index] = { ...next[index], studyTypes: getDefaultsForRegion(region, formData.contrastAdministered) };
      return next;
    });
    setTechniqueManuallyEdited(false);
  };

  const clearAllTypes = (index: number) => {
    setStudies(prev => {
      const next = [...prev];
      next[index] = { ...next[index], studyTypes: [] };
      return next;
    });
    setTechniqueManuallyEdited(false);
  };

  const addStudy = () => {
    setStudies(prev => [...prev, { bodyRegion: 'Brain', studyTypes: getDefaultsForRegion('Brain', false) }]);
    setTechniqueManuallyEdited(false);
  };

  const removeStudy = (index: number) => {
    if (studies.length <= 1) return;
    setStudies(prev => prev.filter((_, i) => i !== index));
    setTechniqueManuallyEdited(false);
  };

  // AI functions
  const callAI = async (action: string, payload: Record<string, string>) => {
    setAiLoading(action);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.text) return data.text;
      throw new Error(data.error || 'AI unavailable');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI request failed');
      return null;
    } finally {
      setAiLoading(null);
    }
  };

  const handleAIImpression = async () => {
    if (!formData.findings.trim()) { toast.error('Add findings first'); return; }
    const text = await callAI('impression', { findings: formData.findings });
    if (text) handleChange('impression', text);
  };

  const handleAIFindings = async () => {
    const region = studies[0]?.bodyRegion || 'Brain';
    const text = await callAI('findings', { bodyRegion: region, clinicalIndication: formData.clinicalIndication || 'Routine' });
    if (text) handleChange('findings', text);
  };

  const handleNormalAnatomy = () => {
    const region = studies[0]?.bodyRegion || 'Brain';
    const items = NORMAL_ANATOMY[region] || [];
    const normalText = items
      .filter(item => !excludedAnatomy.has(item.key))
      .map(item => item.text)
      .join('\n');
    if (normalText) {
      const current = formData.findings.trim();
      handleChange('findings', current ? normalText + '\n\n' + current : normalText);
      toast.success(`Normal anatomy for ${region} inserted`);
    } else {
      toast.error(`No normal anatomy template for ${region}`);
    }
  };

  const handleBuildImpression = () => {
    if (!formData.findings.trim()) { toast.error('Add findings first'); return; }
    // Rule-based: extract non-normal lines as impression
    const lines = formData.findings.split('\n').filter(l => {
      const lower = l.toLowerCase();
      // Skip clearly normal lines
      if (lower.includes('normal') && !lower.includes('abnormal') && !lower.includes('not normal')) return false;
      if (lower.includes('no ') && (lower.includes('evidence') || lower.includes('sign') || lower.includes('demonstrat') || lower.includes('identif'))) return false;
      if (lower.includes('unremarkable')) return false;
      return true;
    });
    if (lines.length > 0) {
      handleChange('impression', lines.join('\n'));
      toast.success(`Impression built from ${lines.length} key finding(s)`);
    } else {
      // Fallback: use AI or just copy findings
      handleAIImpression();
    }
  };

  const applyTemplate = (templateIdx: number) => {
    const tpl = templates?.defaultTemplates[templateIdx];
    if (tpl) {
      setStudies([{ bodyRegion: tpl.bodyRegion, studyTypes: getDefaultsForRegion(tpl.bodyRegion, formData.contrastAdministered) }]);
      setTechniqueManuallyEdited(false);
      toast.success(`Template "${tpl.name}" applied`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        bodyRegion: combineBodyRegions(studies),
        studyType: combineStudyTypes(studies),
        patientAge: formData.patientAge ? parseInt(formData.patientAge) : null,
        studyDate: formData.studyDate || null,
      };
      const url = editId && editId !== 'new' ? `/api/reports/${editId}` : '/api/reports';
      const method = editId && editId !== 'new' ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to save report'); }
      toast.success(editId === 'new' ? 'Report created successfully' : 'Report updated successfully');
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally { setLoading(false); }
  };

  const handleFindingSelection = useCallback((selected: { text: string; isAbnormal: boolean }[]) => {
    if (selected.length === 0) return;
    const currentFindings = formData.findings.split('\n').filter(l => l.trim()).join('\n');
    const existing = new Set(currentFindings.toLowerCase());
    const newTexts = selected.filter(s => !existing.has(s.text.toLowerCase())).map(s => s.text);
    if (newTexts.length > 0) {
      const separator = currentFindings ? '\n' : '';
      handleChange('findings', currentFindings + separator + newTexts.join('\n'));
    }
  }, [formData.findings]);

  const isEditing = editId && editId !== 'new';

  if (isEditing && formData.patientName === '' && loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card></div>;
  }

  return (
    <div className="flex gap-0">
      {/* Main form — takes remaining width */}
      <div className={`min-w-0 transition-all duration-300 ${showViewer ? 'mr-0' : ''}`} style={showViewer ? { width: '60%' } : { width: '100%' }}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onCancel}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Report' : 'Create New Report'}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="font-semibold text-xs">{studyHeading}</Badge>
                {studies.length > 1 && <span className="text-xs text-muted-foreground">{studies.length} studies</span>}
              </div>
            </div>
            {/* DICOM Viewer toggle */}
            <Button variant={showViewer ? 'default' : 'outline'} size="sm" onClick={() => setShowViewer(v => !v)} className="gap-1.5">
              <Scan className="w-3.5 h-3.5" /> DICOM
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[calc(100vh-160px)]">
              <div className="space-y-6 pb-6 pr-2">
                {/* Templates */}
                {templates && templates.defaultTemplates.length > 0 && !isEditing && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Quick Templates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {templates.defaultTemplates.map((tpl, idx) => (
                          <Button key={idx} type="button" variant="outline" size="sm" onClick={() => applyTemplate(idx)}>{tpl.name}</Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Patient Info */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Patient Information</CardTitle></CardHeader>
                  <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label>Patient Name *</Label><Input value={formData.patientName} onChange={e => handleChange('patientName', e.target.value)} required /></div>
                    <div className="space-y-1.5"><Label>Patient ID</Label><Input value={formData.patientId} onChange={e => handleChange('patientId', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Age</Label><Input type="number" value={formData.patientAge} onChange={e => handleChange('patientAge', e.target.value)} placeholder="years" /></div>
                    <div className="space-y-1.5"><Label>Gender</Label><Select value={formData.patientGender} onValueChange={v => handleChange('patientGender', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Referring Doctor</Label><Input value={formData.referringDoctor} onChange={e => handleChange('referringDoctor', e.target.value)} /></div>
                    <div className="space-y-1.5">
                      <Label>Study Instance UID</Label>
                      <Input value={studyInstanceUid} onChange={e => setStudyInstanceUid(e.target.value)} placeholder="1.2.840..." />
                    </div>
                  </CardContent>
                </Card>

                {/* Study Details — MULTI-STUDY with MULTI-SELECT types */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">Study Details</CardTitle>
                        <CardDescription>Add studies and select sequences</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addStudy} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Study</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {studies.map((study, idx) => {
                      const availableTypes = getStudyTypes(study.bodyRegion);
                      const defaults = getDefaultsForRegion(study.bodyRegion, formData.contrastAdministered);
                      const allSelected = availableTypes.length > 0 && availableTypes.every(t => study.studyTypes.includes(t));
                      return (
                        <div key={idx} className="border rounded-lg p-3 bg-muted/30 space-y-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">#{idx + 1}</Badge>
                            <Select value={study.bodyRegion} onValueChange={v => updateStudyRegion(idx, v)} className="max-w-[220px]">
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>{templates?.bodyRegions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className="flex-1" />
                            {studies.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeStudy(idx)}><X className="w-4 h-4" /></Button>
                            )}
                          </div>
                          {/* Multi-select sequences */}
                          <div className="ml-6 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sequences</span>
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => selectAllStandard(idx)}>
                                <CheckSquare className="w-3 h-3" /> Select All Standard ({defaults.length})
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => clearAllTypes(idx)}>Clear</Button>
                              <Badge variant="secondary" className="text-[10px]">{study.studyTypes.length} selected</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {availableTypes.map(type => {
                                const isSelected = study.studyTypes.includes(type);
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleStudyType(idx, type)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                                      isSelected
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                                      isSelected ? 'bg-primary-foreground border-primary' : 'border-gray-300'
                                    }`}>
                                      {isSelected && <svg className="w-2 h-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </span>
                                    {type}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
                      <div className="space-y-1.5"><Label>Study Date</Label><Input type="date" value={formData.studyDate} onChange={e => handleChange('studyDate', e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Accession #</Label><Input value={formData.accessionNumber} onChange={e => handleChange('accessionNumber', e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Scanner</Label><Input value={formData.scannerModel} onChange={e => handleChange('scannerModel', e.target.value)} placeholder="Siemens MAGNETOM" /></div>
                      <div className="space-y-1.5"><Label>Field Strength</Label>
                        <Select value={formData.fieldStrength} onValueChange={v => handleChange('fieldStrength', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.5T">0.5T</SelectItem><SelectItem value="1.0T">1.0T</SelectItem><SelectItem value="1.5T">1.5T</SelectItem><SelectItem value="3T">3T</SelectItem><SelectItem value="7T">7T</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Clinical Info */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Clinical Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5"><Label>Clinical Indication</Label><Textarea value={formData.clinicalIndication} onChange={e => handleChange('clinicalIndication', e.target.value)} placeholder="Reason for the study..." rows={2} /></div>
                    <div className="space-y-1.5"><Label>Clinical History</Label><Textarea value={formData.clinicalHistory} onChange={e => handleChange('clinicalHistory', e.target.value)} placeholder="Relevant clinical history..." rows={2} /></div>
                  </CardContent>
                </Card>

                {/* Contrast */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Contrast</CardTitle>
                      <Switch checked={formData.contrastAdministered} onCheckedChange={v => { handleChange('contrastAdministered', v); setTechniqueManuallyEdited(false); }} />
                    </div>
                  </CardHeader>
                  {formData.contrastAdministered && (
                    <CardContent className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5"><Label>Agent</Label><Input value={formData.contrastAgent} onChange={e => { handleChange('contrastAgent', e.target.value); setTechniqueManuallyEdited(false); }} placeholder="Gadoterate meglumine" /></div>
                      <div className="space-y-1.5"><Label>Volume</Label><Input value={formData.contrastVolume} onChange={e => handleChange('contrastVolume', e.target.value)} placeholder="0.1 mmol/kg" /></div>
                      <div className="space-y-1.5"><Label>Route</Label><Select value={formData.contrastRoute} onValueChange={v => handleChange('contrastRoute', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="IV">IV</SelectItem><SelectItem value="IO">IO</SelectItem><SelectItem value="Oral">Oral</SelectItem></SelectContent></Select></div>
                    </CardContent>
                  )}
                </Card>

                {/* Report Content */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Report Content</CardTitle>
                      <div className="flex gap-1.5">
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleNormalAnatomy} title="Insert normal anatomy for selected region">
                          <BookOpen className="w-3 h-3" /> Normal Anatomy
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleAIFindings} disabled={aiLoading === 'findings'} title="AI-generate findings">
                          <Sparkles className="w-3 h-3" /> {aiLoading === 'findings' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'AI Findings'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FindingCheckboxes bodyRegion={studies[0]?.bodyRegion || 'Brain'} onSelectionChange={handleFindingSelection} />

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Technique</Label>
                        {techniqueManuallyEdited && <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setTechniqueManuallyEdited(false); setFormData(prev => ({ ...prev, technique: autoTechnique })); }}>Re-auto-generate</button>}
                      </div>
                      <Textarea value={formData.technique} onChange={e => handleChange('technique', e.target.value)} placeholder="Auto-generated from study selection..." rows={studies.length > 1 ? 6 : 3} />
                      {!techniqueManuallyEdited && formData.technique && <p className="text-[10px] text-muted-foreground">Auto-generated from sequence selection. Edit to customize.</p>}
                    </div>

                    <div className="space-y-1.5"><Label>Comparison</Label><Textarea value={formData.comparison} onChange={e => handleChange('comparison', e.target.value)} placeholder="Comparison with prior studies..." rows={2} /></div>

                    <div className="space-y-1.5">
                      <Label>Findings *</Label>
                      <Textarea value={formData.findings} onChange={e => handleChange('findings', e.target.value)} placeholder={studies.length > 1 ? 'Describe findings for each study...' : 'Describe the MRI findings...'} rows={8} required />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Impression *</Label>
                        <div className="flex gap-1.5">
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleBuildImpression} title="Build impression from findings (rule-based)">
                            <BrainIcon className="w-3 h-3" /> Build from Findings
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleAIImpression} disabled={aiLoading === 'impression'} title="AI-generate impression">
                            <Sparkles className="w-3 h-3" /> {aiLoading === 'impression' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'AI Impression'}
                          </Button>
                        </div>
                      </div>
                      <Textarea value={formData.impression} onChange={e => handleChange('impression', e.target.value)} placeholder="Clinical impression / conclusion..." rows={4} required className="border-primary/30 bg-primary/5" />
                    </div>
                  </CardContent>
                </Card>

                {/* Status */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Status</Label><Select value={formData.reportStatus} onValueChange={v => handleChange('reportStatus', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Final">Final</SelectItem><SelectItem value="Amended">Amended</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Priority</Label><Select value={formData.priority} onValueChange={v => handleChange('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Routine">Routine</SelectItem><SelectItem value="Urgent">Urgent</SelectItem><SelectItem value="STAT">STAT</SelectItem></SelectContent></Select></div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isEditing ? 'Update' : 'Create'} Report</>}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </form>
        </div>
      </div>

      {/* OHIF DICOM Viewer — sticky right panel */}
      {showViewer && (
        <div className="w-[40%] min-w-[300px] sticky top-14 self-start h-[calc(100vh-4rem)]">
          <OHIFViewer
            orthancUrl={hospitalSettings?.orthancUrl || ''}
            studyInstanceUid={studyInstanceUid || undefined}
            onClose={() => setShowViewer(false)}
          />
        </div>
      )}
    </div>
  );
}