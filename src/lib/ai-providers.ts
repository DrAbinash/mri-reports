export interface GenResult { text: string; provider: string; model: string; fallback: boolean }
async function tryOllama(system: string, prompt: string, images?: string[]): Promise<GenResult | null> {
  const url = process.env.OLLAMA_URL || "http://172.16.1.140:11434";
  const model = images?.length ? (process.env.OLLAMA_VISION_MODEL || "qwen3-vl:8b") : (process.env.OLLAMA_MODEL || "qwen3:14b");
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), Number(process.env.AI_TIMEOUT_SECONDS || 120) * 1000);
    const res = await fetch(`${url}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ model, system, prompt, images: images?.length ? images : undefined, stream: false,
        options: { temperature: 0.1, top_p: 0.9, num_ctx: Number(process.env.OLLAMA_NUM_CTX || 16384) } }) });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.response) return null;
    return { text: data.response, provider: "LOCAL OLLAMA (GPU)", model, fallback: false };
  } catch { return null; }
}
async function tryCompat(system: string, prompt: string, images: string[] | undefined, cfg: { base?: string; key?: string; model: string; label: string }): Promise<GenResult | null> {
  if (!cfg.base || !cfg.key) return null;
  const content = images?.length
    ? [{ type: "text", text: prompt }, ...images.map(b => ({ type: "image_url", image_url: { url: `data:image/png;base64,${b}` } }))]
    : prompt;
  try {
    const res = await fetch(`${cfg.base.replace(/\/$/, "")}/chat/completions`, { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: "system", content: system }, { role: "user", content }], temperature: 0.1, max_tokens: 2048 }) });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return { text, provider: cfg.label, model: cfg.model, fallback: true };
  } catch { return null; }
}
export async function generateWithFallback(system: string, prompt: string, images?: string[]): Promise<GenResult> {
  const local = await tryOllama(system, prompt, images);
  if (local) return local;
  const qwen = await tryCompat(system, prompt, images, { base: process.env.QWEN_BASE_URL, key: process.env.QWEN_API_KEY,
    model: images?.length ? (process.env.QWEN_VISION_MODEL || "qwen-vl-max") : (process.env.QWEN_MODEL || "qwen-plus"), label: "CLOUD QWEN (Alibaba)" });
  if (qwen) return qwen;
  if (!images?.length) {
    const ds = await tryCompat(system, prompt, undefined, { base: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com", key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat", label: "CLOUD DEEPSEEK" });
    if (ds) return ds;
  }
  throw new Error("All AI providers unreachable (local Ollama, Qwen cloud, DeepSeek).");
}
