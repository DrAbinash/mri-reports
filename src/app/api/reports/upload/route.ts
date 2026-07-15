import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Increase body size limit for large MRI file uploads
export const maxDuration = 120;

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
    const baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
    const organizedDir = path.join(baseDir, 'organized');

    // Ensure upload directories exist and are writable
    try {
      await mkdir(organizedDir, { recursive: true });
      // Verify we can write to the directory
      const testPath = path.join(organizedDir, '.write_test');
      await writeFile(testPath, 'test');
      await stat(testPath);
      // Clean up test file
      const { unlink } = await import('fs/promises');
      await unlink(testPath).catch(() => {});
    } catch (dirErr) {
      console.error('[UPLOAD] Cannot write to upload directory:', organizedDir, dirErr);
      return NextResponse.json(
        { error: 'Upload directory not writable', details: `Path: ${organizedDir}` },
        { status: 500 }
      );
    }

    // Parse multipart form data
    let formData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error('[UPLOAD] Failed to parse form data:', parseErr);
      return NextResponse.json(
        { error: 'Failed to parse upload data. File may be too large.' },
        { status: 413 }
      );
    }

    const files = formData.getAll('files') as File[];
    const folderStructure = (formData.get('folderStructure') as string) || '';

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

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

        // Verify file was written
        const writtenStat = await stat(storedPath);
        if (writtenStat.size === 0 && bytes.byteLength > 0) {
          results.errors.push(`${file.name}: File written but 0 bytes`);
        } else {
          results.success++;
          results.organized.push({
            originalName: file.name,
            storedPath: `organized/${bodyRegion}/${storedName}`,
            bodyRegion,
            patientName: patientHint,
          });
        }
      } catch (fileErr) {
        const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
        console.error(`[UPLOAD] Failed to save ${file.name}:`, msg);
        results.errors.push(`${file.name}: ${msg}`);
      }
    }

    console.log(`[UPLOAD] ${results.success}/${results.total} files saved to ${organizedDir}`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[UPLOAD] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}