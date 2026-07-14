'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, type TemplateData } from '@/lib/store';
import { generateTechnique, generateStudyHeading, combineBodyRegions, combineStudyTypes, type Study } from '@/lib/techniqueTemplates';
import FindingCheckboxes from './FindingCheckboxes';
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
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Plus,
  X,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  editId: string | null;
  onComplete: () => void;
  onCancel: () => void;
  templates: TemplateData | null;
}

export default function ReportForm({ editId, onComplete, onCancel, templates }: Props) {
  const [loading, setLoading] = useState(false);
  const [studies, setStudies] = useState<Study[]>([{ bodyRegion: 'Brain', studyType: 'T1' }]);
  const [techniqueManuallyEdited, setTechniqueManuallyEdited] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    patientAge: '' as string,
    patientGender: '',
    referringDoctor: '',
    studyDate: '',
    accessionNumber: '',
    scannerModel: '',
    fieldStrength: '1.5T' as string,
    clinicalIndication: '',
    clinicalHistory: '',
    technique: '',
    comparison: '',
    findings: '',
    impression: '',
    contrastAdministered: false,
    contrastAgent: '',
    contrastVolume: '',
    contrastRoute: 'IV',
    reportStatus: 'Draft',
    priority: 'Routine',
  });

  // Auto-generate technique when studies, field strength, or contrast change
  const autoTechnique = useMemo(() => {
    return generateTechnique(studies, formData.fieldStrength, formData.contrastAdministered, formData.contrastAgent);
  }, [studies, formData.fieldStrength, formData.contrastAdministered, formData.contrastAgent]);

  // Update technique when auto-generated version changes (unless manually edited)
  useEffect(() => {
    if (!techniqueManuallyEdited) {
      setFormData(prev => ({ ...prev, technique: autoTechnique }));
    }
  }, [autoTechnique, techniqueManuallyEdited]);

  // Combined heading
  const studyHeading = useMemo(() => generateStudyHeading(studies), [studies]);

  // Get study types for a body region
  const getStudyTypes = useCallback((region: string) => {
    return templates?.studyTypes?.[region] || templates?.studyTypes?.['Other'] || ['Standard'];
  }, [templates]);

  // Load report for editing
  useEffect(() => {
    if (editId && editId !== 'new') {
      setLoading(true);
      fetch(`/api/reports/${editId}`)
        .then(r => r.json())
        .then(data => {
          if (data.report) {
            const r = data.report;
            // Parse combined body region back to studies
            const regions = r.bodyRegion?.split(' + ').map(s => s.trim()) || ['Brain'];
            const types = r.studyType?.split(',').map(s => s.trim()) || [];
            const parsedStudies: Study[] = regions.map((region, idx) => ({
              bodyRegion: region,
              studyType: types[idx] || getStudyTypes(region)[0] || 'Standard',
            }));

            setStudies(parsedStudies.length > 0 ? parsedStudies : [{ bodyRegion: 'Brain', studyType: 'T1' }]);
            setTechniqueManuallyEdited(true); // Don't overwrite loaded technique
            setFormData({
              patientName: r.patientName || '',
              patientId: r.patientId || '',
              patientAge: r.patientAge?.toString() || '',
              patientGender: r.patientGender || '',
              referringDoctor: r.referringDoctor || '',
              studyDate: r.studyDate ? r.studyDate.split('T')[0] : '',
              accessionNumber: r.accessionNumber || '',
              scannerModel: r.scannerModel || '',
              fieldStrength: r.fieldStrength || '1.5T',
              clinicalIndication: r.clinicalIndication || '',
              clinicalHistory: r.clinicalHistory || '',
              technique: r.technique || '',
              comparison: r.comparison || '',
              findings: r.findings || '',
              impression: r.impression || '',
              contrastAdministered: r.contrastAdministered || false,
              contrastAgent: r.contrastAgent || '',
              contrastVolume: r.contrastVolume || '',
              contrastRoute: r.contrastRoute || 'IV',
              reportStatus: r.reportStatus || 'Draft',
              priority: r.priority || 'Routine',
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [editId, getStudyTypes]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // If user edits technique manually, don't auto-overwrite
    if (field === 'technique') {
      setTechniqueManuallyEdited(true);
    }
  };

  // Study management
  const updateStudy = (index: number, field: 'bodyRegion' | 'studyType', value: string) => {
    setStudies(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // If body region changed, reset study type to first available
      if (field === 'bodyRegion') {
        next[index].studyType = getStudyTypes(value)[0] || 'Standard';
      }
      return next;
    });
    setTechniqueManuallyEdited(false); // Re-enable auto-generation
  };

  const addStudy = () => {
    setStudies(prev => [...prev, { bodyRegion: 'Brain', studyType: 'T1' }]);
    setTechniqueManuallyEdited(false);
  };

  const removeStudy = (index: number) => {
    if (studies.length <= 1) return;
    setStudies(prev => prev.filter((_, i) => i !== index));
    setTechniqueManuallyEdited(false);
  };

  // Apply template
  const applyTemplate = (templateIdx: number) => {
    const tpl = templates?.defaultTemplates[templateIdx];
    if (tpl) {
      const studyTypes = getStudyTypes(tpl.bodyRegion);
      setStudies([{ bodyRegion: tpl.bodyRegion, studyType: studyTypes[0] || 'Standard' }]);
      setTechniqueManuallyEdited(false);
      setFormData(prev => ({
        ...prev,
        fieldStrength: prev.fieldStrength || '1.5T',
      }));
      // Let the auto-technique generation handle the technique text
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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save report');
      }

      toast.success(editId === 'new' ? 'Report created successfully' : 'Report updated successfully');
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleFindingSelection = useCallback((selected: { text: string; isAbnormal: boolean }[]) => {
    if (selected.length === 0) return;
    const currentFindings = formData.findings
      .split('\n').filter(l => l.trim()).join('\n');
    const existing = new Set(currentFindings.toLowerCase());
    const newTexts = selected
      .filter(s => !existing.has(s.text.toLowerCase()))
      .map(s => s.text);
    if (newTexts.length > 0) {
      const separator = currentFindings ? '\n' : '';
      handleChange('findings', currentFindings + separator + newTexts.join('\n'));
    }
  }, [formData.findings]);

  const isEditing = editId && editId !== 'new';

  if (isEditing && formData.patientName === '' && loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with combined study heading */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Report' : 'Create New Report'}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="font-semibold text-xs">{studyHeading}</Badge>
            {studies.length > 1 && (
              <span className="text-xs text-muted-foreground">{studies.length} studies combined</span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <ScrollArea className="max-h-[calc(100vh-160px)]">
          <div className="space-y-6 pb-6">
            {/* Templates */}
            {templates && templates.defaultTemplates.length > 0 && !isEditing && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Quick Templates
                  </CardTitle>
                  <CardDescription>Click to auto-fill study and technique</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {templates.defaultTemplates.map((tpl, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(idx)}
                      >
                        {tpl.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Patient Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input id="patientName" value={formData.patientName} onChange={e => handleChange('patientName', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <Input id="patientId" value={formData.patientId} onChange={e => handleChange('patientId', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input id="patientAge" type="number" value={formData.patientAge} onChange={e => handleChange('patientAge', e.target.value)} placeholder="years" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patientGender">Gender</Label>
                  <Select value={formData.patientGender} onValueChange={v => handleChange('patientGender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referringDoctor">Referring Doctor</Label>
                  <Input id="referringDoctor" value={formData.referringDoctor} onChange={e => handleChange('referringDoctor', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Study Details — MULTI-STUDY */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Study Details</CardTitle>
                    <CardDescription>Add one or more MRI studies for this patient</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addStudy} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Study
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Study rows */}
                <div className="space-y-3">
                  {studies.map((study, idx) => {
                    const types = getStudyTypes(study.bodyRegion);
                    return (
                      <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2 pt-2 text-muted-foreground shrink-0">
                          <GripVertical className="w-4 h-4" />
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="flex-1 grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Body Region</Label>
                            <Select
                              value={study.bodyRegion}
                              onValueChange={v => updateStudy(idx, 'bodyRegion', v)}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {templates?.bodyRegions.map(r => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Study Type</Label>
                            <Select
                              value={study.studyType}
                              onValueChange={v => {
                                updateStudy(idx, 'studyType', v);
                                setTechniqueManuallyEdited(false);
                              }}
                            >
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {types.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {studies.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 mt-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeStudy(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Other study fields */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label>Study Date</Label>
                    <Input type="date" value={formData.studyDate} onChange={e => handleChange('studyDate', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Accession #</Label>
                    <Input value={formData.accessionNumber} onChange={e => handleChange('accessionNumber', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Scanner Model</Label>
                    <Input value={formData.scannerModel} onChange={e => handleChange('scannerModel', e.target.value)} placeholder="e.g., Siemens MAGNETOM" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Field Strength</Label>
                    <Select value={formData.fieldStrength} onValueChange={v => handleChange('fieldStrength', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5T">0.5T</SelectItem>
                        <SelectItem value="1.0T">1.0T</SelectItem>
                        <SelectItem value="1.5T">1.5T</SelectItem>
                        <SelectItem value="3T">3T</SelectItem>
                        <SelectItem value="7T">7T</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Clinical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Clinical Indication</Label>
                  <Textarea value={formData.clinicalIndication} onChange={e => handleChange('clinicalIndication', e.target.value)} placeholder="Reason for the study..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Clinical History</Label>
                  <Textarea value={formData.clinicalHistory} onChange={e => handleChange('clinicalHistory', e.target.value)} placeholder="Relevant clinical history..." rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Contrast */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Contrast Administration</CardTitle>
                  <Switch
                    checked={formData.contrastAdministered}
                    onCheckedChange={v => {
                      handleChange('contrastAdministered', v);
                      setTechniqueManuallyEdited(false); // Re-generate technique
                    }}
                  />
                </div>
              </CardHeader>
              {formData.contrastAdministered && (
                <CardContent className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Contrast Agent</Label>
                    <Input value={formData.contrastAgent} onChange={e => {
                      handleChange('contrastAgent', e.target.value);
                      setTechniqueManuallyEdited(false);
                    }} placeholder="e.g., Gadoterate meglumine" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Volume</Label>
                    <Input value={formData.contrastVolume} onChange={e => handleChange('contrastVolume', e.target.value)} placeholder="e.g., 0.1 mmol/kg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Route</Label>
                    <Select value={formData.contrastRoute} onValueChange={v => handleChange('contrastRoute', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IV">IV</SelectItem>
                        <SelectItem value="IO">IO</SelectItem>
                        <SelectItem value="Oral">Oral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Report Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Report Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Select Findings — for first (primary) study */}
                <FindingCheckboxes
                  bodyRegion={studies[0]?.bodyRegion || 'Brain'}
                  onSelectionChange={handleFindingSelection}
                />

                {/* Technique — auto-filled with option to edit */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Technique</Label>
                    {techniqueManuallyEdited && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => {
                          setTechniqueManuallyEdited(false);
                          setFormData(prev => ({ ...prev, technique: autoTechnique }));
                        }}
                      >
                        Re-auto-generate
                      </button>
                    )}
                  </div>
                  <Textarea
                    value={formData.technique}
                    onChange={e => handleChange('technique', e.target.value)}
                    placeholder="Auto-generated from study selection above..."
                    rows={studies.length > 1 ? 6 : 3}
                  />
                  {!techniqueManuallyEdited && formData.technique && (
                    <p className="text-[10px] text-muted-foreground">Auto-generated from study type selection. Edit to customize.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Comparison</Label>
                  <Textarea value={formData.comparison} onChange={e => handleChange('comparison', e.target.value)} placeholder="Comparison with prior studies..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="findings">Findings *</Label>
                  <Textarea id="findings" value={formData.findings} onChange={e => handleChange('findings', e.target.value)} placeholder={studies.length > 1 ? `Describe findings for each study separately...` : 'Describe the MRI findings in detail...'} rows={6} required />
                  {studies.length > 1 && (
                    <p className="text-[10px] text-muted-foreground">Tip: Separate findings by study, e.g., "BRAIN: ... CERVICAL SPINE: ..."</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="impression">Impression *</Label>
                  <Textarea id="impression" value={formData.impression} onChange={e => handleChange('impression', e.target.value)} placeholder="Clinical impression / conclusion..." rows={4} required className="border-primary/30 bg-primary/5" />
                </div>
              </CardContent>
            </Card>

            {/* Status & Priority */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Report Status</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={formData.reportStatus} onValueChange={v => handleChange('reportStatus', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                      <SelectItem value="Amended">Amended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => handleChange('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="STAT">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Update Report' : 'Create Report'}</>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </form>
    </div>
  );
}