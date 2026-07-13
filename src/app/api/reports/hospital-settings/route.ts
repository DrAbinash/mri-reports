import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/reports/hospital-settings — Get or create default settings
export async function GET() {
  let settings = await db.hospitalSettings.findFirst();
  if (!settings) {
    settings = await db.hospitalSettings.create({ data: {} });
  }
  return NextResponse.json({ settings });
}

// PUT /api/reports/hospital-settings — Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    let settings = await db.hospitalSettings.findFirst();
    if (!settings) {
      settings = await db.hospitalSettings.create({ data: body });
    } else {
      settings = await db.hospitalSettings.update({ where: { id: settings.id }, data: body });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}