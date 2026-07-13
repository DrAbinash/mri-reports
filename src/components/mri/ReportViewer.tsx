'use client';

import { useState, useEffect } from 'react';
import type { MriReport } from '@/lib/store';
import type { FindingItem } from './FindingCheckboxes';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  Download,
  Settings,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface HospitalInfo {
  hospitalName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  radiologistName: string | null;
  radiologistQualification: string | null;
  radiologistRegNumber: string | null;
  accreditation: string | null;
  accreditationNumber: string | null;
  footerMessage: string;
  reportHeaderColor: string;
}

interface Props {
  report: MriReport;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ReportViewer({ report, onBack, onEdit, onDelete }: Props) {
  const [hospital, setHospital] = useState<HospitalInfo | null>(null);

  useEffect(() => {
    fetch('/api/reports/hospital-settings')
      .then(r => r.json())
      .then(d => setHospital(d.settings))
      .catch(() => {});
  }, []);

  const handlePrint = () => window.print();

  const handlePdf = () => {
    handlePrint();
  };

  const h = hospital || {
    hospitalName: 'MRI Report Center',
    tagline: null, address: null, phone: null, website: null, email: null,
    radiologistName: null, radiologistQualification: null, radiologistRegNumber: null,
    accreditation: null, accreditationNumber: null,
    footerMessage: 'Thank you for choosing our services.',
    reportHeaderColor: '#1e3a5f',
  };

  const headerColor = h.reportHeaderColor || '#1e3a5f';

  // Parse findings into bullet points
  const findingLines = report.findings
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.replace(/^[-•*]\s*/, '').trim());

