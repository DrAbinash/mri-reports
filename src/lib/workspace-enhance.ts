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

export type Snippet = { trigger: string; text: string; label?: string; category?: string; builtin?: boolean };

/** Display order for snippet categories (usg-style grouped browsing). */
export const SNIPPET_CATEGORIES = ["General", "MRI Brain", "MRI Spine", "Joints / MSK", "CT", "X-ray"] as const;

/** Palette → text-box insert bridge (CustomEvent name). */
export const SNIPPET_INSERT_EVENT = "care-studio:snippet-insert";

/** Set to true by the SmartTextarea that accepts an insert — lets the palette
 *  tell the doctor when no text box was active instead of silently dropping it. */
export const snippetInsertAck = { ok: false };

const S = (category: string, trigger: string, label: string, text: string): Snippet => ({ trigger, label, text, category, builtin: true });

/**
 * Built-in library — grounded in the doctor's own format-library language
 * (src/lib/formats/*) so macros match the reporting style already in use.
 */
const BUILTIN_SNIPPETS: Snippet[] = [
  // — General —
  S("General", "nsa", "No significant abnormality", "No significant abnormality detected."),
  S("General", "wnl", "Within normal limits", "Within normal limits."),
  S("General", "cc", "Correlate clinically", "Correlate clinically."),
  S("General", "cd", "Clinical correlation advised", "Clinical correlation is advised."),
  S("General", "surg", "Surgical consultation", "Surgical consultation is advised."),
  S("General", "nsurg", "Neurosurgical consultation", "Neurosurgical consultation is advised."),
  S("General", "orth", "Orthopaedic consultation", "Orthopaedic consultation is advised."),
  S("General", "fu6", "Follow-up USG 6 weeks", "Follow-up ultrasound after 6 weeks is advised."),
  S("General", "fu3", "Follow-up USG 3 weeks", "Follow-up ultrasound after 3 weeks is advised."),
  S("General", "fum3", "Follow-up MRI brain 3 months", "Follow-up MRI brain after 3 months is advised."),
  S("General", "fum6", "Follow-up MRI 6 months", "Follow-up MRI after 6 months is advised."),
  S("General", "fuct", "Follow-up CT", "Follow-up CT after $1 is advised."),
  S("General", "usg", "Advise USG", "An ultrasound examination is advised for further evaluation."),
  S("General", "mri", "Advise MRI", "MRI is advised for further characterisation."),
  S("General", "mrice", "Advise CE-MRI", "Contrast-enhanced MRI is advised for further characterisation."),
  S("General", "ct", "Advise CECT", "Contrast-enhanced CT is advised for further evaluation."),
  S("General", "comp", "Compare with previous", "Comparison with previous imaging is advised."),

  // — MRI Brain —
  S("MRI Brain", "stroke", "Acute infarct (DWI+)", "Acute infarct — area of restricted diffusion on DWI with corresponding low signal on ADC in the $1 territory."),
  S("MRI Brain", "glio", "? Glioma — SOL with oedema", "Space-occupying lesion in the $1 with perilesional oedema — ? glioma. Contrast-enhanced study with spectroscopy is advised."),
  S("MRI Brain", "mets", "? Metastases — multiple SOLs", "Multiple space-occupying lesions of varying sizes in both cerebral and cerebellar hemispheres — ? metastases. CT chest / abdomen to search for primary is advised."),
  S("MRI Brain", "demy", "Demyelinating plaques", "Demyelinating plaques in periventricular and juxtacortical white matter — ? multiple sclerosis / acute demyelinating encephalomyelitis."),
  S("MRI Brain", "nph", "? Normal pressure hydrocephalus", "Disproportionate ventriculomegaly with preservation of sulcal spaces — ? normal pressure hydrocephalus."),
  S("MRI Brain", "atroph", "Diffuse cerebral atrophy", "Diffuse cerebral cortical atrophy with ex-vacuo ventricular dilatation."),
  S("MRI Brain", "hydro", "Obstructive hydrocephalus", "Obstructive hydrocephalus with periventricular interstitial oedema."),
  S("MRI Brain", "sah", "Subarachnoid haemorrhage", "Acute subarachnoid haemorrhage in the basal cisterns and cortical sulci. CT angiography is advised."),
  S("MRI Brain", "sdh", "Subdural haematoma", "Subdural haematoma over the $1 cerebral convexity with mass effect."),
  S("MRI Brain", "edh", "Epidural haematoma", "Epidural haematoma — lentiform extra-axial collection with mass effect."),
  S("MRI Brain", "edema", "Cerebral oedema", "Diffuse cerebral oedema with effacement of the sulci and cisterns."),
  S("MRI Brain", "shift", "Midline shift", "Midline shift of the septum pellucidum to the $1 side."),
  S("MRI Brain", "pit", "? Pituitary microadenoma", "Small well-defined lesion in the pituitary gland — ? microadenoma. Dynamic contrast MRI of the sella is advised."),
  S("MRI Brain", "cpa", "? Vestibular schwannoma", "Well-defined extra-axial lesion in the $1 cerebellopontine angle with extension into the internal acoustic meatus — ? vestibular schwannoma."),
  S("MRI Brain", "cvst", "? Venous sinus thrombosis", "Loss of normal flow void in the $1 venous sinus with altered signal in the adjacent parenchyma — ? sinus thrombosis. MRV is advised."),
  S("MRI Brain", "ence", "? Encephalitis", "Altered signal with swelling in the $1 temporal lobe — ? encephalitis."),
  S("MRI Brain", "pvi", "Chronic small vessel ischaemia", "Chronic periventricular ischaemic changes (microangiopathy)."),
  S("MRI Brain", "dwi", "No restricted diffusion (normal)", "No area of restricted diffusion is seen on DWI / ADC."),

  // — MRI Spine —
  S("MRI Spine", "loss", "Loss of cervical lordosis", "Evidence of loss of cervical lordosis — ? due to muscle spasm."),
  S("MRI Spine", "bulge", "Diffuse disc bulge", "Diffuse disc bulge at $1 indenting the thecal sac and narrowing the neural foramina."),
  S("MRI Spine", "hernia", "Disc extrusion", "Posterocentral disc extrusion at $1 indenting the thecal sac and compressing the traversing nerve roots."),
  S("MRI Spine", "annular", "Annular tear", "Posterior central annular tear at $1."),
  S("MRI Spine", "steno", "Canal stenosis", "Significant spinal canal stenosis at $1."),
  S("MRI Spine", "facet", "Facetal + flavum hypertrophy", "Hypertrophy of facet joints at $1 contributing to canal and foraminal narrowing. Ligamentum flavum hypertrophy is also noted."),
  S("MRI Spine", "listh", "Anterolisthesis", "Anterolisthesis of $1 vertebra over the adjacent vertebra."),
  S("MRI Spine", "nerve", "Nerve root compression", "Compression over the $1 nerve root."),
  S("MRI Spine", "marrow", "Modic endplate change", "Degenerative endplate marrow (Modic type $1) changes."),
  S("MRI Spine", "cord", "Cord normal (normal)", "No intramedullary signal alteration in the visualised spinal cord."),
  S("MRI Spine", "conus", "Conus normal (normal)", "Conus ends at L1 level and appears normal."),
  S("MRI Spine", "physio", "Physiotherapy advice", "Physiotherapy and back strengthening exercises are advised."),

  // — Joints / MSK —
  S("Joints / MSK", "acl", "ACL complete tear", "Complete tear of the anterior cruciate ligament with discontinuity of the fibres."),
  S("Joints / MSK", "mm", "Medial meniscus tear", "Oblique tear of the posterior horn of the medial meniscus."),
  S("Joints / MSK", "bucket", "Bucket-handle tear", "Bucket-handle tear of the $1 meniscus with displaced fragment."),
  S("Joints / MSK", "bankart", "Hill-Sachs + Bankart", "Hill-Sachs lesion of the $1 humeral head with anteroinferior labral tear (Bankart lesion)."),
  S("Joints / MSK", "rotator", "Supraspinatus full-thickness tear", "Full-thickness tear of the supraspinatus tendon with retraction of the torn edge."),
  S("Joints / MSK", "effusion", "Joint effusion", "Joint effusion is noted."),
  S("Joints / MSK", "baker", "Baker's cyst", "Baker's cyst (popliteal cyst) is noted."),
  S("Joints / MSK", "bruise", "Bone marrow oedema", "Bone marrow oedema / bone bruise in the $1."),
  S("Joints / MSK", "tendin", "Tendinosis", "Tendinosis of the $1 tendon."),

  // — CT —
  S("CT", "bleed", "Intracerebral haemorrhage", "Acute intracerebral haemorrhage in the $1 with perilesional oedema."),
  S("CT", "contus", "Cerebral contusion", "Cerebral contusion in the $1 lobe."),
  S("CT", "fatty", "Fatty liver", "Diffuse hypodensity of the hepatic parenchyma — fatty infiltration."),
  S("CT", "hepato", "Hepatomegaly", "Hepatomegaly."),
  S("CT", "nodes", "Retroperitoneal nodes", "Retroperitoneal lymphadenopathy."),
  S("CT", "stoneu", "Ureteric calculus", "Ureteric calculus with mild hydroureteronephrosis."),
  S("CT", "hydroneph", "Hydronephrosis", "Hydronephrosis with cortical thinning of the $1 kidney."),
  S("CT", "appendic", "Acute appendicitis", "Inflamed, non-compressible appendix with periappendicular fat stranding — acute appendicitis."),
  S("CT", "divertic", "Diverticulitis", "Diverticula of the $1 colon with pericolic fat stranding."),
  S("CT", "nodule", "Solitary pulmonary nodule", "Solitary pulmonary nodule in the $1 lung. Follow-up as per Fleischner guidelines."),
  S("CT", "ggo", "Ground-glass opacities", "Bilateral ground-glass opacities in both lungs."),
  S("CT", "consol", "Consolidation", "Consolidation in the $1 lung."),
  S("CT", "pleural", "Pleural effusion", "Pleural effusion on the $1 side."),
  S("CT", "pneumo", "Pneumothorax", "Pneumothorax on the $1 side."),
  S("CT", "bronch", "Bronchiectasis", "Cylindrical bronchiectatic changes in the $1 lower lobe."),
  S("CT", "dissect", "Aortic dissection", "Intimal flap seen in the $1 — aortic dissection. Urgent surgical consultation is advised."),
  S("CT", "aaa", "Aortic aneurysm", "Fusiform dilatation of the abdominal aorta (aneurysm) measuring $1 cm."),

  // — X-ray —
  S("X-ray", "fx", "Fracture", "Fracture of the $1."),
  S("X-ray", "nofx", "No fracture (normal)", "No fracture or dislocation is seen."),
  S("X-ray", "colles", "Colles' fracture", "Transverse fracture of the distal end of the radius with dorsal displacement — Colles' fracture."),
  S("X-ray", "nof", "Fracture neck of femur", "Fracture of the neck of the $1 femur."),
  S("X-ray", "wedge", "Anterior vertebral wedging", "Anterior wedging of the $1 vertebral body."),
  S("X-ray", "osteophy", "Marginal osteophytes", "Anterior marginal osteophytes at $1 vertebrae."),
  S("X-ray", "cpfree", "CP angles free (normal)", "Bilateral costo-phrenic and cardio-phrenic angles are free."),
  S("X-ray", "clear", "Lung fields clear (normal)", "Bilateral lung fields are clear."),
  S("X-ray", "cardio", "Cardiomegaly", "Cardiothoracic ratio is increased — cardiomegaly."),
  S("X-ray", "osteopen", "Osteopenia", "Osteopenia with reduction in bone density."),
  S("X-ray", "arthrit", "Osteoarthritis", "Degenerative osteoarthritic changes with joint space narrowing."),
  S("X-ray", "spondy", "Spondylotic changes", "Spondylotic changes in the $1 spine."),
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
 * Autocomplete matching: prefix hits on the trigger rank first, then
 * contains-hits over trigger / label / text / category.
 */
export function matchPartialSnippets(partial: string, snippets: Snippet[], limit = 7): Snippet[] {
  const p = partial.trim().toLowerCase();
  if (!p) return snippets.slice(0, limit);
  const starts = snippets.filter((s) => s.trigger.toLowerCase().startsWith(p));
  const rest = snippets.filter((s) =>
    !s.trigger.toLowerCase().startsWith(p) &&
    (s.trigger.toLowerCase().includes(p) ||
      (s.label ?? "").toLowerCase().includes(p) ||
      s.text.toLowerCase().includes(p) ||
      (s.category ?? "").toLowerCase().includes(p)));
  return [...starts, ...rest].slice(0, limit);
}

/** Case-insensitive contains search (Settings → Productivity search box). */
export function searchSnippets(query: string, snippets: Snippet[]): Snippet[] {
  const q = query.trim().toLowerCase();
  if (!q) return snippets;
  return snippets.filter((s) =>
    s.trigger.toLowerCase().includes(q) ||
    (s.label ?? "").toLowerCase().includes(q) ||
    s.text.toLowerCase().includes(q) ||
    (s.category ?? "").toLowerCase().includes(q));
}

/** Validate + normalise snippets parsed from an imported JSON file. */
export function normalizeImportedSnippets(raw: unknown): Snippet[] {
  if (!Array.isArray(raw)) return [];
  const out: Snippet[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const trigger = String((r as Record<string, unknown>).trigger ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const text = String((r as Record<string, unknown>).text ?? "").trim();
    if (!trigger || !text || seen.has(trigger)) continue;
    seen.add(trigger);
    const label = (r as Record<string, unknown>).label;
    const category = (r as Record<string, unknown>).category;
    out.push({
      trigger, text,
      label: typeof label === "string" && label ? label : undefined,
      category: typeof category === "string" && category ? category : "Custom",
    });
  }
  return out;
}

/** The `:partial` regex used by both expand paths — shared to stay in sync. */
const TRIGGER_BEFORE_CARET = /(?:^|[\s(;;.!?—-]):([a-z0-9]+)$/i;

function applySnippet(value: string, caret: number, snip: Snippet, start: number) {
  const text = snip.text;
  const next = value.slice(0, start) + text + value.slice(caret);
  const ph = text.indexOf("$1");
  if (ph >= 0) {
    const abs = start + ph;
    return { value: next.replace("$1", ""), caret: abs, select: [abs, abs] as [number, number], label: snip.text };
  }
  return { value: next, caret: start + text.length, label: snip.text };
}

/**
 * Find the `:trigger` immediately before the caret and expand it.
 * Returns the new value + caret position, or null when nothing matched.
 * `$1` is a placeholder: it is removed and the caret lands there for overtyping.
 */
export function expandSnippet(
  value: string,
  caret: number,
  snippets: Snippet[],
): { value: string; caret: number; select?: [number, number]; label: string } | null {
  const m = value.slice(0, caret).match(TRIGGER_BEFORE_CARET);
  if (!m) return null;
  const trigger = m[1].toLowerCase();
  const snip = snippets.find((s) => s.trigger.toLowerCase() === trigger);
  if (!snip) return null;
  return applySnippet(value, caret, snip, caret - trigger.length - 1);
}

/**
 * Expand a chosen snippet over a partially-typed trigger (autocomplete path).
 * `partial` is the letters already typed after the “:”.
 */
export function expandSelectedSnippet(
  value: string,
  caret: number,
  snippet: Snippet,
  partial: string,
): { value: string; caret: number; select?: [number, number]; label: string } | null {
  const start = caret - partial.length - 1;
  if (start < 0 || value.slice(start, caret) !== `:${partial}`) return null;
  return applySnippet(value, caret, snippet, start);
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
