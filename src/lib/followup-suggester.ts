export interface FollowUpSuggestion { label: string; line: string }
const RULES: Array<{ re: RegExp; label: string; line: string }> = [
  { re: /syrinx|syringomyelia/i, label: "Contrast MRI spine", line: "Contrast-enhanced MRI of the spine is recommended to evaluate the syrinx and any associated lesion." },
  { re: /cord\s+(compression|signal\s+abnormality)/i, label: "Urgent clinical correlation", line: "Urgent clinical correlation is advised given the cord compromise." },
  { re: /disc\s+extrusion|sequestr/i, label: "Clinical/surgical correlation", line: "Clinical and surgical correlation is advised given the disc extrusion with neural compromise." },
  { re: /compression\s+fracture|marrow\s+edema/i, label: "Follow-up MRI 8-12 weeks", line: "Follow-up MRI in 8-12 weeks (or sooner if clinically indicated) is recommended to assess evolution." },
  { re: /indeterminate|cannot\s+exclude|equivocal/i, label: "Dedicated/contrast study", line: "A dedicated contrast-enhanced study is recommended for characterization of the indeterminate finding." },
  { re: /destructive\s+lesion|mass\s+lesion|metastasis/i, label: "Contrast + staging", line: "Contrast-enhanced MRI with systemic staging is recommended for characterization." },
];
export function suggestFollowUp(text: string): FollowUpSuggestion | null {
  for (const r of RULES) if (r.re.test(text)) return { label: r.label, line: r.line };
  return null;
}
