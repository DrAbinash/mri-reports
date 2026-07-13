import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

// Allow large file uploads
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Resolve the upload base directory — works in both dev and Docker */
function getUploadBase(): string {
  // In production/Docker, use the env var or the data volume path
  if (process.env.NODE_ENV === 'production') {
    return process.env.UPLOAD_DIR || '/app/data/uploads';
  }
  // In dev, use the project's uploads/ folder
  return path.join(process.cwd(), 'uploads');
}

// Auto-detect body region from filename/folder name
function detectBodyRegion(filename: string, folderPath: string): string {
  const combined = `${folderPath}/${filename}`.toLowerCase();
  
  const regionMap: Record<string, string> = {
    'brain': 'Brain',
    'head': 'Brain',
    'cerebr': 'Brain',
    'cerebell': 'Brain',
    'pituitary': 'Brain',
    'cervical': 'Spine - Cervical',
    'c-spine': 'Spine - Cervical',
    'thoracic': 'Spine - Thoracic',
    't-spine': 'Spine - Thoracic',
    'lumbar': 'Spine - Lumbar',
    'l-spine': 'Spine - Lumbar',
    'sacral': 'Spine - Sacral',
    'sacrum': 'Spine - Sacral',
    'knee': 'Knee',
    'shoulder': 'Shoulder',
    'hip': 'Hip',
    'pelvis': 'Pelvis',
    'pelvic': 'Pelvis',
    'abdomen': 'Abdomen',
    'abdominal': 'Abdomen',
    'liver': 'Abdomen',
    'chest': 'Chest',
    'thorax': 'Chest',
    'cardiac': 'Cardiac',
    'heart': 'Cardiac',
    'breast': 'Breast',
    'prostate': 'Prostate',
    'elbow': 'Elbow',
    'wrist': 'Wrist',
    'ankle': 'Ankle',
    'foot': 'Foot',
    'hand': 'Hand',
    'neck': 'Neck',
    'cervical_neck': 'Neck',
  };

  for (const [keyword, region] of Object.entries(regionMap)) {
    if (combined.includes(keyword)) return region;
  }

  return 'Other';
}

// Extract patient name from filename (common patterns)
function extractPatientName(filename: string): string {
  let name = filename.replace(/\.[^/.]+$/, '');
  name = name.replace(/^(mri|mr|report|scan)_?/i, '');
  name = name.replace(/_(mri|mr|report|scan)$/i, '');
  name = name.replace(/[_-]+/g, ' ').trim();
  if (name.length > 0) {
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return name || 'Unknown Patient';
}

// Detect study type from filename
function detectStudyType(filename: string): string {
  const lower = filename.toLowerCase();
  const typeMap: Record<string, string> = {
    't1c': 'T1-Contrast',
    'contrast': 'T1-Contrast',
    't1': 'T1',
    't2': 'T2',
    'flair': 'FLAIR',
    'dwi': 'DWI/ADC',
    'adc': 'DWI/ADC',
    'stir': 'STIR',
    'gre': 'GRE/SWI',
    'swi': 'GRE/SWI',
    'mra': 'MRA',
    'mrv': 'MRV',
    'mrcp': 'MRCP',
    'pd': 'Proton Density',
    'spectro': 'Spectroscopy',
    'dti': 'DTI',
    'cine': 'Cine SSFP',
    'lge': 'LGE',
    'dce': 'DCE',
    'perf': 'Perfusion',
  };

  for (const [keyword, type] of Object.entries(typeMap)) {
    if (lower.includes(keyword)) return type;
  }
  return 'Standard';
}

// Extract date from filename (common patterns: YYYYMMDD, YYYY-MM-DD)
function extractDate(filename: string): Date | null {
  const cleanName = filename.replace(/\.[^/.]+$/, '');
  
  let match = cleanName.match(/(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (d.getTime() > 0) return d;
  }
  
  match = cleanName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (d.getTime() > 0) return d;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderStructure = formData.get('folderStructure') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Use the correct upload directory for both dev and Docker
    const uploadBase = getUploadBase();
    const organizedBase = path.join(uploadBase, 'organized');

    // Ensure directories exist
    for (const dir of [uploadBase, organizedBase]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }

    const results = {
      total: files.length,
      success: 0,
      skipped: 0,
      errors: [] as string[],
      organized: [] as { originalName: string; storedPath: string; bodyRegion: string; patientName: string }[],
    };

    for (const file of files) {
      try {
        const originalName = file.name;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Detect metadata from filename
        const bodyRegion = detectBodyRegion(originalName, folderStructure || '');
        const patientName = extractPatientName(originalName);
        const studyType = detectStudyType(originalName);
        const studyDate = extractDate(originalName);

        // Organize into: organized/{BodyRegion}/{YYYY-MM}/{filename}
        const now = studyDate || new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const regionSlug = bodyRegion.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const organizedDir = path.join(organizedBase, regionSlug, yearMonth);

        if (!existsSync(organizedDir)) {
          await mkdir(organizedDir, { recursive: true });
        }

        const storedPath = path.join(organizedDir, originalName);
        await writeFile(storedPath, buffer);

        // Create database record (no unique constraint on accessionNumber anymore)
        const report = await db.mriReport.create({
          data: {
            patientName,
            bodyRegion,
            studyType,
            studyDate,
            findings: `Original file: ${originalName}\nAuto-imported from folder upload.`,
            impression: 'Pending review - report imported from file.',
            reportStatus: 'Draft',
            attachmentPath: storedPath,
            attachmentName: originalName,
            fileSize: buffer.length,
            reportNumber: `IMP-${Date.now().toString(36).toUpperCase()}`,
          },
        });

        results.success++;
        results.organized.push({
          originalName,
          storedPath: path.relative(uploadBase, storedPath),
          bodyRegion,
          patientName,
        });
      } catch (err) {
        results.errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    return NextResponse.json({ results }, { status: 201 });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}