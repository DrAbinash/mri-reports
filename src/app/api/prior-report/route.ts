import { NextResponse } from "next/server";
import * as dbmod from "@/lib/db";
const prisma: any = (dbmod as any).db || (dbmod as any).prisma || (dbmod as any).default;
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const mrn = sp.get("mrn") || ""; const name = sp.get("name") || ""; const cur = sp.get("exclude") || "";
  try {
    let links: any[] = [];
    try { links = await prisma.careOrderLink.findMany({ where: { patientMrn: mrn } }); }
    catch { links = await prisma.careOrderLink.findMany({ where: { patientName: name } }); }
    const prior = links
      .filter((l: any) => l.accessionNumber && l.accessionNumber !== cur)
      .sort((a: any, b: any) => String(b.studyDate || "").localeCompare(String(a.studyDate || "")))[0];
    if (!prior) return NextResponse.json({ prior: null });
    let report: any = null;
    try { report = await prisma.report.findFirst({ where: { accessionNumber: prior.accessionNumber }, orderBy: { updatedAt: "desc" } }); } catch {}
    if (!report) { try { report = await prisma.report.findFirst({ where: { order: { accessionNumber: prior.accessionNumber } }, orderBy: { updatedAt: "desc" } }); } catch {} }
    return NextResponse.json({ prior: { accessionNumber: prior.accessionNumber, studyDate: prior.studyDate, testName: prior.testName, impression: report?.impression ?? null } });
  } catch {
    return NextResponse.json({ prior: null });
  }
}
