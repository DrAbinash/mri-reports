export interface CriticalFinding { category: string; severity: "EMERGENCY" | "URGENT"; message: string }
const PATTERNS: Array<{ re: RegExp; severity: "EMERGENCY" | "URGENT"; message: string }> = [
  { re: /acute\s+(infarct|infarction|ischemic\s+stroke)/i, severity: "EMERGENCY", message: "Acute infarction — stroke protocol" },
  { re: /intracranial\s+(hemorrhage|haemorrhage)/i, severity: "EMERGENCY", message: "Intracranial hemorrhage" },
  { re: /midline\s+shift/i, severity: "EMERGENCY", message: "Midline shift — mass effect" },
  { re: /(transtentorial|subfalcine|uncal)\s+herniation/i, severity: "EMERGENCY", message: "Brain herniation — neurosurgical emergency" },
  { re: /cauda\s+equina\s+(compression|syndrome)/i, severity: "EMERGENCY", message: "Cauda equina — surgical emergency" },
  { re: /epidural\s+(hematoma|haematoma|abscess)/i, severity: "EMERGENCY", message: "Epidural collection — emergency" },
  { re: /cord\s+compression/i, severity: "URGENT", message: "Cord compression — urgent evaluation" },
  { re: /acute\s+hydrocephalus/i, severity: "URGENT", message: "Acute hydrocephalus" },
];
export function detectCriticalFindings(text: string): CriticalFinding[] {
  return PATTERNS.filter(p => p.re.test(text)).map(p => ({ category: "auto", severity: p.severity, message: p.message }));
}
