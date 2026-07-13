import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default finding templates per body region
const DEFAULT_FINDINGS: Record<string, { label: string; text: string; isAbnormal: boolean }[]> = {
  'Brain': [
    { label: 'Normal study', text: 'No acute intracranial hemorrhage, mass, mass effect, or midline shift.', isAbnormal: false },
    { label: 'Ventricles normal', text: 'Ventricles are normal in size and configuration.', isAbnormal: false },
    { label: 'Senile changes', text: 'Age-related cerebral atrophy noted with prominence of sulci and ventricles.', isAbnormal: true },
    { label: 'Infarct', text: 'Acute/chronic infarct noted in the territory of the _____ artery.', isAbnormal: true },
    { label: 'Hydrocephalus', text: 'Hydrocephalus with dilation of lateral ventricles noted.', isAbnormal: true },
    { label: 'Tumor/Mass', text: 'A _____ lesion measuring approximately __ x __ x __ cm is noted in the ____ region.', isAbnormal: true },
    { label: 'White matter changes', text: 'Periventricular white matter hyperintensities noted, likely due to small vessel ischemic changes.', isAbnormal: true },
    { label: 'MCA sign', text: 'Hyperdense MCA sign noted suggesting acute thrombosis.', isAbnormal: true },
    { label: 'Sella/turcica', text: 'Sella turcica is normal. Pituitary gland is normal in size and signal.', isAbnormal: false },
    { label: 'Posterior fossa', text: 'Cerebellum and brainstem appear normal without focal lesion.', isAbnormal: false },
    { label: 'Cavernoma', text: 'A well-circumscribed lesion with mixed signal intensity consistent with cavernoma is noted at ____.', isAbnormal: true },
    { label: 'Demyelination', text: 'Multiple periventricular and juxtacortical white matter hyperintensities noted, suspicious for demyelinating plaques.', isAbnormal: true },
  ],
  'Spine - Cervical': [
    { label: 'Normal study', text: 'Cervical spine demonstrates normal alignment and signal characteristics.', isAbnormal: false },
    { label: 'Disc desiccation', text: 'Disc desiccation noted at C__-C__ level with reduced T2 signal.', isAbnormal: true },
    { label: 'Disc bulge', text: 'Posterior disc bulge noted at C__-C__ level causing mild thecal sac indentation.', isAbnormal: true },
    { label: 'Disc protrusion', text: 'Disc protrusion noted at C__-C__ level with mild foraminal narrowing.', isAbnormal: true },
    { label: 'Disc herniation', text: 'Disc herniation noted at C__-C__ level compressing the spinal cord/the nerve root.', isAbnormal: true },
    { label: 'Cord signal', text: 'Intramedullary T2 hyperintensity noted at C__ level suggesting myelomalacia/edema.', isAbnormal: true },
    { label: 'Canal stenosis', text: 'Spinal canal stenosis noted at C__-C__ level.', isAbnormal: true },
    { label: 'Foraminal stenosis', text: 'Neural foraminal narrowing noted at C__-C__ level.', isAbnormal: true },
    { label: 'Vertebral body', text: 'Vertebral body heights are maintained. No compression fracture noted.', isAbnormal: false },
  ],
  'Spine - Lumbar': [
    { label: 'Normal study', text: 'Lumbar spine demonstrates normal alignment and signal characteristics.', isAbnormal: false },
    { label: 'Disc desiccation', text: 'Disc desiccation noted at L__-L__ level with reduced T2 signal.', isAbnormal: true },
    { label: 'Disc bulge', text: 'Posterior disc bulge noted at L__-L__ level.', isAbnormal: true },
    { label: 'Disc protrusion', text: 'Disc protrusion noted at L__-L__ level with mild foraminal narrowing.', isAbnormal: true },
    { label: 'Disc herniation', text: 'Disc herniation noted at L__-L__ level with nerve root compression.', isAbnormal: true },
    { label: 'Canal stenosis', text: 'Lumbar spinal canal stenosis noted at L__-L__ level.', isAbnormal: true },
    { label: 'Nerve root compression', text: 'The traversing nerve root at L__-L__ is compressed by the disc.', isAbnormal: true },
    { label: 'Conus', text: 'Conus medullaris is normal in position and signal.', isAbnormal: false },
    { label: 'Facet arthropathy', text: 'Facet arthropathy noted at L__-L__ level.', isAbnormal: true },
    { label: 'Spondylolisthesis', text: 'Anterolisthesis/retrolisthesis of L__ over L__ noted.', isAbnormal: true },
    { label: 'Schmorl nodes', text: 'Schmorl nodes noted at L__-L__ endplates.', isAbnormal: true },
  ],
  'Knee': [
    { label: 'Normal study', text: 'No significant abnormality detected in the knee.', isAbnormal: false },
    { label: 'Meniscus tear (medial)', text: 'Full-thickness tear of the medial meniscus noted.', isAbnormal: true },
    { label: 'Meniscus tear (lateral)', text: 'Tear of the lateral meniscus noted.', isAbnormal: true },
    { label: 'ACL tear', text: 'Anterior cruciate ligament appears torn with discontinuity and abnormal signal.', isAbnormal: true },
    { label: 'PCL tear', text: 'Posterior cruciate ligament appears torn.', isAbnormal: true },
    { label: 'MCL injury', text: 'Medial collateral ligament injury with surrounding edema noted.', isAbnormal: true },
    { label: 'Joint effusion', text: 'Joint effusion noted.', isAbnormal: true },
    { label: 'Bone marrow edema', text: 'Bone marrow edema noted at the ____.', isAbnormal: true },
    { label: 'Cartilage loss', text: 'Full-thickness cartilage loss noted at the ____ compartment.', isAbnormal: true },
    { label: 'Baker cyst', text: 'Baker cyst noted in the popliteal fossa.', isAbnormal: true },
  ],
  'Shoulder': [
    { label: 'Normal study', text: 'No significant abnormality detected in the shoulder.', isAbnormal: false },
    { label: 'Rotator cuff tear', text: 'Full-thickness tear of the supraspinatus tendon noted.', isAbnormal: true },
    { label: 'Tendinosis', text: 'Tendinosis of the supraspinatus/infraspinatus tendon noted.', isAbnormal: true },
    { label: 'Labral tear', text: 'Labral tear noted (SLAP lesion / Bankart lesion).', isAbnormal: true },
    { label: 'Biceps tendon', text: 'Long head of biceps tendon appears normal.', isAbnormal: false },
    { label: 'Joint effusion', text: 'Joint effusion noted in the glenohumeral joint.', isAbnormal: true },
    { label: 'Impingement', text: 'Subacromial impingement with subacromial bursitis noted.', isAbnormal: true },
  ],
  'Other': [
    { label: 'Normal study', text: 'No significant abnormality detected.', isAbnormal: false },
    { label: 'Abnormality noted', text: 'Abnormal signal intensity noted at ____.', isAbnormal: true },
    { label: 'Mass/lesion', text: 'A _____ lesion measuring approximately __ cm is noted.', isAbnormal: true },
    { label: 'Fluid collection', text: 'Fluid collection noted at ____.', isAbnormal: true },
    { label: 'Soft tissue', text: 'Soft tissue appears normal.', isAbnormal: false },
  ],
};

export async function POST() {
  try {
    // Check if defaults already exist
    const existing = await db.findingTemplate.findMany({ where: { isDefault: true } });
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Defaults already seeded', count: existing.length });
    }

    // Seed all default findings
    const data = Object.entries(DEFAULT_FINDINGS).flatMap(([region, findings]) =>
      findings.map((f, idx) => ({
        bodyRegion: region,
        label: f.label,
        text: f.text,
        isAbnormal: f.isAbnormal,
        sortOrder: idx,
        isDefault: true,
      }))
    );

    const result = await db.findingTemplate.createMany({ data });
    return NextResponse.json({ seeded: result.count });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}