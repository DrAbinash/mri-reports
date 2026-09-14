/**
 * Workspace enhancements — unit tests for the ported features:
 * patient accent, critical scan, quality gate, snippet expansion.
 */
import { describe, expect, it } from "vitest";
import {
  patientAccent, scanCritical, qualityGate, expandSnippet, expandSelectedSnippet, formatElapsed, readSnippets,
  matchPartialSnippets, searchSnippets, normalizeImportedSnippets, SNIPPET_CATEGORIES,
} from "@/lib/workspace-enhance";

describe("patientAccent", () => {
  it("is deterministic for the same name+MRN", () => {
    const a = patientAccent("Ramesh Kumar", "MRN-1");
    const b = patientAccent("Ramesh Kumar", "MRN-1");
    expect(a.band).toBe(b.band);
    expect(a.dot).toBe(b.dot);
  });

  it("differs across different patients (mostly)", () => {
    const colors = new Set(
      ["A Kumar", "B Devi", "C Singh", "D Das", "E Rai", "F Lal", "G Sharma", "H Verma", "I Yadav", "J Pandey"]
        .map((n) => patientAccent(n).name),
    );
    // 10 patients across 8 hues — at least 3 distinct accents expected.
    expect(colors.size).toBeGreaterThanOrEqual(3);
  });

  it("produces valid hsl colours", () => {
    expect(patientAccent("X").dot).toMatch(/^hsl\(\d+ 70% 48%\)$/);
  });
});

describe("scanCritical", () => {
  it("detects classic critical phrases", () => {
    const hits = scanCritical({
      findings: [{ id: "1", text: "Large left pneumothorax with midline shift." }],
      impression: "",
      recommendation: "",
    });
    const labels = hits.map((h) => h.phrase);
    expect(labels).toContain("pneumothorax");
    expect(labels).toContain("midline shift");
  });

  it("scans impression and recommendation too", () => {
    const hits = scanCritical({
      findings: [],
      impression: "Acute stroke in left MCA territory.",
      recommendation: "Surgical consultation is advised.",
    });
    expect(hits.some((h) => h.where === "impression")).toBe(true);
  });

  it("ignores benign text", () => {
    const hits = scanCritical({
      findings: [{ id: "1", text: "Small fibroid in anterior wall. No free fluid." }],
      impression: "Intramural fibroid.",
      recommendation: "",
    });
    expect(hits.length).toBe(0);
  });

  it("does not crash on empty input", () => {
    expect(scanCritical({}).length).toBe(0);
  });
});

describe("qualityGate", () => {
  it("blocks finalize when findings or impression are empty", () => {
    const g = qualityGate({
      technique: "", findingsCount: 0, impression: "", recommendation: "",
      criticalHits: 0, criticalCommunicated: false,
    });
    expect(g.blocking).toBe(true);
    // No critical findings → that one check passes (25 pts), everything else fails.
    expect(g.score).toBe(25);
  });

  it("passes a complete normal report at 100", () => {
    const g = qualityGate({
      technique: "Routine sequences obtained.",
      findingsCount: 3,
      impression: "No significant abnormality.",
      recommendation: "",
      criticalHits: 0,
      criticalCommunicated: false,
    });
    expect(g.blocking).toBe(false);
    expect(g.score).toBe(100); // recommendation has weight 0
  });

  it("penalises un-communicated critical findings but does not hard-block", () => {
    const g = qualityGate({
      technique: "CT chest.",
      findingsCount: 2,
      impression: "Pulmonary embolism.",
      recommendation: "",
      criticalHits: 1,
      criticalCommunicated: false,
    });
    expect(g.blocking).toBe(false);
    expect(g.score).toBe(75); // 100 - critical weight 25
  });
});

describe("snippet macros", () => {
  const snippets = readSnippets();

  it("ships useful built-ins", () => {
    const triggers = snippets.map((s) => s.trigger);
    expect(triggers).toContain("nsa");
    expect(triggers).toContain("fu6");
  });

  it("expands :trigger before the caret", () => {
    const hit = expandSnippet("Impression: :nsa", 16, snippets);
    expect(hit).not.toBeNull();
    expect(hit!.value).toBe("Impression: No significant abnormality detected.");
    expect(hit!.caret).toBe(hit!.value.length);
  });

  it("does not expand mid-word", () => {
    expect(expandSnippet("abcnsa", 6, snippets)).toBeNull();
  });

  it("selects the $1 placeholder", () => {
    const custom = [{ trigger: "size", text: "measures $1 cm" }];
    const hit = expandSnippet("lesion :size", 12, custom);
    expect(hit!.value).toBe("lesion measures  cm");
    expect(hit!.select).toEqual([16, 16]);
  });

  it("returns null for unknown triggers", () => {
    expect(expandSnippet(":zzz", 4, snippets)).toBeNull();
  });
});