  const impressionLines = report.impression
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.replace(/^[-•*\d.)]+\s*/, '').trim());

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="flex items-center gap-2 no-print mb-4 flex-wrap">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={handlePdf} className="gap-2">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Pencil className="w-4 h-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" /> Delete
        </Button>
      </div>

      {/* A4 Report Card */}
      <div className="report-page" id="report-printable">
        {/* === HEADER === */}
        <div className="report-header" style={{ backgroundColor: headerColor }}>
          <div className="report-header-inner">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                {h.hospitalName.charAt(0)}
              </div>
              <div>
                <h1 className="text-white font-bold text-xl tracking-wide leading-tight">
                  {h.hospitalName.toUpperCase()}
                </h1>
                {h.tagline && (
                  <p className="text-white/70 text-xs tracking-widest uppercase mt-0.5">{h.tagline}</p>
                )}
              </div>
            </div>
            <div className="report-header-contact text-right text-white/80 text-[10px] leading-relaxed">
              {h.address && <div>{h.address}</div>}
              {h.phone && <div>Tel: {h.phone}</div>}
              {h.email && <div>{h.email}</div>}
              {h.website && <div>{h.website}</div>}
            </div>
          </div>
        </div>

        {/* === STUDY TITLE === */}
        <div className="report-study-title">
          <span className="report-modality-badge" style={{ backgroundColor: headerColor }}>
            {report.modality} {report.bodyRegion}
          </span>
          <h2 className="report-title-text">
            {report.bodyRegion} — {report.studyType}
          </h2>
          {report.contrastAdministered && (
            <span className="report-contrast-badge">+ Contrast</span>
          )}
        </div>

        {/* === PATIENT INFO === */}
        <div className="report-patient-box">
          <div className="report-patient-grid">
            <div className="report-patient-field">
              <span className="report-patient-label">Patient Name</span>
              <span className="report-patient-value font-semibold">{report.patientName}</span>
            </div>
            <div className="report-patient-field">
              <span className="report-patient-label">Age / Gender</span>
              <span className="report-patient-value">
                {report.patientAge && `${report.patientAge} yrs`}
                {report.patientAge && report.patientGender && ' / '}
                {report.patientGender}
              </span>
            </div>
            {report.patientId && (
              <div className="report-patient-field">
                <span className="report-patient-label">Patient ID</span>
                <span className="report-patient-value font-mono text-xs">{report.patientId}</span>
              </div>
            )}
            <div className="report-patient-field">
              <span className="report-patient-label">Study Date</span>
              <span className="report-patient-value">
                {report.studyDate ? format(new Date(report.studyDate), 'dd MMM yyyy') : '—'}
              </span>
            </div>
            {report.referringDoctor && (
              <div className="report-patient-field">
                <span className="report-patient-label">Referring Physician</span>
                <span className="report-patient-value">{report.referringDoctor}</span>
              </div>
            )}
            <div className="report-patient-field">
              <span className="report-patient-label">Accession No.</span>
              <span className="report-patient-value font-mono text-xs">{report.accessionNumber || '—'}</span>
            </div>
          </div>
        </div>

        {/* === CLINICAL INFO (if any) === */}
        {(report.clinicalIndication || report.clinicalHistory) && (
          <div className="report-section">
            <div className="report-patient-box">
              <div className="report-patient-grid">
                {report.clinicalIndication && (
                  <div className="report-patient-field col-span-full">
                    <span className="report-patient-label">Clinical Indication</span>
                    <span className="report-patient-value">{report.clinicalIndication}</span>
                  </div>
                )}
                {report.clinicalHistory && (
                  <div className="report-patient-field col-span-full">
                    <span className="report-patient-label">Clinical History</span>
                    <span className="report-patient-value">{report.clinicalHistory}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === TECHNIQUE === */}
        {report.technique && (
          <div className="report-section">
            <h3 className="report-section-heading">Technique</h3>
            <p className="report-body-text">{report.technique}</p>
          </div>
        )}

        {/* === COMPARISON === */}
        {report.comparison && (
          <div className="report-section">
            <h3 className="report-section-heading">Comparison</h3>
            <p className="report-body-text">{report.comparison}</p>
          </div>
        )}

        {/* === FINDINGS === */}
        <div className="report-section">
          <h3 className="report-section-heading">
            MRI {report.bodyRegion.toUpperCase()} FINDINGS
          </h3>
          <ul className="report-findings-list">
            {findingLines.map((line, i) => (
              <li key={i} className="report-finding-item">
                <span className="report-bullet" style={{ backgroundColor: headerColor }} />
                <span className="report-finding-text">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* === IMPRESSION === */}
        <div className="report-impression-box" style={{ borderLeftColor: headerColor }}>
          <h3 className="report-impression-heading">IMPRESSION</h3>
          <ol className="report-impression-list">
            {impressionLines.map((line, i) => (
              <li key={i} className="report-impression-item">{line}</li>
            ))}
          </ol>
        </div>

        {/* === FOOTER === */}
        <div className="report-footer">
          <div className="report-footer-bar" style={{ backgroundColor: headerColor }} />

          <div className="report-footer-content">
            <div className="report-signature-area">
              {h.radiologistName && (
                <div className="report-signature-block">
                  <div className="report-signature-line" />
                  <p className="report-signature-name">{h.radiologistName}</p>
                  {h.radiologistQualification && (
                    <p className="report-signature-qual">{h.radiologistQualification}</p>
                  )}
                  {h.radiologistRegNumber && (
                    <p className="report-signature-reg">Reg. No: {h.radiologistRegNumber}</p>
                  )}
                </div>
              )}
            </div>
            <div className="report-footer-meta">
              {h.accreditation && (
                <p className="report-accreditation">
                  {h.accreditation}{h.accreditationNumber && ` — ${h.accreditationNumber}`}
                </p>
              )}
              <p className="report-timestamp">
                Report generated: {format(new Date(report.createdAt), 'dd MMM yyyy, hh:mm a')}
              </p>
              {report.reportNumber && (
                <p className="report-number">Report No: {report.reportNumber}</p>
              )}
            </div>
          </div>

          <div className="report-thank-you" style={{ color: headerColor }}>
            {h.footerMessage.toUpperCase()}
          </div>
        </div>
      </div>
    </>
  );
}