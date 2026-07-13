'use client';

import type { MriReport } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  User,
  Calendar,
  FileText,
  Activity,
  Hash,
  Stethoscope,
  Pill,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-amber-100 text-amber-800',
  Final: 'bg-emerald-100 text-emerald-800',
  Amended: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  report: MriReport;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ReportViewer({ report, onBack, onEdit, onDelete }: Props) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MRI Report - ${report.patientName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 18pt; font-weight: bold; margin-bottom: 4px; }
          .header .subtitle { font-size: 10pt; color: #666; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .info-section { margin-bottom: 20px; }
          .info-section h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; color: #444; }
          .info-row { display: flex; margin-bottom: 4px; font-size: 10.5pt; }
          .info-label { font-weight: bold; width: 160px; color: #555; }
          .info-value { flex: 1; }
          .content-section { margin-bottom: 20px; }
          .content-section h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; color: #444; }
          .content-section p { font-size: 10.5pt; line-height: 1.6; white-space: pre-wrap; }
          .impression { background: #f8f8f8; border-left: 3px solid #333; padding: 12px 16px; margin-top: 8px; }
          .footer { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9pt; color: #888; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: bold; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MAGNETIC RESONANCE IMAGING REPORT</h1>
          <div class="subtitle">${report.bodyRegion} — ${report.studyType}</div>
        </div>
        
        <div class="two-col">
          <div class="info-section">
            <h3>Patient Information</h3>
            <div class="info-row"><span class="info-label">Patient Name:</span><span class="info-value">${report.patientName}</span></div>
            ${report.patientId ? `<div class="info-row"><span class="info-label">Patient ID:</span><span class="info-value">${report.patientId}</span></div>` : ''}
            ${report.patientAge ? `<div class="info-row"><span class="info-label">Age:</span><span class="info-value">${report.patientAge} years</span></div>` : ''}
            ${report.patientGender ? `<div class="info-row"><span class="info-label">Gender:</span><span class="info-value">${report.patientGender}</span></div>` : ''}
          </div>
          <div class="info-section">
            <h3>Study Information</h3>
            <div class="info-row"><span class="info-label">Study Date:</span><span class="info-value">${report.studyDate ? format(new Date(report.studyDate), 'MMMM d, yyyy') : 'N/A'}</span></div>
            ${report.accessionNumber ? `<div class="info-row"><span class="info-label">Accession #:</span><span class="info-value">${report.accessionNumber}</span></div>` : ''}
            ${report.reportNumber ? `<div class="info-row"><span class="info-label">Report #:</span><span class="info-value">${report.reportNumber}</span></div>` : ''}
            <div class="info-row"><span class="info-label">Modality:</span><span class="info-value">${report.modality}</span></div>
            <div class="info-row"><span class="info-label">Body Region:</span><span class="info-value">${report.bodyRegion}</span></div>
            <div class="info-row"><span class="info-label">Study Type:</span><span class="info-value">${report.studyType}</span></div>
            ${report.scannerModel ? `<div class="info-row"><span class="info-label">Scanner:</span><span class="info-value">${report.scannerModel}</span></div>` : ''}
            ${report.fieldStrength ? `<div class="info-row"><span class="info-label">Field Strength:</span><span class="info-value">${report.fieldStrength}</span></div>` : ''}
          </div>
        </div>
        
        ${report.referringDoctor || report.clinicalIndication ? `
        <div class="info-section">
          <h3>Clinical Information</h3>
          ${report.referringDoctor ? `<div class="info-row"><span class="info-label">Referring Physician:</span><span class="info-value">${report.referringDoctor}</span></div>` : ''}
          ${report.clinicalIndication ? `<div class="info-row"><span class="info-label">Indication:</span><span class="info-value">${report.clinicalIndication}</span></div>` : ''}
          ${report.clinicalHistory ? `<div class="info-row"><span class="info-label">History:</span><span class="info-value">${report.clinicalHistory}</span></div>` : ''}
        </div>
        ` : ''}
        
        ${report.contrastAdministered ? `
        <div class="info-section">
          <h3>Contrast Administration</h3>
          <div class="info-row"><span class="info-label">Agent:</span><span class="info-value">${report.contrastAgent || 'Not specified'}</span></div>
          <div class="info-row"><span class="info-label">Volume:</span><span class="info-value">${report.contrastVolume || 'Not specified'}</span></div>
          <div class="info-row"><span class="info-label">Route:</span><span class="info-value">${report.contrastRoute || 'IV'}</span></div>
        </div>
        ` : ''}
        
        <div class="content-section">
          <h3>Technique</h3>
          <p>${report.technique || 'Standard MRI protocol was performed.'}</p>
        </div>
        
        ${report.comparison ? `
        <div class="content-section">
          <h3>Comparison</h3>
          <p>${report.comparison}</p>
        </div>
        ` : ''}
        
        <div class="content-section">
          <h3>Findings</h3>
          <p>${report.findings}</p>
        </div>
        
        <div class="content-section">
          <h3>Impression</h3>
          <div class="impression">
            <p>${report.impression}</p>
          </div>
        </div>
        
        <div class="footer">
          <div>Status: <span class="badge ${STATUS_COLORS[report.reportStatus] || ''}">${report.reportStatus}</span></div>
          <div>Generated: ${format(new Date(report.createdAt), 'MMMM d, yyyy h:mm a')}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[calc(100vh-200px)]">
        <Card className="max-w-4xl mx-auto">
          {/* Report Header */}
          <CardHeader className="text-center pb-2 border-b-2 border-double border-primary/30">
            <CardTitle className="text-xl tracking-wide uppercase">
              Magnetic Resonance Imaging Report
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="secondary">{report.bodyRegion}</Badge>
              <span className="text-muted-foreground">—</span>
              <Badge variant="outline">{report.studyType}</Badge>
              <Badge className={STATUS_COLORS[report.reportStatus] || ''}>{report.reportStatus}</Badge>
              {report.priority !== 'Routine' && (
                <Badge variant="destructive" className="text-[10px]">
                  {report.priority === 'STAT' && <Zap className="w-3 h-3 mr-1" />}
                  {report.priority}
                </Badge>
              )}
            </div>
            {report.reportNumber && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{report.reportNumber}</p>
            )}
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Two Column Info */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Patient Info */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Patient Information
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="w-32 text-muted-foreground shrink-0">Name</dt>
                    <dd className="font-medium">{report.patientName}</dd>
                  </div>
                  {report.patientId && (
                    <div className="flex">
                      <dt className="w-32 text-muted-foreground shrink-0">Patient ID</dt>
                      <dd className="font-mono text-xs">{report.patientId}</dd>
                    </div>
                  )}
                  {report.patientAge && (
                    <div className="flex">
                      <dt className="w-32 text-muted-foreground shrink-0">Age</dt>
                      <dd>{report.patientAge} years</dd>
                    </div>
                  )}
                  {report.patientGender && (
                    <div className="flex">
                      <dt className="w-32 text-muted-foreground shrink-0">Gender</dt>
                      <dd>{report.patientGender}</dd>
                    </div>
                  )}
                  {report.referringDoctor && (
                    <div className="flex">
                      <dt className="w-32 text-muted-foreground shrink-0">Referring Dr.</dt>
                      <dd>{report.referringDoctor}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Study Info */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Study Information
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="w-32 text-muted-foreground shrink-0">Study Date</dt>
                    <dd>{report.studyDate ? format(new Date(report.studyDate), 'MMMM d, yyyy') : 'N/A'}</dd>
                  </div>
                  {report.accessionNumber && (
                    <div className="flex">
                      <dt className="w-32 text-muted-foreground shrink-0">Accession #</dt>
                      <dd className="font-mono text-xs">{report.accessionNumber}</dd>
                    </div>
                  )}
                  <div className="flex">
                    <dt className="w-32 text-muted-foreground shrink-0">Modality</dt>
                    <dd>{report.modality}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-muted-foreground shrink-0">Region / Type</dt>
                    <dd>{report.bodyRegion} — {report.studyType}</dd>
                  </div>
                  {report.scannerModel && (
                    <div className="flex">
                      <dt className="w-32 text-muted-foreground shrink-0">Scanner</dt>
                      <dd>{report.scannerModel}{report.fieldStrength ? ` (${report.fieldStrength})` : ''}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Clinical Info */}
            {(report.clinicalIndication || report.clinicalHistory) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" /> Clinical Information
                  </h3>
                  {report.clinicalIndication && (
                    <div className="flex text-sm mb-1">
                      <dt className="w-32 text-muted-foreground shrink-0">Indication</dt>
                      <dd>{report.clinicalIndication}</dd>
                    </div>
                  )}
                  {report.clinicalHistory && (
                    <div className="flex text-sm">
                      <dt className="w-32 text-muted-foreground shrink-0">History</dt>
                      <dd>{report.clinicalHistory}</dd>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Contrast */}
            {report.contrastAdministered && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5" /> Contrast Administration
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Agent</span>
                      <p>{report.contrastAgent || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Volume</span>
                      <p>{report.contrastVolume || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Route</span>
                      <p>{report.contrastRoute || 'IV'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Technique */}
            {report.technique && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Technique
                </h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.technique}</p>
              </div>
            )}

            {/* Comparison */}
            {report.comparison && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Comparison
                </h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.comparison}</p>
              </div>
            )}

            {/* Findings */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Findings
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 border">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.findings}</p>
              </div>
            </div>

            {/* Impression */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Impression
              </h3>
              <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
                <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{report.impression}</p>
              </div>
            </div>

            {/* Footer */}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Created: {format(new Date(report.createdAt), 'MMMM d, yyyy h:mm a')}</span>
              <span>Updated: {format(new Date(report.updatedAt), 'MMMM d, yyyy h:mm a')}</span>
            </div>
          </CardContent>
        </Card>
      </ScrollArea>
    </div>
  );
}