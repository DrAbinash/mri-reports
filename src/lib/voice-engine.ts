const MEDICAL_CORRECTIONS: Record<string, string> = {
  "el for el five": "L4-L5", "el five ess one": "L5-S1", "see five see six": "C5-C6",
  "l4 l5": "L4-L5", "l5 s1": "L5-S1", "c5 c6": "C5-C6",
  "disc osteophyte complex": "disc-osteophyte complex",
  "ligamentum flavum": "ligamentum flavum", "thecal sac": "thecal sac",
  "cauda equina": "cauda equina", "conus medullaris": "conus medullaris",
  "restricted diffusion": "restricted diffusion", "midline shift": "midline shift",
  "t1 weighted": "T1-weighted", "t2 weighted": "T2-weighted",
  "flair": "FLAIR", "dwi": "DWI", "adc": "ADC", "swi": "SWI", "stir": "STIR",
};
export const VOICE_COMMANDS: Record<string, string> = {
  "new level": "\n\n", "new finding": "\n- ", "new paragraph": "\n\n",
  "section technique": "\n\n**TECHNIQUE**\n\n", "section findings": "\n\n**FINDINGS**\n\n",
  "section impression": "\n\n**IMPRESSION**\n\n", "section conclusion": "\n\n**CONCLUSION**\n\n",
  "bold": "**", "end bold": "**",
  "correlate clinically": "Please correlate clinically.",
  "millimeters": " mm", "millimeter": " mm", "centimeters": " cm",
};
export function normalizeMedicalText(raw: string): string {
  let text = raw;
  const sorted = Object.entries(MEDICAL_CORRECTIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, right] of sorted) text = text.replace(new RegExp(wrong, "gi"), right);
  text = text.replace(/\bperiod\b/gi, ".").replace(/\bcomma\b/gi, ",").replace(/\bnew line\b/gi, "\n");
  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
  return text.trim();
}
export function parseVoiceCommand(t: string): { type: string; content: string } {
  const lower = t.toLowerCase().trim();
  for (const [cmd, rep] of Object.entries(VOICE_COMMANDS)) if (lower.startsWith(cmd)) return { type: "command", content: rep };
  return { type: "text", content: normalizeMedicalText(t) };
}
