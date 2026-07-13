import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createReportSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  patientId: z.string().optional(),
  patientAge: z.number().int().positive().optional().nullable(),
  patientGender: z.string().optional().nullable(),
  referringDoctor: z.string().optional().nullable(),
  studyDate: z.string().optional().nullable(),
  accessionNumber: z.string().optional().nullable(),
  bodyRegion: z.string().min(1, 'Body region is required'),
  studyType: z.string().min(1, 'Study type is required'),
  modality: z.string().optional().default('MRI'),
  scannerModel: z.string().optional().nullable(),
  fieldStrength: z.string().optional().nullable(),
  clinicalIndication: z.string().optional().nullable(),
  clinicalHistory: z.string().optional().nullable(),
  technique: z.string().optional().nullable(),
  comparison: z.string().optional().nullable(),
  findings: z.string().min(1, 'Findings are required'),
  impression: z.string().min(1, 'Impression is required'),
  contrastAdministered: z.boolean().optional().default(false),
  contrastAgent: z.string().optional().nullable(),
  contrastVolume: z.string().optional().nullable(),
  contrastRoute: z.string().optional().nullable(),
  reportStatus: z.string().optional().default('Draft'),
  priority: z.string().optional().default('Routine'),
  reportNumber: z.string().optional().nullable(),
  attachmentPath: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
});

// GET /api/reports - List reports with search, filter, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const bodyRegion = searchParams.get('bodyRegion') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { patientName: { contains: search } },
        { patientId: { contains: search } },
        { accessionNumber: { contains: search } },
        { referringDoctor: { contains: search } },
        { findings: { contains: search } },
        { impression: { contains: search } },
      ];
    }

    if (bodyRegion) {
      where.bodyRegion = bodyRegion;
    }

    if (status) {
      where.reportStatus = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (dateFrom || dateTo) {
      where.studyDate = {} as Record<string, unknown>;
      if (dateFrom) (where.studyDate as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.studyDate as Record<string, unknown>).lte = new Date(dateTo);
    }

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const [reports, total] = await Promise.all([
      db.mriReport.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.mriReport.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// POST /api/reports - Create a single report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createReportSchema.parse(body);

    const report = await db.mriReport.create({
      data: {
        ...validated,
        studyDate: validated.studyDate ? new Date(validated.studyDate) : null,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}