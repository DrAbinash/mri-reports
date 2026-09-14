"use client";
/**
 * Workspace enhancements — the good ideas ported from the big
 * RadiologyReportingWorkspace design, right-sized for the Studio:
 *
 *   • patient accent — deterministic identity colour (wrong-patient guard)
 *   • critical findings — keyword interrupt + acknowledgement state + SLA clock
 *   • quality gate — pre-finalize checklist with a 0–100 score
 *   • snippet macros — “:trigger + Tab” expansion with $1 placeholders
 *   • draft snapshots — localStorage safety net for the open report
 *   • read loop — zero-click auto-advance preference
 *
 * All localStorage-backed — no schema change, safe on SQLite.
 */

// ─── Patient identity accent ────────────────────────────────────────────────

const ACCENT_HUES = [
  { name: "violet", h: 262 }, { name: "cyan", h: 192 }, { name: "rose", h: 347 },
  { name: "amber", h: 38 }, { name: "emerald", h: 152 }, { name: "blue", h: 217 },
  { name: "fuchsia", h: 297 }, { name: "teal", h: 172 },
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic accent for a patient — same name+MRN always paints the same colour. */
export function patientAccent(name: string, mrn?: string | null) {
  const h = ACCENT_HUES[hashString(`${name}|${mrn ?? ""}`) % ACCENT_HUES.length];
  const h2 = (h.h + 24) % 360;
  return {
    name: h.name,
    band: `linear-gradient(90deg, hsl(${h.h} 78% 56%), hsl(${h2} 74% 52%))`,
    soft: `hsl(${h.h} 78% 96%)`,
    dot: `hsl(${h.h} 70% 48%)`,
    text: `hsl(${h.h} 60% 34%)`,
  };
}

// ─── Critical findings interrupt ────────────────────────────────────────────

export type CriticalHit = { phrase: string; where: string; rowId?: string };

/**
 * Keyword net for results a radiologist must actively communicate.
 * Matched case-insensitively as whole words against finding/impression text.
 */
const CRITICAL_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bpneumothorax\b/i, label: "pneumothorax" },
  { re: /\btension\s+pneumothorax\b/i, label: "tension pneumothorax" },
  { re: /\bhemothorax\b/i, label: "hemothorax" },
  { re: /\baortic\s+(?:dissection|aneurysm\s+rupture|transection)\b/i, label: "aortic dissection/rupture" },
  { re: /(?<!\bno\s+)free\s+(?:fluid|air|intraperitoneal\s+air|perforation)\b/i, label: "free fluid/air" },
  { re: /\bperforat\w*/i, label: "perforation" },
  { re: /\b(?:intracranial|intracerebral|subarachnoid|subdural|epidural|intraparenchymal|intraventricular)\s+hemorrhage\b/i, label: "intracranial hemorrhage" },
  { re: /\bmidline\s+shift\b/i, label: "midline shift" },
  { re: /\bhydrocephalus\b/i, label: "hydrocephalus" },
  { re: /\bcerebral\s+(?:edema|infarct\w*|venous\s+sinus\s+thrombosis)\b/i, label: "cerebral edema / infarct / CVST" },
  { re: /\b(?:suspicious|likely)\s+(?:for\s+)?malignan\w+|carcinomatosis\b/i, label: "suspicious for malignancy" },
  { re: /\bectopic\s+(?:pregnancy|gestation)\b/i, label: "ectopic pregnancy" },
  { re: /\btubo[-\s]ovarian\s+(?:abscess|mass)\b/i, label: "tubo-ovarian abscess" },
  { re: /\b(?:ovarian|adnexal)\s+torsion\b/i, label: "ovarian torsion" },
  { re: /\btesticular\s+torsion\b/i, label: "testicular torsion" },
  { re: /\bappendicitis\b/i, label: "appendicitis" },
  { re: /\b(?:displaced|depressed)\s+(?:fracture|calvarial\s+fracture)\b/i, label: "displaced fracture" },
  { re: /\bacute\s+(?:ischemic\s+)?stroke\b/i, label: "acute stroke" },
  { re: /\bpulmonary\s+embolism\b/i, label: "pulmonary embolism" },
  { re: /\bretained\s+(?:products|foreign\s+body)\b/i, label: "retained products/body" },
  { re: /\babruptio\s+placentae?\b|\bplacental\s+abruption\b/i, label: "placental abruption" },
  { re: /\bplacenta\s+(?:previa|accreta|percreta)\b/i, label: "placenta previa/accreta" },
];

