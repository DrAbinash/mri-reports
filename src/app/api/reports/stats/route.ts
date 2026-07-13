import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/reports/stats - Dashboard statistics
export async function GET() {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [totalReports, finalReports, draftReports, urgentReports, recentReports, regionCounts, monthlyCounts] =
      await Promise.all([
        db.mriReport.count(),
        db.mriReport.count({ where: { reportStatus: 'Final' } }),
        db.mriReport.count({ where: { reportStatus: 'Draft' } }),
        db.mriReport.count({ where: { priority: { in: ['Urgent', 'STAT'] } } }),
        db.mriReport.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        db.mriReport.groupBy({
          by: ['bodyRegion'],
          _count: { bodyRegion: true },
          orderBy: { _count: { bodyRegion: 'desc' } },
        }),
        db.mriReport.findMany({
          where: { studyDate: { gte: twelveMonthsAgo } },
          select: { studyDate: true },
          orderBy: { studyDate: 'asc' },
        }),
      ]);

    // Group monthly data
    const monthlyData: Record<string, number> = {};
    for (const r of monthlyCounts) {
      if (r.studyDate) {
        const key = `${r.studyDate.getFullYear()}-${String(r.studyDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = (monthlyData[key] || 0) + 1;
      }
    }

    return NextResponse.json({
      totalReports,
      finalReports,
      draftReports,
      urgentReports,
      recentReports,
      regionCounts: regionCounts.map((r) => ({
        region: r.bodyRegion,
        count: r._count.bodyRegion,
      })),
      monthlyData,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}