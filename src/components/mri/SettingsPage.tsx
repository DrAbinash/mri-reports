'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Save, Plus, Trash2, Loader2, Building2, Stethoscope, FileCheck,
  Upload, ImageIcon, X, Layout, Printer,
} from 'lucide-react';
import { toast } from 'sonner';

const BODY_REGIONS = [
  'Brain', 'Spine - Cervical', 'Spine - Thoracic', 'Spine - Lumbar',
  'Spine - Sacral', 'Knee', 'Shoulder', 'Hip', 'Abdomen',
  'Pelvis', 'Chest', 'Neck', 'Cardiac', 'Breast', 'Prostate', 'Other',
];

const LAYOUT_PRESETS = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Full header bar, 3-col patient info, bordered impression',
    preview: '█ header █\n░░░░░░░░░░░░░░░░░░░░░░░░░░\n░ Patient Info (3-col)    ░\n░ Technique                 ░\n░ Findings                ░\n░ ┃ Impression             ░\n░ footer bar             ░',
  },
  {
    id: 'modern',
    name: 'Modern Minimal',
    desc: 'Thin header line, 2-col info, underlined impression',
    preview: 'name & tagline\n─── ─── ─── ─── ─── ─── ───\n░ Patient Info (2-col)    ░\n░ Findings                ░\n░ Impression ─────────── ░\n░ footer                  ░',
  },
  {
    id: 'compact',
    name: 'Compact',
    desc: 'No header, tight spacing, small font, all inline',
    preview: 'MRI Brain — T2\nName: X  Age: Y  Date: Z\nFindings: • ...\nImpression: 1. ...\nDr. Name  |  Reg. No.',
  },
];

