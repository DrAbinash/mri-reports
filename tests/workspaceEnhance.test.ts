/**
 * Workspace enhancements — unit tests for the ported features:
 * patient accent, critical scan, quality gate, snippet expansion.
 */
import { describe, expect, it } from "vitest";
import {
  patientAccent, scanCritical, qualityGate, expandSnippet, formatElapsed, readSnippets,
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

describe("formatElapsed", () => {
  it("formats minutes:seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatElapsed(1_800_000)).toBe("30:00");
  });
});
