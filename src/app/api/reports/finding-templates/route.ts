import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/reports/finding-templates?bodyRegion=Brain
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bodyRegion = searchParams.get('bodyRegion') || '';

  const where: Record<string, unknown> = {};
  if (bodyRegion) where.bodyRegion = bodyRegion;

  const templates = await db.findingTemplate.findMany({
    where,
    orderBy: [{ bodyRegion: 'asc' }, { sortOrder: 'asc' }],
  });

  // Group by region
  const grouped: Record<string, typeof templates> = {};
  for (const t of templates) {
    if (!grouped[t.bodyRegion]) grouped[t.bodyRegion] = [];
    grouped[t.bodyRegion].push(t);
  }

  return NextResponse.json({ templates, grouped });
}

// POST /api/reports/finding-templates — Create a new finding template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bodyRegion, label, text, isAbnormal, sortOrder } = body;
    if (!bodyRegion || !label || !text) {
      return NextResponse.json({ error: 'bodyRegion, label, text required' }, { status: 400 });
    }
    const template = await db.findingTemplate.create({
      data: { bodyRegion, label, text, isAbnormal: !!isAbnormal, sortOrder: sortOrder ?? 99, isDefault: false },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}

// DELETE /api/reports/finding-templates?id=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await db.findingTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}