// Technique auto-generation for MRI studies
// Maps bodyRegion → studyType → technique description

export interface Study {
  bodyRegion: string;
  studyType: string;
}

// Sequence descriptions per study type, per body region
const SEQUENCE_MAP: Record<string, Record<string, string>> = {
  'Brain': {
    'T1': 'sagittal T1-weighted, axial T1-weighted',
    'T2': 'axial T2-weighted',
    'FLAIR': 'axial FLAIR',
    'DWI/ADC': 'axial DWI with ADC map',
    'GRE/SWI': 'axial gradient echo/SWI',
    'T1-Contrast': 'axial and coronal T1-weighted pre- and post-contrast',
    'MRA Brain': '3D time-of-flight MRA of intracranial circulation',
    'MRV Brain': '2D time-of-flight MR venography',
    'DTI': 'diffusion tensor imaging (DTI) with color-coded FA maps and tractography',
    'Spectroscopy': 'multivoxel MR spectroscopy',
    'Functional MRI': 'blood oxygen level dependent (BOLD) functional MRI',
  },
  'Spine - Cervical': {
    'T1 Sagittal': 'sagittal T1-weighted',
    'T2 Sagittal': 'sagittal T2-weighted',
    'T2 Axial': 'axial T2-weighted through each disc level from C2-C3 to C7-T1',
    'STIR': 'sagittal STIR',
    'T1-Contrast': 'sagittal and axial T1-weighted pre- and post-contrast',
    'T2 Coronal': 'coronal T2-weighted',
  },
  'Spine - Thoracic': {
    'T1 Sagittal': 'sagittal T1-weighted',
    'T2 Sagittal': 'sagittal T2-weighted',
    'T2 Axial': 'axial T2-weighted through each disc level',
    'STIR': 'sagittal STIR',
    'T1-Contrast': 'sagittal and axial T1-weighted pre- and post-contrast',
  },
  'Spine - Lumbar': {
    'T1 Sagittal': 'sagittal T1-weighted',
    'T2 Sagittal': 'sagittal T2-weighted',
    'T2 Axial': 'axial T2-weighted through each disc level from L1-L2 to L5-S1',
    'STIR': 'sagittal STIR',
    'T1-Contrast': 'sagittal and axial T1-weighted pre- and post-contrast',
    'T2 Coronal': 'coronal T2-weighted',
    'Nerve Root': 'oblique coronal T2-weighted for bilateral lumbar nerve root visualization',
  },
  'Spine - Sacral': {
    'T1': 'sagittal and coronal T1-weighted',
    'T2': 'sagittal and coronal T2-weighted',
    'STIR': 'sagittal STIR',
    'T1-Contrast': 'sagittal T1-weighted pre- and post-contrast',
  },
  'Knee': {
    'T1': 'sagittal T1-weighted',
    'T2 Fat Sat': 'sagittal T2-weighted fat saturation',
    'PD Fat Sat': 'sagittal, coronal, and axial proton density-weighted fat saturation',
    'Proton Density': 'sagittal and coronal proton density-weighted',
    '3D Cartilage': '3D water excitation cartilage mapping',
    'T1-Contrast': 'sagittal and axial T1-weighted pre- and post-contrast',
    'MRA': 'MRA of popliteal and tibial vessels',
  },
  'Shoulder': {
    'T1': 'coronal and sagittal T1-weighted',
    'T2 Fat Sat': 'coronal, sagittal, and axial T2-weighted fat saturation',
    'PD Fat Sat': 'coronal, sagittal, and axial proton density-weighted fat saturation',
    'Proton Density': 'coronal and axial proton density-weighted',
    'T1-Contrast': 'coronal and axial T1-weighted pre- and post-contrast (arthrogram)',
    'MRA': '3D MRA of shoulder vasculature',
    'AR-MRI': 'T1-weighted fat-suppressed pre- and post-arthrogram images in ABER, coronal, axial, and sagittal planes',
  },
  'Hip': {
    'T1': 'coronal T1-weighted',
    'T2': 'coronal and axial T2-weighted',
    'STIR': 'coronal STIR',
    'T2 Fat Sat': 'sagittal and axial T2-weighted fat saturation',
    'PD': 'coronal proton density-weighted',
    'T1-Contrast': 'coronal T1-weighted pre- and post-contrast',
    'MR Arthrogram': 'T1-weighted fat-suppressed pre- and post-arthrogram images in multiple planes',
  },
  'Elbow': {
    'T1': 'sagittal and coronal T1-weighted',
    'T2 Fat Sat': 'sagittal, coronal, and axial T2-weighted fat saturation',
    'PD Fat Sat': 'coronal and axial proton density-weighted fat saturation',
    'Proton Density': 'coronal and sagittal proton density-weighted',
    'T1-Contrast': 'sagittal T1-weighted pre- and post-contrast',
  },
  'Wrist': {
    'T1': 'coronal and sagittal T1-weighted',
    'T2': 'coronal and axial T2-weighted',
    'T2 Fat Sat': 'coronal and axial T2-weighted fat saturation',
    'PD': 'coronal proton density-weighted',
    'T1-Contrast': 'coronal T1-weighted pre- and post-contrast',
    'MR Arthrogram': 'T1-weighted fat-suppressed pre- and post-arthrogram images in multiple planes',
  },
  'Ankle': {
    'T1': 'sagittal and coronal T1-weighted',
    'T2 Fat Sat': 'sagittal, coronal, and axial T2-weighted fat saturation',
    'PD Fat Sat': 'coronal, sagittal, and axial proton density-weighted fat saturation',
    'T1-Contrast': 'sagittal T1-weighted pre- and post-contrast',
    'MR Arthrogram': 'T1-weighted fat-suppressed pre- and post-arthrogram images in multiple planes',
  },
  'Foot': {
    'T1': 'sagittal and coronal T1-weighted',
    'T2 Fat Sat': 'sagittal, coronal, and axial T2-weighted fat saturation',
    'PD Fat Sat': 'coronal and axial proton density-weighted fat saturation',
    'T1-Contrast': 'sagittal T1-weighted pre- and post-contrast',
  },
  'Hand': {
    'T1': 'coronal and sagittal T1-weighted',
    'T2 Fat Sat': 'coronal and axial T2-weighted fat saturation',
    'PD Fat Sat': 'coronal and axial proton density-weighted fat saturation',
    'T1-Contrast': 'coronal T1-weighted pre- and post-contrast',
  },
  'Abdomen': {
    'T1': 'T1-weighted in-phase and out-of-phase',
    'T2': 'axial T2-weighted',
    'T2 Fat Sat': 'axial T2-weighted fat saturation',
    'DWI/ADC': 'axial DWI with ADC map',
    'T1-Contrast': 'dynamic axial T1-weighted fat saturation pre-contrast, arterial (20s), portal venous (60s), and delayed (180s) phases',
    'MRCP': 'thick-slab and thin-slab 3D MRCP',
    'Dynamic Contrast': 'dynamic contrast-enhanced T1-weighted imaging with pharmacokinetic modeling',
  },
  'Pelvis': {
    'T1': 'axial T1-weighted',
    'T2': 'axial and sagittal T2-weighted',
    'T2 Fat Sat': 'axial T2-weighted fat saturation',
    'DWI/ADC': 'axial DWI with ADC map',
    'T1-Contrast': 'axial and sagittal T1-weighted fat saturation pre- and post-contrast',
    'Dynamic Contrast': 'dynamic contrast-enhanced T1-weighted imaging',
  },
  'Chest': {
    'T1': 'axial T1-weighted',
    'T2': 'axial T2-weighted',
    'T2 Fat Sat': 'axial T2-weighted fat saturation',
    'DWI/ADC': 'axial DWI with ADC map',
    'T1-Contrast': 'axial T1-weighted fat saturation pre- and post-contrast',
    'Cardiac Gating': 'ECG-gated cine steady-state free precession sequences in short axis, vertical and horizontal long axis views',
  },
  'Neck': {
    'T1': 'axial and sagittal T1-weighted',
    'T2': 'axial T2-weighted',
    'T2 Fat Sat': 'axial T2-weighted fat saturation',
    'STIR': 'coronal STIR',
    'T1-Contrast': 'axial and coronal T1-weighted fat saturation pre- and post-contrast',
    'DWI/ADC': 'axial DWI with ADC map',
  },
  'Cardiac': {
    'Cine SSFP': 'cine steady-state free precession in short axis (stack), 2-chamber, 3-chamber, and 4-chamber views',
    'T1 Mapping': 'native T1 mapping using MOLLI sequence in short axis mid-ventricular slice',
    'T2 Mapping': 'T2 mapping in short axis mid-ventricular slice',
    'LGE': 'late gadolinium enhancement (LGE) in short axis, 2-chamber, 3-chamber, and 4-chamber views, 10-15 minutes post-contrast',
    'Flow': 'phase-contrast flow quantification through aortic valve and pulmonary valve',
    'T1-Contrast': 'T1-weighted fat saturation pre- and post-contrast',
    'Perfusion': 'first-pass myocardial perfusion during adenosine stress and at rest, in 3 short-axis slices',
  },
  'Breast': {
    'T1': 'axial T1-weighted',
    'T2': 'axial T2-weighted',
    'DWI/ADC': 'axial DWI with ADC map',
    'T1-Contrast': 'dynamic bilateral axial T1-weighted fat saturation pre- and post-contrast (6-8 acquisitions over 8-10 minutes)',
    'Dynamic Contrast': 'dynamic contrast-enhanced MRI with kinetic curve analysis',
    'Spectroscopy': 'single-voxel MR spectroscopy',
  },
  'Prostate': {
    'T2': 'axial, coronal, and sagittal T2-weighted high-resolution',
    'DWI/ADC': 'axial DWI with ADC map (b-values 0, 400, 800, 1400)',
    'DCE': 'dynamic contrast-enhanced T1-weighted fat saturation with pharmacokinetic analysis',
    'Spectroscopy': '3D MR spectroscopic imaging of the peripheral zone',
    'T1-Contrast': 'axial T1-weighted fat saturation pre- and post-contrast',
  },
  'Other': {
    'T1': 'T1-weighted sequences in relevant planes',
    'T2': 'T2-weighted sequences in relevant planes',
    'STIR': 'STIR sequence',
    'Fat Sat': 'fat-suppressed sequences',
    'T1-Contrast': 'T1-weighted pre- and post-contrast',
    'DWI/ADC': 'DWI with ADC map',
    'MRA': 'MR angiography',
  },
};

