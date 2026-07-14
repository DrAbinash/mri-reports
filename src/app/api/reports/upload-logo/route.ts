import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

export const maxDuration = 10;

function getUploadDir(): string {
  if (process.env.NODE_ENV === 'production') return process.env.UPLOAD_DIR || '/app/data/uploads';
  return path.join(process.cwd(), 'uploads');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    // Sanitize filename
    const ext = path.extname(file.name) || '.png';
    const safeName = `logo${ext}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Save path in hospital settings
    const settings = await db.hospitalSettings.findFirst();
    const relativePath = `/api/reports/logo?file=${safeName}`;
    if (settings) {
      await db.hospitalSettings.update({
        where: { id: settings.id },
        data: { logoUrl: relativePath },
      });
    } else {
      await db.hospitalSettings.create({ data: { logoUrl: relativePath } });
    }

    return NextResponse.json({ success: true, logoUrl: relativePath, size: buffer.length });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}