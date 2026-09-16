export interface VisionImage { base64: string; label?: string }
export interface VisionResult { text: string; model: string; timestamp: string; imageCount: number }

function cleanBase64(img: string): string {
  const match = img.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
  return match ? match[1] : img;
}

export async function analyseImages(
  images: VisionImage[],
  context: { modality?: string; bodyPart?: string; clinicalInfo?: string } = {}
): Promise<VisionResult> {
  if (images.length === 0) throw new Error('No images supplied');

  const ollamaUrl = process.env.OLLAMA_URL || 'http://172.16.1.140:11434';
  const model = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:8b';

  // Dynamically adapt your prompt to the correct anatomy
  const bp = (context.bodyPart || '').toLowerCase();
  const anatomy = bp.includes('brain') || bp.includes('head') ? 'brain' :
                  bp.includes('lumbar') || bp.includes('ls') ? 'lumbar spine' :
                  bp.includes('cervical') || bp.includes('neck') ? 'cervical spine' :
                  'the requested';

  const systemPrompt = `Analyze ONLY the supplied image.

Do not create a radiology report.

Tell me:
1. Whether ${anatomy} anatomy is actually visible.
2. What MRI plane is visible.
3. What sequence is most likely, only if reasonably identifiable.
4. Visible abnormal observations.
5. Any visible measurement annotations.

If the image is not actually available to you, output exactly:

VISION INPUT NOT RECEIVED

Do not output reasoning.`;

  const userPrompt = `Modality: ${context.modality || 'MRI'}. Body Part: ${context.bodyPart || 'Not specified'}.`;

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      images: images.map(i => cleanBase64(i.base64)),
      stream: false,
      options: {
        temperature: 0.10,
        top_p: 0.80,
        top_k: 20,
        repeat_penalty: 1.05,
        num_ctx: 4096,
        num_predict: 1800,
        seed: 42,
      }
    })
  });

  if (!response.ok) throw new Error(`Vision model failed: ${response.statusText}`);
  const data = await response.json();
  const text = data.response || '';

  // STRICT TRAP: If the model outputs your exact failure phrase, abort.
  if (text.includes('VISION INPUT NOT RECEIVED')) {
    throw new Error('VISION INPUT FAILURE: The model reported it cannot see the image bytes. Check Ollama vision routing.');
  }

  return {
    text,
    model,
    timestamp: new Date().toISOString(),
    imageCount: images.length,
  };
}

export function parseObservations(visionText: string): string[] {
  return visionText
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 5 && !line.toLowerCase().includes('not visible') && !line.toLowerCase().includes('none'));
}

export function detectConflicts(obs: string[], findings: string): Array<{ observation: string; reason: string }> {
  const conflicts: Array<{ observation: string; reason: string }> = [];
  const f = findings.toLowerCase();
  const pairs: Array<[RegExp, RegExp, string]> = [
    [/cord\s+(signal\s+abnormality|hyperintensity)/i, /cord\s+signal\s+(normal|unremarkable)/i, "Cord signal differs"],
    [/restricted\s+diffusion|acute\s+infarct/i, /no\s+acute\s+infarct|chronic\s+infarct/i, "Diffusion/acuity differs"],
    [/midline\s+shift|mass\s+effect/i, /no\s+(midline\s+shift|mass\s+effect)/i, "Mass effect differs"],
  ];
  for (const o of obs) for (const [a, b, reason] of pairs) if (a.test(o) && b.test(f)) conflicts.push({ observation: o, reason });
  return conflicts;
}
