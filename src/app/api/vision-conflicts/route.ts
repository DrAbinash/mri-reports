import { NextResponse } from "next/server";
import { detectConflicts } from "@/lib/vision-reader";
export async function POST(req: Request) {
  try {
    const { observations, radiologistFindings } = await req.json();
    return NextResponse.json({ success: true, conflicts: detectConflicts(observations || [], radiologistFindings || "") });
  } catch {
    return NextResponse.json({ success: true, conflicts: [] });
  }
}