// Base description templates per body region
const BASE_MAP: Record<string, string> = {
  'Brain': 'MRI brain was performed using a {fieldStrength} scanner.',
  'Spine - Cervical': 'MRI cervical spine was performed using a {fieldStrength} scanner.',
  'Spine - Thoracic': 'MRI thoracic spine was performed using a {fieldStrength} scanner.',
  'Spine - Lumbar': 'MRI lumbar spine was performed using a {fieldStrength} scanner.',
  'Spine - Sacral': 'MRI sacral spine/coccyx was performed using a {fieldStrength} scanner.',
  'Knee': 'MRI of the knee was performed using a {fieldStrength} scanner with a dedicated knee coil.',
  'Shoulder': 'MRI of the shoulder was performed using a {fieldStrength} scanner with a dedicated shoulder coil.',
  'Hip': 'MRI of the hip was performed using a {fieldStrength} scanner.',
  'Elbow': 'MRI of the elbow was performed using a {fieldStrength} scanner with a dedicated extremity coil.',
  'Wrist': 'MRI of the wrist was performed using a {fieldStrength} scanner with a dedicated wrist coil.',
  'Ankle': 'MRI of the ankle was performed using a {fieldStrength} scanner with a dedicated extremity coil.',
  'Foot': 'MRI of the foot was performed using a {fieldStrength} scanner with a dedicated extremity coil.',
  'Hand': 'MRI of the hand was performed using a {fieldStrength} scanner with a dedicated extremity coil.',
  'Abdomen': 'MRI abdomen was performed using a {fieldStrength} scanner.',
  'Pelvis': 'MRI pelvis was performed using a {fieldStrength} scanner.',
  'Chest': 'MRI chest was performed using a {fieldStrength} scanner.',
  'Neck': 'MRI neck was performed using a {fieldStrength} scanner.',
  'Cardiac': 'Cardiac MRI was performed using a {fieldStrength} scanner with ECG gating.',
  'Breast': 'Bilateral breast MRI was performed using a {fieldStrength} scanner with a dedicated breast coil.',
  'Prostate': 'Multiparametric MRI of the prostate was performed using a {fieldStrength} scanner with an endorectal/pelvic phased-array coil.',
  'Other': 'MRI was performed using a {fieldStrength} scanner.',
};

