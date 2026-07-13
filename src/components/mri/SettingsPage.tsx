'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Save, Plus, Trash2, Loader2, Building2, Stethoscope, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

const BODY_REGIONS = [
  'Brain', 'Spine - Cervical', 'Spine - Thoracic', 'Spine - Lumbar',
  'Spine - Sacral', 'Knee', 'Shoulder', 'Hip', 'Abdomen',
  'Pelvis', 'Chest', 'Neck', 'Cardiac', 'Breast', 'Prostate', 'Other',
];

export default function SettingsPage() {
  const [hospital, setHospital] = useState({
    hospitalName: '', tagline: '', address: '', phone: '', website: '', email: '',
    radiologistName: '', radiologistQualification: '', radiologistRegNumber: '',
    accreditation: '', accreditationNumber: '',
    footerMessage: 'Thank you for choosing our services.',
    reportHeaderColor: '#1e3a5f',
  });
  const [findings, setFindings] = useState<Record<string, any[]>>({});
  const [selectedRegion, setSelectedRegion] = useState('Brain');
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [newAbnormal, setNewAbnormal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load hospital settings
  useEffect(() => {
    fetch('/api/reports/hospital-settings').then(r => r.json()).then(d => {
      if (d.settings) setHospital(d.settings);
    });
    // Seed and load findings
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure hospital branding, radiologist info, and finding templates</p>
      </div>

      {/* Hospital Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Hospital / Diagnostic Center</CardTitle>
          <CardDescription>Branding shown on printed reports</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
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
              <input type="color" value={hospital.reportHeaderColor} onChange={e => setHospital(p => ({ ...p, reportHeaderColor: e.target.value }))} className="w-10 h-10 rounded cursor-pointer" />
              <Input value={hospital.reportHeaderColor} onChange={e => setHospital(p => ({ ...p, reportHeaderColor: e.target.value }))} className="flex-1" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Footer Message</Label>
            <Input value={hospital.footerMessage} onChange={e => setHospital(p => ({ ...p, footerMessage: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Radiologist Info */}
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

      <Button onClick={saveHospital} disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save All Settings
      </Button>

      <Separator />

      {/* Finding Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><FileCheck className="w-4 h-4" /> Quick-Select Finding Templates</CardTitle>
          <CardDescription>Configure per-region quick-select checkboxes. Abnormal findings are highlighted red.</CardDescription>
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
                <Label className="text-xs">Abnormal finding (red highlight)</Label>
              </div>
              <div className="flex-1" />
              <Button size="sm" onClick={addFinding} disabled={!newLabel || !newText}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}