export default function SettingsPage() {
  const [hospital, setHospital] = useState({
    hospitalName: '', tagline: '', address: '', phone: '', website: '', email: '',
    radiologistName: '', radiologistQualification: '', radiologistRegNumber: '',
    accreditation: '', accreditationNumber: '',
    footerMessage: 'Thank you for choosing our services.',
    reportHeaderColor: '#1e3a5f',
    // Layout options
    reportLayout: 'classic',
    showTechnique: true, showComparison: true, showClinicalInfo: true,
    showSignature: true, showFooterMessage: true, showAccreditation: true,
    patientColumns: '3', impressionStyle: 'bordered', headerStyle: 'full',
  });
  const [findings, setFindings] = useState<Record<string, any[]>>({});
  const [selectedRegion, setSelectedRegion] = useState('Brain');
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [newAbnormal, setNewAbnormal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<'branding' | 'radiologist' | 'layout' | 'findings'>('branding');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load hospital settings
  useEffect(() => {
    fetch('/api/reports/hospital-settings').then(r => r.json()).then(d => {
      if (d.settings) setHospital(d.settings);
    });
    fetch('/api/reports/seed-findings', { method: 'POST' }).catch(() => {});
    setTimeout(() => loadFindings(), 600);
  }, []);

  const loadFindings = () => {
    fetch('/api/reports/finding-templates').then(r => r.json()).then(d => {
      if (d.grouped) setFindings(d.grouped);
    });
  };

  useEffect(() => { loadFindings(); }, [selectedRegion]);

  const saveHospital = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/hospital-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hospital),
      });
      if (res.ok) toast.success('Settings saved');
    } catch { toast.error('Save failed'); }
    finally { setLoading(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/reports/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.logoUrl) {
        setHospital(p => ({ ...p, logoUrl: data.logoUrl }));
        toast.success('Logo uploaded');
      }
    } catch { toast.error('Logo upload failed'); }
    finally { setUploading(false); }
  };

  const removeLogo = async () => {
    setHospital(p => ({ ...p, logoUrl: '' }));
    const settings = await (await fetch('/api/reports/hospital-settings').then(r => r.json())).settings;
    if (settings) {
      await fetch('/api/reports/hospital-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, logoUrl: '' }),
      });
    }
    toast.success('Logo removed');
  };

  const addFinding = async () => {
    if (!newLabel || !newText) return;
    await fetch('/api/reports/finding-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyRegion: selectedRegion, label: newLabel, text: newText, isAbnormal: newAbnormal }),
    });
    setNewLabel(''); setNewText(''); setNewAbnormal(false);
    loadFindings();
    toast.success(`Added "${newLabel}" to ${selectedRegion}`);
  };

  const deleteFinding = async (id: string) => {
    await fetch(`/api/reports/finding-templates?id=${id}`, { method: 'DELETE' });
    loadFindings();
  };

  const regionFindings = findings[selectedRegion] || [];

  const handleToggle = (field: string) => {
    setHospital(p => ({ ...p, [field]: !p[field as keyof typeof p] }));
  };

  const handleSelect = (field: string, value: string) => {
    setHospital(p => ({ ...p, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure branding, print layout, and finding templates</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {([
          { key: 'branding', label: 'Branding', icon: Building2 },
          { key: 'layout', label: 'Print Layout', icon: Printer },
          { key: 'radiologist', label: 'Radiologist', icon: Stethoscope },
          { key: 'findings', label: 'Findings', icon: FileCheck },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSettingsSection(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeSettingsSection === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ==================== BRANDING ==================== */}
      {activeSettingsSection === 'branding' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Hospital Branding</CardTitle>
            <CardDescription>Shown on report header and print</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div>
              <Label className="text-sm font-medium">Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-white cursor-pointer hover:border-primary/50 transition-colors shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {hospital.logoUrl ? (
                    <img
                      src={hospital.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[10px] mt-1">Upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm" disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                      Upload Logo
                    </Button>
                    {hospital.logoUrl && (
                      <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive">
                        <X className="w-3.5 h-3.5 mr-1.5" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, or SVG. Recommended: square, white background, 200x200px+</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Hospital Name</Label>
                <Input value={hospital.hospitalName} onChange={e => setHospital(p => ({ ...p, hospitalName: e.target.value }))} placeholder="CARE Diagnostics" />
              </div>
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input value={hospital.tagline} onChange={e => setHospital(p => ({ ...p, tagline: e.target.value }))} placeholder="Precision. Compassion. Care." />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={hospital.phone} onChange={e => setHospital(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={hospital.address} onChange={e => setHospital(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={hospital.website} onChange={e => setHospital(p => ({ ...p, website: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={hospital.email} onChange={e => setHospital(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Header Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={hospital.reportHeaderColor} onChange={e => setHospital(p => ({ ...p, reportHeaderColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
                  <Input value={hospital.reportHeaderColor} onChange={e => setHospital(p => ({ ...p, reportHeaderColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Footer Message</Label>
                <Input value={hospital.footerMessage} onChange={e => setHospital(p => ({ ...p, footerMessage: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== PRINT LAYOUT ==================== */}
      {activeSettingsSection === 'layout' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Print Layout</CardTitle>
            <CardDescription>Choose a layout preset, then customize section visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Layout Preset Selection */}
            <div>
              <Label className="text-sm font-medium mb-3">Layout Preset</Label>
              <div className="grid sm:grid-cols-3 gap-3">
                {LAYOUT_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setHospital(p => ({ ...p, reportLayout: preset.id }));
                    }}
                    className={`
                      text-left rounded-lg border-2 p-3 transition-all cursor-pointer
                      ${hospital.reportLayout === preset.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <p className="font-semibold text-sm">{preset.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{preset.desc}</p>
                    <pre className="mt-2 text-[9px] leading-tight text-muted-foreground font-mono whitespace-pre">{preset.preview}</pre>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Section Visibility Toggles */}
            <div>
              <Label className="text-sm font-medium mb-3">Section Visibility</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  { field: 'showTechnique', label: 'Show Technique' },
                  { field: 'showComparison', label: 'Show Comparison' },
                  { field: 'showClinicalInfo', label: 'Show Clinical Info' },
                  { field: 'showSignature', label: 'Show Signature Area' },
                  { field: 'showFooterMessage', label: 'Show Footer Message' },
                  { field: 'showAccreditation', label: 'Show Accreditation' },
                ] as const).map(({ field, label }) => (
                  <div key={field} className="flex items-center justify-between py-2 px-3 rounded-md border border-gray-200">
                    <Label className="text-sm cursor-pointer" onClick={() => handleToggle(field)}>{label}</Label>
                    <Switch checked={hospital[field as keyof typeof hospital] as boolean} onCheckedChange={() => handleToggle(field)} />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Style Options */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Patient Info Columns</Label>
                <Select value={hospital.patientColumns} onValueChange={v => handleSelect('patientColumns', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Columns</SelectItem>
                    <SelectItem value="2">2 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Impression Style</Label>
                <Select value={hospital.impressionStyle} onValueChange={v => handleSelect('impressionStyle', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bordered">Bordered Box</SelectItem>
                    <SelectItem value="underlined">Underlined</SelectItem>
                    <SelectItem value="plain">Plain Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Header Style</Label>
                <Select value={hospital.headerStyle} onValueChange={v => handleSelect('headerStyle', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Bar</SelectItem>
                    <SelectItem value="minimal">Minimal Line</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== RADIOLOGIST ==================== */}
      {activeSettingsSection === 'radiologist' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Radiologist Details</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={hospital.radiologistName} onChange={e => setHospital(p => ({ ...p, radiologistName: e.target.value }))} placeholder="Dr. John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Qualification</Label>
              <Input value={hospital.radiologistQualification} onChange={e => setHospital(p => ({ ...p, radiologistQualification: e.target.value }))} placeholder="MD, DMRD, FICR" />
            </div>
            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <Input value={hospital.radiologistRegNumber} onChange={e => setHospital(p => ({ ...p, radiologistRegNumber: e.target.value }))} placeholder="KMC 12345" />
            </div>
            <div className="space-y-1.5">
              <Label>Accreditation</Label>
              <Input value={hospital.accreditation} onChange={e => setHospital(p => ({ ...p, accreditation: e.target.value }))} placeholder="NABL" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== FINDINGS ==================== */}
      {activeSettingsSection === 'findings' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><FileCheck className="w-4 h-4" /> Quick-Select Finding Templates</CardTitle>
            <CardDescription>Per-region checkboxes. Red = abnormal. Green = normal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BODY_REGIONS.map(r => (
                  <SelectItem key={r} value={r}>
                    {r}
                    {(findings[r] || []).length > 0 && (
                      <span className="ml-2 text-muted-foreground">({findings[r].length})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ScrollArea className="max-h-72">
              <div className="space-y-1">
                {regionFindings.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 py-2 px-3 rounded-md border text-sm group">
                    <span className={`w-2 h-2 rounded-full ${f.isAbnormal ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="flex-1 font-medium">{f.label}</span>
                    <span className="flex-1 text-xs text-muted-foreground truncate hidden sm:block">{f.text}</span>
                    {f.isDefault && <Badge variant="secondary" className="text-[9px]">default</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteFinding(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {regionFindings.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No findings for {selectedRegion}</p>
                )}
              </div>
            </ScrollArea>

            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Finding for {selectedRegion}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label (checkbox text)</Label>
                  <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Disc bulge" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Full Finding Text</Label>
                  <Input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Posterior disc bulge noted at L4-L5 level." />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={newAbnormal} onCheckedChange={setNewAbnormal} />
                  <Label className="text-xs">Abnormal finding (red)</Label>
                </div>
                <div className="flex-1" />
                <Button size="sm" onClick={addFinding} disabled={!newLabel || !newText}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button — always visible */}
      <Button onClick={saveHospital} disabled={loading} className="w-full sm:w-auto" size="lg">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save All Settings
      </Button>
    </div>
  );
}