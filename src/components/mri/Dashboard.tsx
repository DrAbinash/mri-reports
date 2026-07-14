'use client';

import { useState, useEffect } from 'react';
import type { DashboardStats, MriReport, TemplateData } from '@/lib/store';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Brain,
  Bone,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const REGION_EMOJI: Record<string, string> = {
  'Brain': '🧠', 'Spine - Cervical': '🦴', 'Spine - Thoracic': '🦴', 'Spine - Lumbar': '🦴',
  'Spine - Sacral': '🦴', 'Knee': '🦵', 'Shoulder': '💪', 'Hip': '🦵',
  'Abdomen': '🫁', 'Pelvis': '🫀', 'Chest': '🫁', 'Cardiac': '❤️', 'Neck': '🦴',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { setActiveTab, setSelectedReportId } = useAppStore();

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/stats').then(r => r.json()),
      fetch('/api/reports?limit=5&sortBy=createdAt&sortOrder=desc').then(r => r.json()),
    ])
      .then(([statsData, reportsData]) => {
        setStats(statsData);
        if (!statsData.recentReports?.length && reportsData.reports?.length) {
          statsData.recentReports = reportsData.reports;
        }
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Reports',
      value: stats?.totalReports || 0,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Final',
      value: stats?.finalReports || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Drafts',
      value: stats?.draftReports || 0,
      icon: FileEdit,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Urgent / STAT',
      value: stats?.urgentReports || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  const maxRegionCount = Math.max(...(stats?.regionCounts?.map(r => r.count) || [1]), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your MRI report library</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Body Region Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Reports by Body Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.regionCounts?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No data yet. Upload your MRI reports to see the distribution.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.regionCounts.map((region, idx) => (
                  <motion.div
                    key={region.region}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm flex items-center gap-1.5">
                        <span>{REGION_EMOJI[region.region] || '📁'}</span>
                        {region.region}
                      </span>
                      <span className="text-sm font-medium">{region.count}</span>
                    </div>
                    <Progress value={(region.count / maxRegionCount) * 100} className="h-2" />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" /> Recent Reports
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('reports')} className="text-xs">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {!stats?.recentReports?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No reports yet.
                <Button variant="link" size="sm" onClick={() => setActiveTab('upload')} className="text-xs p-0 h-auto">
                  Upload your first folder
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedReportId(report.id);
                      setActiveTab('reports');
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.bodyRegion} — {report.studyType}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {report.reportStatus}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(report.createdAt), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}