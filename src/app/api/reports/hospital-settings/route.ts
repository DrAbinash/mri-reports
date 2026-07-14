import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_SETTINGS = {
  id: 'default',
  hospitalName: 'MRI Report Center',
  tagline: null,
  address: null,
  phone: null,
  website: null,
  email: null,
  logoUrl: null,
  radiologistName: null,
  radiologistQualification: null,
  radiologistRegNumber: null,
  accreditation: null,
  accreditationNumber: null,
  footerMessage: 'Thank you for choosing our services.',
  reportHeaderColor: '#1e3a5f',
  reportLayout: 'classic',
  showTechnique: true,
  showComparison: true,
  showClinicalInfo: true,
  showSignature: true,
  showFooterMessage: true,
  showAccreditation: true,
  patientColumns: '3',
  impressionStyle: 'bordered',
  headerStyle: 'full',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// GET /api/reports/hospital-settings — Get or create default settings
export async function GET() {
  try {
    let settings = await db.hospitalSettings.findFirst();
    if (!settings) {
      settings = await db.hospitalSettings.create({ data: {} });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching hospital settings, returning defaults:', error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
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