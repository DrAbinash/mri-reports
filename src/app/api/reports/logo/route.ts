import { NextRequest, NextResponse } from 'next/server';
import { readFile, existsSync } from 'fs';
import path from 'path';

function getUploadDir(): string {
  if (process.env.NODE_ENV === 'production') return process.env.UPLOAD_DIR || '/app/data/uploads';
  return path.join(process.cwd(), 'uploads');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file') || 'logo.png';

    // Prevent directory traversal
    const safeFile = path.basename(file).replace(/\.\./g, '');
    const filePath = path.join(getUploadDir(), safeFile);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(safeFile).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=604800',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}