export function modRank(m: string): number {
  const u = (m || "").toUpperCase();
  if (u.startsWith("MR")) return 0;
  if (u.startsWith("CT")) return 1;
  if (u.startsWith("X") || u.includes("RAY")) return 2;
  if (u.includes("US") || u.includes("DOPPLER") || u.includes("ECHO")) return 3;
  return 4;
}
export function batchSort<T extends { bodyRegion?: string | null; modality?: string | null; studyDate?: string | null }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const ra = modRank(String(a.modality || "")), rb = modRank(String(b.modality || ""));
    if (ra !== rb) return ra - rb;
    const ga = String(a.bodyRegion || "zz").toLowerCase(), gb = String(b.bodyRegion || "zz").toLowerCase();
    if (ga !== gb) return ga < gb ? -1 : 1;
    return String(a.studyDate || "") < String(b.studyDate || "") ? -1 : 1;
  });
}
