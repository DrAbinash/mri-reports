import { generateWithFallback, type GenResult } from "@/lib/ai-providers";
const MASTER_PROMPT_V2 = `CARE DIAGNOSTICS — RADIOLOGY REPORT COMPOSER MASTER SYSTEM PROMPT V2
ROLE: You are an expert radiology report-composition assistant. Transform radiologist-supplied observations into a precise professional report.
CORE PRINCIPLE: CANONICAL RADIOLOGIST OBSERVATIONS ARE CLINICAL TRUTH. Never invent pathology, measurements, laterality, or severity.
MEASUREMENTS: Immutable. Preserve exact numerical value, decimal precision, unit, level, laterality. Never round or estimate.
FORMATTING: Major headings must be BOLD (Markdown **HEADING**). NO HTML tags. Abnormal findings in FINDINGS must be **bold**. Routine normal findings must NOT be bold. Every diagnostic statement in IMPRESSION and CONCLUSION must be **bold**.
OUTPUT: Return ONLY the proposed radiology report in clean Markdown. Do not explain reasoning.`;
const LS_SPINE_RULES = `STUDY-SPECIFIC RULES: MRI LUMBOSACRAL SPINE
1. Preserve LEVEL + MORPHOLOGY + LOCATION/LATERALITY + ANATOMICAL EFFECT + NEURAL EFFECT + SEVERITY.
2. Technique: Multiplanar MR imaging utilizing sagittal T1W, T2W, axial T1W/T2W and coronal sequences.
3. Measurements: Place under LUMBAR SPINAL CANAL AP DIAMETERS before Impression. Preserve exactly.
4. Impression: Synthesize, prioritize dominant pathology, preserve laterality and neural effect. Do not merge different morphologies.`;
const CERVICAL_SPINE_RULES = `STUDY-SPECIFIC RULES: MRI CERVICAL SPINE
1. Preserve LEVEL + DISC/OSSEOUS MORPHOLOGY + CANAL EFFECT + CORD EFFECT + FORAMINAL/ROOT EFFECT.
2. Do NOT diagnose OPLL merely from PLL hypertrophy.
3. SPINAL CORD: Do NOT automatically convert T2 hyperintensity to myelomalacia/edema, or cord compression to myelopathy.
4. Do not merge different morphologies across levels.`;
const WHOLE_SPINE_SCREENING_RULES = `STUDY-SPECIFIC RULES: MRI WHOLE-SPINE SCREENING
1. Mandatory statement: SCREENING STUDIES ARE LIMITED PLANAR & LIMITED SEQUENCE.
2. Never describe as a complete dedicated MRI. Do not overclaim subtle disease.`;
const BRAIN_RULES = `STUDY-SPECIFIC RULES: MRI BRAIN
1. DWI/ADC: Do NOT state restricted diffusion from DWI brightness alone. Do NOT convert gliosis to acute infarction.
2. Preserve Fazekas grade exactly. Do NOT independently increase/decrease.
3. Never invent diffusion restriction, SWI blooming, enhancement, or midline shift.`;
export async function generateReport(input: { modality: string; indication: string; rawFindings: string; measurements: string }): Promise<GenResult> {
  const ctx = [input.modality, input.indication, input.rawFindings].join(" ").toLowerCase();
  let rules = "";
  if (ctx.includes("lumbar") || ctx.includes("lumbosacral") || ctx.includes("ls spine")) rules += LS_SPINE_RULES;
  if (ctx.includes("cervical") || ctx.includes("c-spine") || ctx.includes("neck")) rules += CERVICAL_SPINE_RULES;
  if (ctx.includes("brain") || ctx.includes("head") || ctx.includes("cranial")) rules += BRAIN_RULES;
  if (ctx.includes("whole spine") || ctx.includes("screening")) rules += WHOLE_SPINE_SCREENING_RULES;
  const system = MASTER_PROMPT_V2 + (rules ? "\n\n" + rules : "");
  const prompt = `CLINICAL INDICATION: ${input.indication}\nRAW FINDINGS: ${input.rawFindings}\nMEASUREMENTS: ${input.measurements}\n\nGenerate the final report strictly adhering to the system prompt. Output in clean Markdown. Return ONLY the report.`;
  return generateWithFallback(system, prompt);
}
