import { NextResponse } from "next/server";
function auth(): string | null {
  const u = process.env.ORTHANC_USERNAME; const p = process.env.ORTHANC_PASSWORD;
  if (!u) return null;
  return "Basic " + Buffer.from(`${u}:${p || ""}`).toString("base64");
}
function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {}; if (json) h["Content-Type"] = "application/json";
  const a = auth(); if (a) h.Authorization = a; return h;
}
async function get(path: string, asJson = true) {
  const base = process.env.ORTHANC_URL || "http://172.16.1.139:8042";
  const r = await fetch(`${base}${path}`, { headers: headers(), cache: "no-store" });
  if (!r.ok) throw new Error(`Orthanc ${r.status}`);
  return asJson ? r.json() : Buffer.from(await r.arrayBuffer());
}
async function resolveStudyId(uidOrId: string): Promise<string> {
  try { await get(`/studies/${uidOrId}`); return uidOrId; }
  catch {
    const base = process.env.ORTHANC_URL || "http://172.16.1.139:8042";
    const r = await fetch(`${base}/tools/lookup`, { method: "POST", headers: headers(true), body: JSON.stringify(uidOrId) });
    if (!r.ok) throw new Error("Orthanc lookup failed");
    const hits = (await r.json()) as Array<{ ID: string; Type: string }>;
    const hit = hits.find(x => x.Type === "Study");
    if (!hit) throw new Error("Study not found in Orthanc");
    return hit.ID;
  }
}
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  try {
    const inst = sp.get("instance");
    if (inst) { const png = (await get(`/instances/${inst}/preview`, false)) as Buffer; return NextResponse.json({ success: true, base64: png.toString("base64") }); }
    const study = sp.get("study");
    if (!study) return NextResponse.json({ success: false, error: "need ?study= or ?instance=" }, { status: 400 });
    const id = await resolveStudyId(study);
    const ids = (await get(`/studies/${id}/series`)) as string[];
    const series = await Promise.all(ids.map(async sid => {
      try { const meta = await get(`/series/${sid}`); const insts = (await get(`/series/${sid}/instances`)) as string[];
        return { id: sid, description: meta?.MainDicomTags?.SeriesDescription || "Series", instances: insts }; }
      catch { return null; }
    }));
    return NextResponse.json({ success: true, series: series.filter(Boolean) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