/** Scan report text surfaces; returns the hits with enough context to highlight. */
export function scanCritical(input: {
  findings?: { id: string; text: string }[];
  impression?: string;
  recommendation?: string;
}): CriticalHit[] {
  const hits: CriticalHit[] = [];
  const seen = new Set<string>();
  const test = (text: string, where: string, rowId?: string) => {
    if (!text) return;
    for (const p of CRITICAL_PATTERNS) {
      if (p.re.test(text)) {
        const key = `${p.label}|${where}`;
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({ phrase: p.label, where, rowId });
        }
      }
    }
  };
  for (const f of input.findings ?? []) test(f.text, "findings", f.id);
  test(input.impression ?? "", "impression");
  test(input.recommendation ?? "", "recommendation");
  return hits;
}

// Critical acknowledgement state — localStorage keyed by report id.
const CRIT_KEY = "care-studio:critical-ack";

export type CriticalAck = { hits: string[]; detectedAt: number; acknowledgedAt: number | null; communicatedAt: number | null };

export function readCriticalAck(reportId: string): CriticalAck | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(CRIT_KEY) ?? "{}") as Record<string, CriticalAck>;
    return all[reportId] ?? null;
  } catch { return null; }
}

export function writeCriticalAck(reportId: string, ack: CriticalAck) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(CRIT_KEY) ?? "{}") as Record<string, CriticalAck>;
    all[reportId] = ack;
    // Keep only the newest 200 entries to stay well under quota.
    const trimmed = Object.fromEntries(
      Object.entries(all)
        .sort((a, b) => (b[1].detectedAt ?? 0) - (a[1].detectedAt ?? 0))
        .slice(0, 200),
    );
    localStorage.setItem(CRIT_KEY, JSON.stringify(trimmed));
  } catch { /* quota — ignore */ }
}

/** Formats an SLA-style elapsed clock, e.g. 4:07. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Pre-finalize quality gate ─────────────────────────────────────────────

export type QualityCheck = { id: string; label: string; ok: boolean; weight: number; hint: string };

export function qualityGate(input: {
  technique: string;
  opening?: string;
  findingsCount: number;
  impression: string;
  recommendation: string;
  criticalHits: number;
  criticalCommunicated: boolean;
}): { checks: QualityCheck[]; score: number; blocking: boolean } {
  const checks: QualityCheck[] = [
    { id: "findings", label: "At least one finding", ok: input.findingsCount > 0, weight: 30, hint: "Tap a phrase chip or apply a report format first." },
    { id: "impression", label: "Impression is not empty", ok: input.impression.trim().length > 0, weight: 30, hint: "Quote findings (the “ icon) or type the impression." },
    { id: "technique", label: "Technique filled", ok: input.technique.trim().length > 0, weight: 15, hint: "Describe sequences / method — one line is enough." },
    { id: "critical", label: "Critical findings communicated", ok: input.criticalHits === 0 || input.criticalCommunicated, weight: 25, hint: "Use the red banner to mark the critical result as communicated." },
    { id: "recommendation", label: "Recommendation present", ok: input.recommendation.trim().length > 0, weight: 0, hint: "Optional — advised when follow-up changes management." },
  ];
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  const score = Math.round((got / total) * 100);
  return { checks, score, blocking: !checks.find((c) => c.id === "findings")!.ok || !checks.find((c) => c.id === "impression")!.ok };
}

// ─── Snippet macros (“:trigger + Tab”) ─────────────────────────────────────

export type Snippet = { trigger: string; text: string; builtin?: boolean };

const BUILTIN_SNIPPETS: Snippet[] = [
  { trigger: "nsa", text: "No significant abnormality detected.", builtin: true },
  { trigger: "wnl", text: "Within normal limits.", builtin: true },
  { trigger: "cc", text: "Correlate clinically.", builtin: true },
  { trigger: "fu6", text: "Follow-up ultrasound after 6 weeks is advised.", builtin: true },
  { trigger: "fu3", text: "Follow-up ultrasound after 3 weeks is advised.", builtin: true },
  { trigger: "fum3", text: "Follow-up MRI brain after 3 months is advised.", builtin: true },
  { trigger: "fum6", text: "Follow-up MRI after 6 months is advised.", builtin: true },
  { trigger: "cd", text: "Clinical correlation is advised.", builtin: true },
  { trigger: "surg", text: "Surgical consultation is advised.", builtin: true },
  { trigger: "usg", text: "An ultrasound examination is advised for further evaluation.", builtin: true },
  { trigger: "mri", text: "MRI is advised for further characterisation.", builtin: true },
  { trigger: "ct", text: "Contrast-enhanced CT is advised for further evaluation.", builtin: true },
  { trigger: "comp", text: "Comparison with previous imaging is advised.", builtin: true },
];

const SNIP_KEY = "care-studio:snippets";

export function readSnippets(): Snippet[] {
  if (typeof window === "undefined") return BUILTIN_SNIPPETS;
  try {
    const custom = JSON.parse(localStorage.getItem(SNIP_KEY) ?? "[]") as Snippet[];
    // custom wins over builtin with the same trigger
    const byTrigger = new Map<string, Snippet>();
    for (const s of [...BUILTIN_SNIPPETS, ...custom]) byTrigger.set(s.trigger, s);
    return [...byTrigger.values()];
  } catch { return BUILTIN_SNIPPETS; }
}

export function saveCustomSnippets(custom: Snippet[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNIP_KEY, JSON.stringify(custom.filter((s) => !s.builtin && s.trigger && s.text)));
}

/**
 * Find the `:trigger` immediately before the caret and expand it.
 * Returns the new value + caret position, or null when nothing matched.
 * `$1`, `$2`… are placeholders: the first one is selected for overtyping.
 */
