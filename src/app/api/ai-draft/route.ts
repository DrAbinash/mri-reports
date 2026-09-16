import { NextResponse } from "next/server";
import { generateReport } from "@/lib/ai-composer";
export const maxDuration = 180;
export async function POST(req: Request) {
  try {
    const { modality, indication, rawFindings, measurements } = await req.json();
    const r = await generateReport({ modality, indication, rawFindings, measurements });
    return NextResponse.json({ success: true, report: r.text, provider: r.provider, model: r.model, fallback: r.fallback });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
