import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Body region detection from filename
function detectBodyRegion(filename: string): string {
  const lower = filename.toLowerCase();
  const regionMap: [string[], string][] = [
    [['brain', 'mri brain', 'head', 'cranial', 'cerebr', 'intracranial'], 'Brain'],
    [['cervical', 'c-spine', 'c spine'], 'Spine - Cervical'],
    [['thoracic', 't-spine', 't spine', 'dorsal'], 'Spine - Thoracic'],
    [['lumbar', 'l-spine', 'l spine', 'ls spine'], 'Spine - Lumbar'],
    [['sacral', 'sacrum', 's-spine', 'coccyx'], 'Spine - Sacral'],
    [['knee'], 'Knee'],
    [['shoulder'], 'Shoulder'],
    [['hip', 'pelvic'], 'Hip'],
    [['elbow'], 'Elbow'],
    [['wrist', 'carpal'], 'Wrist'],
    [['ankle', 'talus', 'calcaneus'], 'Ankle'],
    [['foot', 'forefoot', 'hindfoot', 'midfoot', 'toe'], 'Foot'],
    [['hand', 'finger', 'metacarpal'], 'Hand'],
    [['abdomen', 'abdominal', 'liver', 'kidney', 'spleen', 'pancrea'], 'Abdomen'],
    [['pelvis', 'prostate', 'uterus', 'ovary', 'bladder'], 'Pelvis'],
    [['chest', 'thorax', 'lung', 'mediastin', 'pleural'], 'Chest'],
    [['neck', 'cervical neck', 'thyroid', 'carotid'], 'Neck'],
    [['cardiac', 'heart', 'coronary', 'aorta'], 'Cardiac'],
    [['breast', 'mammo'], 'Breast'],
  ];

  for (const [keywords, region] of regionMap) {
    if (keywords.some(kw => lower.includes(kw))) {
      return region;
    }
  }
  return 'Other';
}

// Extract patient name attempt from filename
function extractPatientHint(filename: string): string {
  // Remove extension and common MRI terms
  const cleaned = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/mri|report|scan|study|pdf|jpg|png|dcm|dicom/gi, '')
    .replace(/\d{4}[-/]\d{2}[-/]\d{2}/g, '')
    .replace(/\d{2}[-/]\d{2}[-/]\d{4}/g, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Unknown';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderStructure = (formData.get('folderStructure') as string) || '';

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
    const organizedDir = path.join(baseDir, 'organized');

    // Ensure upload directories exist
    await mkdir(organizedDir, { recursive: true });

    const results = {
      total: files.length,
      success: 0,
      skipped: 0,
      errors: [] as string[],
      organized: [] as {
        originalName: string;
        storedPath: string;
        bodyRegion: string;
        patientName: string;
      }[],
    };

    for (const file of files) {
      try {
        const bodyRegion = detectBodyRegion(file.name);
        const patientHint = extractPatientHint(file.name);

        // Create region directory
        const regionDir = path.join(organizedDir, bodyRegion);
        await mkdir(regionDir, { recursive: true });

        // Generate safe filename (prefix with timestamp to avoid collisions)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedName = `${timestamp}_${safeName}`;
        const storedPath = path.join(regionDir, storedName);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(storedPath, Buffer.from(bytes));

        results.success++;
        results.organized.push({
          originalName: file.name,
          storedPath: `organized/${bodyRegion}/${storedName}`,
          bodyRegion,
          patientName: patientHint,
        });
      } catch (fileErr) {
        const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
        results.errors.push(`${file.name}: ${msg}`);
      }
    }

    // Also seed findings in the background
    try {
      const { db } = await import('@/lib/db');
      const existing = await db.findingTemplate.findMany({ where: { isDefault: true } });
      if (existing.length === 0) {
        // Trigger seed
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        fetch(`${baseUrl}/api/reports/seed-findings`, { method: 'POST' }).catch(() => {});
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}