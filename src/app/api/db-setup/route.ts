import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { execSync } from 'child_process';
import path from 'path';

// POST /api/db-setup — Recreate all tables from schema.sql
// This is the nuclear option for fixing a broken database.
export async function POST() {
  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/data/db/mri_reports.db';
    const schemaPath = path.join(process.cwd(), 'schema.sql');

    // 1. Delete the old DB file
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(dbPath);
    } catch {
      // File doesn't exist, that's fine
    }

    // 2. Recreate tables using sqlite3 CLI (same as entrypoint)
    try {
      execSync(`sqlite3 "${dbPath}" < "${schemaPath}"`, { stdio: 'pipe' });
    } catch (execErr) {
      console.error('[db-setup] sqlite3 failed, trying touch:', execErr);
      const { openSync, closeSync } = await import('fs');
      openSync(dbPath, 'w');
      closeSync(openSync(dbPath, 'w'));
    }

    // 3. Reconnect Prisma (force new connection)
    try {
      await db.$connect();
    } catch {
      // Prisma auto-connects, ignore errors
    }

    // 4. Seed default findings
    try {
      const seedRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/reports/seed-findings`, {
        method: 'POST',
      });
      const seedData = await seedRes.json();
      console.log('[db-setup] Seed result:', seedData);
    } catch (seedErr) {
      console.error('[db-setup] Seed failed (non-fatal):', seedErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Database recreated successfully. Please refresh the page.',
    });
  } catch (error) {
    console.error('[db-setup] Error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      message: 'Database reset failed. Check server logs.',
    }, { status: 500 });
  }
}

// GET /api/db-setup — Check database health
export async function GET() {
  try {
    // Try a simple query to check if DB is working
    await db.mriReport.count();
    await db.reportTemplate.count();
    await db.findingTemplate.count();
    await db.hospitalSettings.count();
    return NextResponse.json({
      healthy: true,
      tables: ['MriReport', 'ReportTemplate', 'FindingTemplate', 'HospitalSettings'],
      message: 'All tables accessible',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      healthy: false,
      error: msg,
      message: 'Database has issues. Click "Fix Database" to reset.',
    });
  }
}