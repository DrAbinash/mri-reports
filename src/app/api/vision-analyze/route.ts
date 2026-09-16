import { NextResponse } from "next/server";
import { analyseImages, parseObservations, type VisionImage } from "@/lib/vision-reader";
export const maxDuration = 120;
export async function POST(req: Request) {
  try {
    const { images, modality, bodyPart, clinicalInfo } = (await req.json()) as { images: VisionImage[]; modality?: string; bodyPart?: string; clinicalInfo?: string };
    if (!Array.isArray(images) || !images.length) return NextResponse.json({ success: false, error: "No images" }, { status: 400 });
    const r = await analyseImages(images, { modality, bodyPart, clinicalInfo });
    return NextResponse.json({ success: true, ...r, observations: parseObservations(r.text), provenance: `image-reader:${r.model}:${r.imageCount}img` });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