describe("snippet library v2 (categories, autocomplete, import)", () => {
  const snippets = readSnippets();

  it("gives every built-in a category and a label", () => {
    for (const s of snippets.filter((x) => x.builtin)) {
      expect(s.category, `:${s.trigger}`).toBeTruthy();
      expect(s.label, `:${s.trigger}`).toBeTruthy();
    }
  });

  it("uses only known categories", () => {
    const cats = new Set(snippets.filter((s) => s.builtin).map((s) => s.category));
    for (const c of cats) expect(SNIPPET_CATEGORIES).toContain(c);
  });

  it("has no duplicate triggers", () => {
    const triggers = snippets.map((s) => s.trigger);
    expect(triggers.length).toBe(new Set(triggers).size);
  });

  it("covers every category with several macros", () => {
    for (const c of SNIPPET_CATEGORIES) {
      expect(snippets.filter((s) => s.category === c).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("includes the new modality macros", () => {
    const t = new Set(snippets.map((s) => s.trigger));
    for (const want of ["stroke", "glio", "mets", "bulge", "steno", "acl", "rotator", "fatty", "appendic", "ggo", "fx", "colles", "cpfree", "clear"]) {
      expect(t.has(want), `:${want}`).toBe(true);
    }
  });

  it("expands the new brain macro with a $1 slot", () => {
    const hit = expandSnippet(":stroke", 7, snippets);
    expect(hit!.value).toContain("restricted diffusion on DWI");
    expect(hit!.value).not.toContain("$1");
    expect(hit!.select).toBeTruthy();
  });

  it("expands the verbatim spine macro", () => {
    const hit = expandSnippet("Findings: :loss", 15, snippets);
    expect(hit!.value).toBe("Findings: Evidence of loss of cervical lordosis — ? due to muscle spasm.");
  });

  it("expands the verbatim chest normal macro", () => {
    const hit = expandSnippet(":cpfree", 7, snippets);
    expect(hit!.value).toBe("Bilateral costo-phrenic and cardio-phrenic angles are free.");
  });
});

describe("matchPartialSnippets (autocomplete)", () => {
  const snippets = readSnippets();

  it("ranks prefix hits first", () => {
    const got = matchPartialSnippets("fu", snippets, 5).map((s) => s.trigger);
    expect(got[0]).toBe("fu6"); // exact prefix before longer prefixes
    expect(got.length).toBeLessThanOrEqual(5);
  });

  it("matches on label and text, not just trigger", () => {
    const got = matchPartialSnippets("hydrocephalus", snippets, 10).map((s) => s.trigger);
    expect(got).toContain("nph"); // matched via its label
  });

  it("matches on category", () => {
    const got = matchPartialSnippets("brain", snippets, 50);
    expect(got.length).toBeGreaterThan(0);
    expect(got.some((s) => s.category === "MRI Brain")).toBe(true);
  });

  it("empty partial returns the head of the library", () => {
    const got = matchPartialSnippets("", snippets, 3);
    expect(got.length).toBe(3);
  });

  it("respects the limit", () => {
    expect(matchPartialSnippets("", snippets, 2).length).toBe(2);
  });
});

describe("searchSnippets (settings search)", () => {
  const snippets = readSnippets();

  it("finds by trigger substring", () => {
    expect(searchSnippets("stroke", snippets).map((s) => s.trigger)).toContain("stroke");
  });

  it("finds by category, case-insensitively", () => {
    const got = searchSnippets("x-ray", snippets);
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((s) => s.category === "X-ray")).toBe(true);
  });

  it("finds by free text inside the expansion", () => {
    const got = searchSnippets("costo-phrenic", snippets);
    expect(got.map((s) => s.trigger)).toContain("cpfree");
  });

  it("empty query returns everything", () => {
    expect(searchSnippets("", snippets).length).toBe(snippets.length);
  });
});

describe("expandSelectedSnippet (autocomplete selection)", () => {
  const snippets = readSnippets();
  const mets = snippets.find((s) => s.trigger === "mets")!;

  it("replaces a partially-typed trigger", () => {
    const hit = expandSelectedSnippet("Impression: :me", 15, mets, "me");
    expect(hit!.value.startsWith("Impression: Multiple space-occupying lesions")).toBe(true);
    expect(hit!.value).not.toContain(":me");
  });

  it("returns null when the text before the caret disagrees", () => {
    expect(expandSelectedSnippet("plain text", 10, mets, "me")).toBeNull();
  });
});

describe("normalizeImportedSnippets (import)", () => {
  it("accepts a plain array and cleans triggers", () => {
    const got = normalizeImportedSnippets([{ trigger: "My-Snip!", text: "  Hello.  " }, { trigger: "ok2", text: "Fine." }]);
    expect(got).toHaveLength(2);
    expect(got[0].trigger).toBe("mysnip");
    expect(got[0].text).toBe("Hello.");
    expect(got[1].category).toBe("Custom");
  });

  it("keeps label and category when given", () => {
    const got = normalizeImportedSnippets([{ trigger: "k", text: "v", label: "Kidney", category: "CT" }]);
    expect(got[0].label).toBe("Kidney");
    expect(got[0].category).toBe("CT");
  });

  it("drops junk and duplicates", () => {
    const got = normalizeImportedSnippets([null, 42, { trigger: "", text: "x" }, { trigger: "a", text: "1" }, { trigger: "a", text: "2" }, "nope"]);
    expect(got).toHaveLength(1);
    expect(got[0].text).toBe("1");
  });

  it("rejects non-arrays", () => {
    expect(normalizeImportedSnippets({})).toHaveLength(0);
    expect(normalizeImportedSnippets(undefined)).toHaveLength(0);
  });
});

describe("formatElapsed", () => {
  it("formats minutes:seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatElapsed(1_800_000)).toBe("30:00");
  });
});
