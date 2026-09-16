export interface ParsedMeasurement { level: string; value: number; unit: string; type: string }
export function parseMeasurements(text: string): ParsedMeasurement[] {
  const out: ParsedMeasurement[] = [];
  const re = /((?:C|T|L)\d{1,2}[-–](?:C|T|L)\d{1,2})\s*(?:AP\s+diameter\s*)?[:\s]*(\d+(?:\.\d+)?)\s*(mm|cm)/gi;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ level: m[1].toUpperCase(), value: parseFloat(m[2]), unit: m[3], type: "AP diameter" });
  return out;
}
export function formatMeasurements(ms: ParsedMeasurement[]): string {
  const ap = ms.filter(x => x.type === "AP diameter");
  if (!ap.length) return "";
  return "\n**SPINAL CANAL AP DIAMETERS**\n\n" + ap.map(x => `${x.level} : ${x.value} ${x.unit}`).join("\n") + "\n";
}