// Contrast prefix for body regions that commonly use contrast
const CONTRAST_PREFIX: Record<string, string> = {
  'Brain': 'MRI brain was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Spine - Cervical': 'MRI cervical spine was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Spine - Thoracic': 'MRI thoracic spine was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Spine - Lumbar': 'MRI lumbar spine was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Abdomen': 'MRI abdomen was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Pelvis': 'MRI pelvis was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Chest': 'MRI chest was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Neck': 'MRI neck was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner.',
  'Breast': 'Bilateral breast MRI was performed before and after intravenous administration of {contrastAgent} using a {fieldStrength} scanner with a dedicated breast coil.',
  'Cardiac': 'Cardiac MRI was performed using a {fieldStrength} scanner with ECG gating. Contrast was administered for late gadolinium enhancement.',
  'Prostate': 'Multiparametric MRI of the prostate was performed using a {fieldStrength} scanner with dynamic contrast enhancement using {contrastAgent}.',
};

/**
 * Generate technique text for a single study
 */
function techniqueForStudy(
  study: Study,
  fieldStrength: string,
  contrastAdministered: boolean,
  contrastAgent: string
): string {
  const fs = fieldStrength || '3T';
  const agent = contrastAgent || 'gadolinium-based contrast';

  const region = study.bodyRegion;
  const studyType = study.studyType;

  // 1. Start with base or contrast prefix
  let baseText: string;
  if (contrastAdministered && CONTRAST_PREFIX[region]) {
    baseText = CONTRAST_PREFIX[region]
      .replace('{fieldStrength}', fs)
      .replace('{contrastAgent}', agent);
  } else {
    baseText = (BASE_MAP[region] || BASE_MAP['Other'])
      .replace('{fieldStrength}', fs)
      .replace('{contrastAgent}', agent);
  }

  // 2. Get sequence description for this study type
  const sequences = SEQUENCE_MAP[region]?.[studyType] || SEQUENCE_MAP['Other']?.[studyType];
  if (sequences) {
    baseText += ' Sequences included ' + sequences + '.';
  }

  return baseText;
}

