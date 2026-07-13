import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Predefined body regions
const BODY_REGIONS = [
  'Brain',
  'Spine - Cervical',
  'Spine - Thoracic',
  'Spine - Lumbar',
  'Spine - Sacral',
  'Knee',
  'Shoulder',
  'Hip',
  'Elbow',
  'Wrist',
  'Ankle',
  'Foot',
  'Hand',
  'Abdomen',
  'Pelvis',
  'Chest',
  'Neck',
  'Cardiac',
  'Breast',
  'Prostate',
  'Other',
];

// Predefined study types per region
const STUDY_TYPES: Record<string, string[]> = {
  Brain: ['T1', 'T2', 'FLAIR', 'DWI/ADC', 'T1-Contrast', 'GRE/SWI', 'MRA Brain', 'MRV Brain', 'DTI', 'Spectroscopy', 'Functional MRI'],
  'Spine - Cervical': ['T1 Sagittal', 'T2 Sagittal', 'T2 Axial', 'STIR', 'T1-Contrast', 'T2 Coronal'],
  'Spine - Thoracic': ['T1 Sagittal', 'T2 Sagittal', 'T2 Axial', 'STIR', 'T1-Contrast'],
  'Spine - Lumbar': ['T1 Sagittal', 'T2 Sagittal', 'T2 Axial', 'STIR', 'T1-Contrast', 'T2 Coronal', 'Nerve Root'],
  'Spine - Sacral': ['T1', 'T2', 'STIR', 'T1-Contrast'],
  Knee: ['T1', 'T2 Fat Sat', 'PD Fat Sat', 'Proton Density', '3D Cartilage', 'T1-Contrast', 'MRA'],
  Shoulder: ['T1', 'T2 Fat Sat', 'PD Fat Sat', 'Proton Density', 'T1-Contrast', 'MRA', 'AR-MRI'],
  Hip: ['T1', 'T2', 'STIR', 'T2 Fat Sat', 'PD', 'T1-Contrast', 'MR Arthrogram'],
  Elbow: ['T1', 'T2 Fat Sat', 'PD Fat Sat', 'Proton Density', 'T1-Contrast'],
  Wrist: ['T1', 'T2', 'T2 Fat Sat', 'PD', 'T1-Contrast', 'MR Arthrogram'],
  Ankle: ['T1', 'T2 Fat Sat', 'PD Fat Sat', 'T1-Contrast', 'MR Arthrogram'],
  Foot: ['T1', 'T2 Fat Sat', 'PD Fat Sat', 'T1-Contrast'],
  Hand: ['T1', 'T2 Fat Sat', 'PD Fat Sat', 'T1-Contrast'],
  Abdomen: ['T1', 'T2', 'T2 Fat Sat', 'DWI/ADC', 'T1-Contrast', 'MRCP', 'Dynamic Contrast'],
  Pelvis: ['T1', 'T2', 'T2 Fat Sat', 'DWI/ADC', 'T1-Contrast', 'Dynamic Contrast'],
  Chest: ['T1', 'T2', 'T2 Fat Sat', 'DWI/ADC', 'T1-Contrast', 'Cardiac Gating'],
  Neck: ['T1', 'T2', 'T2 Fat Sat', 'STIR', 'T1-Contrast', 'DWI/ADC'],
  Cardiac: ['Cine SSFP', 'T1 Mapping', 'T2 Mapping', 'LGE', 'Flow', 'T1-Contrast', 'Perfusion'],
  Breast: ['T1', 'T2', 'DWI/ADC', 'T1-Contrast', 'Dynamic Contrast', 'Spectroscopy'],
  Prostate: ['T2', 'DWI/ADC', 'DCE', 'Spectroscopy', 'T1-Contrast'],
  Other: ['T1', 'T2', 'STIR', 'Fat Sat', 'T1-Contrast', 'DWI/ADC', 'MRA'],
};

// Report templates for auto-filling
const REPORT_TEMPLATES = [
  {
    name: 'Brain MRI - Standard',
    bodyRegion: 'Brain',
    technique: 'MRI brain was performed using a {fieldStrength} scanner. Sequences included sagittal T1, axial T1, axial T2, axial FLAIR, axial DWI/ADC, axial GRE/SWI, and coronal T2.',
    findings: '',
    impression: '',
  },
  {
    name: 'Brain MRI - With Contrast',
    bodyRegion: 'Brain',
    technique: 'MRI brain was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner. Sequences included sagittal T1, axial T1 pre/post contrast, axial T2, axial FLAIR, axial DWI/ADC, and coronal T2.',
    findings: '',
    impression: '',
  },
  {
    name: 'Lumbar Spine MRI - Standard',
    bodyRegion: 'Spine - Lumbar',
    technique: 'MRI lumbar spine was performed using a {fieldStrength} scanner. Sequences included sagittal T1, sagittal T2, axial T2 through each disc level.',
    findings: '',
    impression: '',
  },
  {
    name: 'Knee MRI - Standard',
    bodyRegion: 'Knee',
    technique: 'MRI of the {side} knee was performed using a {fieldStrength} scanner with a dedicated knee coil. Sequences included sagittal T1, sagittal PD fat sat, coronal PD fat sat, and axial PD fat sat.',
    findings: '',
    impression: '',
  },
  {
    name: 'Shoulder MRI - Standard',
    bodyRegion: 'Shoulder',
    technique: 'MRI of the {side} shoulder was performed using a {fieldStrength} scanner with a dedicated shoulder coil. Sequences included coronal T1, coronal PD fat sat, sagittal T2 fat sat, and axial PD fat sat.',
    findings: '',
    impression: '',
  },
  {
    name: 'Abdomen MRI - With Contrast',
    bodyRegion: 'Abdomen',
    technique: 'MRI abdomen was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner. Sequences included T1 in-phase/out-of-phase, T2 fat sat, DWI/ADC, and dynamic post-contrast T1 fat sat (arterial, portal venous, delayed phases).',
    findings: '',
    impression: '',
  },
];

// GET /api/reports/templates - Get regions, study types, and templates
export async function GET() {
  try {
    // Get custom templates from DB
    const customTemplates = await db.reportTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      bodyRegions: BODY_REGIONS,
      studyTypes: STUDY_TYPES,
      defaultTemplates: REPORT_TEMPLATES,
      customTemplates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}