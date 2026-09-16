export interface ValidationResult { isValid: boolean; errors: string[]; warnings: string[] }
export function validateReport(report: string, modality: string): ValidationResult {
  const errors: string[] = []; const warnings: string[] = [];
  const up = report.toUpperCase();
  if (!up.includes("FINDINGS")) errors.push("Missing FINDINGS");
  if (!up.includes("IMPRESSION")) errors.push("Missing IMPRESSION");
  if (!up.includes("TECHNIQUE")) warnings.push("Missing TECHNIQUE");
  if (!/correlate clinically/i.test(report)) warnings.push('Consider ending with "Please correlate clinically."');
  if (/protrusion\/extrusion/i.test(report)) warnings.push("Do not merge protrusion/extrusion");
  if (/spine/i.test(modality) && !/AP DIAMETERS/i.test(report)) warnings.push("Spine study: include AP diameters if supplied");
  return { isValid: errors.length === 0, errors, warnings };
}