/**
 * Generate combined technique for multiple studies
 */
export function generateTechnique(
  studies: Study[],
  fieldStrength: string,
  contrastAdministered: boolean,
  contrastAgent: string
): string {
  if (studies.length === 0) return '';

  if (studies.length === 1) {
    return techniqueForStudy(studies[0], fieldStrength, contrastAdministered, contrastAgent);
  }

  // Multiple studies: generate for each and combine
  return studies
    .map((study, idx) => {
      const tech = techniqueForStudy(study, fieldStrength, contrastAdministered, contrastAgent);
      // For subsequent studies, prefix with "Additionally,"
      if (idx > 0) {
        // Don't lowercase acronyms like "MRI" or "Cardiac"
        const firstWord = tech.split(' ')[0];
        if (/^[A-Z]{2,}/.test(firstWord)) {
          return 'Additionally, ' + tech;
        }
        return 'Additionally, ' + tech.charAt(0).toLowerCase() + tech.slice(1);
      }
      return tech;
    })
    .join('\n\n');
}

/**
 * Generate combined study heading
 * e.g., "MRI Brain", "MRI Brain and Cervical Spine", "MRI Brain, Cervical Spine, and Lumbar Spine"
 */
export function generateStudyHeading(studies: Study[]): string {
  if (studies.length === 0) return 'MRI Study';
  if (studies.length === 1) return `MRI ${studies[0].bodyRegion}`;

  const regions = studies.map(s => s.bodyRegion);
  if (regions.length === 2) {
    return `MRI ${regions[0]} and ${regions[1]}`;
  }
  return `MRI ${regions.slice(0, -1).join(', ')}, and ${regions[regions.length - 1]}`;
}

/**
 * Get combined body region string for DB storage
 * e.g., "Brain", "Brain + Cervical Spine"
 */
export function combineBodyRegions(studies: Study[]): string {
  return studies.map(s => s.bodyRegion).join(' + ');
}

/**
 * Get combined study type string for DB storage
 */
export function combineStudyTypes(studies: Study[]): string {
  return studies.map(s => s.studyType).join(', ');
}