export function expandSnippet(
  value: string,
  caret: number,
  snippets: Snippet[],
): { value: string; caret: number; select?: [number, number]; label: string } | null {
  const before = value.slice(0, caret);
  const m = before.match(/(?:^|[\s(;;.!?—-]):([a-z0-9]+)$/i);
  if (!m) return null;
  const trigger = m[1].toLowerCase();
  const snip = snippets.find((s) => s.trigger.toLowerCase() === trigger);
  if (!snip) return null;
  const start = caret - trigger.length - 1;
  const text = snip.text;
  const next = value.slice(0, start) + text + value.slice(caret);
  const ph = text.indexOf("$1");
  if (ph >= 0) {
    const abs = start + ph;
    return { value: next.replace("$1", ""), caret: abs, select: [abs, abs], label: snip.text };
  }
  return { value: next, caret: start + text.length, label: snip.text };
}

// ─── Draft snapshots (localStorage safety net) ──────────────────────────────

const SNAP_KEY = "care-studio:draft-snapshots";

export type DraftSnapshot = {
  reportId: string;
  accession: string;
  patientName: string;
  technique: string;
  impression: string;
  recommendation: string;
  opening: string;
  rows: { text: string; concept: string }[];
  at: number;
};

export function saveDraftSnapshot(snap: DraftSnapshot) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "{}") as Record<string, DraftSnapshot[]>;
    const list = all[snap.reportId] ?? [];
    const last = list[0];
    // Skip no-op snapshots (same content, newer timestamp)
    if (last && last.impression === snap.impression && last.technique === snap.technique &&
        last.recommendation === snap.recommendation && last.opening === snap.opening &&
        JSON.stringify(last.rows) === JSON.stringify(snap.rows)) return;
    all[snap.reportId] = [snap, ...list].slice(0, 10);
    const ids = Object.keys(all).sort((a, b) => (all[b][0]?.at ?? 0) - (all[a][0]?.at ?? 0)).slice(0, 25);
    localStorage.setItem(SNAP_KEY, JSON.stringify(Object.fromEntries(ids.map((i) => [i, all[i]]))));
  } catch { /* quota — ignore */ }
}

export function listDraftSnapshots(reportId: string): DraftSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "{}") as Record<string, DraftSnapshot[]>;
    return all[reportId] ?? [];
  } catch { return []; }
}

export function clearDraftSnapshots(reportId: string) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "{}") as Record<string, DraftSnapshot[]>;
    delete all[reportId];
    localStorage.setItem(SNAP_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ─── Read loop (zero-click auto-advance) ────────────────────────────────────

const LOOP_KEY = "care-studio:read-loop";

export function readLoopEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LOOP_KEY) === "1";
}

export function setReadLoopEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOOP_KEY, on ? "1" : "0");
}

// ─── Next-study prefetch cache ─────────────────────────────────────────────

const prefetchCache = new Map<string, unknown>();

/** Fire-and-forget prefetch of the next report bundle (idempotent server side). */
export async function prefetchReportBundle(orderId: string): Promise<void> {
  if (prefetchCache.has(orderId)) return;
  prefetchCache.set(orderId, "pending");
  try {
    const boot = await fetch(`/api/orders/${orderId}/report`, { method: "POST" }).then((r) => r.json());
    if (boot?.reportId) {
      await fetch(`/api/reports/${boot.reportId}`).then((r) => r.json()).catch(() => null);
      prefetchCache.set(orderId, boot.reportId);
    }
  } catch {
    prefetchCache.delete(orderId);
  }
}
