import { describe, expect, it } from "vitest";
import { resolveCompany } from "./resolve";
import { decay, gradeObservation, meetsGrade, strongestGrade } from "./grade";
import { GRAPH } from "@/data/graph";
import { CORPUS_COMPANIES, OBSERVATIONS_BY_COMPANY, getCompany } from "@/data/corpus";
import type { CompanyResolution } from "./types";

const TODAY = "2026-08-16";

function resolve(companyId: string, asOf = TODAY): CompanyResolution {
  return resolveCompany({
    company: getCompany(companyId),
    observations: OBSERVATIONS_BY_COMPANY.get(companyId) ?? [],
    graph: GRAPH,
    asOf,
  });
}

describe("grading", () => {
  it("takes the base grade from the kind of thing seen, not the technology", () => {
    const [runtime] = (OBSERVATIONS_BY_COMPANY.get("harborview") ?? []).filter(
      (o) => o.kind === "runtime_artifact",
    );
    expect(runtime).toBeDefined();
    expect(gradeObservation(runtime!, TODAY).baseGrade).toBe("CONFIRMED");
  });

  it("demotes one grade per elapsed half-life and then expires", () => {
    expect(decay("CONFIRMED", 0)).toBe("CONFIRMED");
    expect(decay("CONFIRMED", 0.9)).toBe("CONFIRMED");
    expect(decay("CONFIRMED", 1)).toBe("LIKELY");
    expect(decay("CONFIRMED", 2)).toBe("HINTED");
    expect(decay("CONFIRMED", 3)).toBeNull();
    expect(decay("HINTED", 1)).toBeNull();
  });

  it("orders grades without arithmetic", () => {
    expect(strongestGrade(["HINTED", "CONFIRMED", null])).toBe("CONFIRMED");
    expect(strongestGrade([null, null])).toBeNull();
    expect(meetsGrade("LIKELY", "CONFIRMED")).toBe(false);
    expect(meetsGrade("CONFIRMED", "LIKELY")).toBe(true);
    expect(meetsGrade(null, "HINTED")).toBe(false);
  });
});

describe("the four states", () => {
  it("PRESENT — a loading tag on a recently fetched page", () => {
    const claim = resolve("harborview").claims["intercom"];
    expect(claim?.state).toBe("PRESENT");
    expect(claim?.grade).toBe("CONFIRMED");
    expect(claim?.reach).toContain("marketing");
  });

  it("ABSENT — an exhaustive surface was inspected and it was not there", () => {
    const claim = resolve("palisade").claims["intercom"];
    expect(claim?.state).toBe("ABSENT");
    expect(claim?.reason).toMatch(/This absence is real/);
  });

  it("UNKNOWN — nobody inspected a surface that would show it", () => {
    // Vermilion was only ever inspected on page markup, and Cloudflare is
    // announced in headers.
    const claim = resolve("vermilion").claims["cloudflare"];
    expect(claim?.state).toBe("UNKNOWN");
  });

  it("UNKNOWABLE — no surface in the model can establish its absence", () => {
    const claim = resolve("solstice").claims["snowflake"];
    expect(claim?.state).toBe("UNKNOWABLE");
    expect(claim?.reason).toMatch(/not available at any price/);
  });

  it("never leaves a technology unresolved", () => {
    for (const company of CORPUS_COMPANIES) {
      const resolution = resolve(company.id);
      for (const technology of GRAPH.technologies) {
        expect(resolution.claims[technology.id]?.state).toBeDefined();
      }
    }
  });

  it("sets a grade if and only if the state is PRESENT", () => {
    for (const company of CORPUS_COMPANIES) {
      const resolution = resolve(company.id);
      for (const claim of Object.values(resolution.claims)) {
        if (claim.state === "PRESENT") expect(claim.grade).not.toBeNull();
        else expect(claim.grade).toBeNull();
      }
    }
  });
});

describe("relations annotate, they do not promote", () => {
  it("flags a migration when two competitors are both CONFIRMED", () => {
    const resolution = resolve("tessellate");
    expect(resolution.claims["segment"]?.flags).toContain("MIGRATING");
    expect(resolution.claims["rudderstack"]?.flags).toContain("MIGRATING");
  });

  it("flags the retired tool vestigial when its replacement is also present", () => {
    const resolution = resolve("thornbury");
    expect(resolution.claims["universal_analytics"]?.flags).toContain("VESTIGIAL");
    expect(resolution.claims["ga4"]?.flags).not.toContain("VESTIGIAL");
  });

  it("flags a contradiction without deleting the evidence", () => {
    const claim = resolve("cinder").claims["intercom"];
    expect(claim?.state).toBe("PRESENT");
    expect(claim?.flags).toContain("CONTRADICTED");
    expect(claim?.contradictions.length).toBeGreaterThan(0);
  });

  it("annotates an unknowable warehouse with what implies it, and leaves the state alone", () => {
    const claim = resolve("ardent").claims["snowflake"];
    expect(claim?.state).toBe("UNKNOWABLE");
    expect(claim?.impliedBy.map((i) => i.technologyId)).toContain("segment");
  });

  it("never annotates a PRESENT claim as implied", () => {
    for (const company of CORPUS_COMPANIES) {
      const resolution = resolve(company.id);
      for (const claim of Object.values(resolution.claims)) {
        if (claim.state === "PRESENT") expect(claim.impliedBy).toEqual([]);
      }
    }
  });
});

describe("time", () => {
  it("expires a three-year-old CONFIRMED detection", () => {
    expect(resolve("quillon", "2023-06-01").claims["segment"]?.state).toBe("PRESENT");
    expect(resolve("quillon", TODAY).claims["segment"]?.state).not.toBe("PRESENT");
  });

  it("stops a stale inspection from establishing absence", () => {
    // Quillon's page was fetched in 2023. It cannot say what is on the page
    // now, so a missing chat widget is UNKNOWN rather than ABSENT.
    expect(resolve("quillon", TODAY).claims["crisp"]?.state).toBe("UNKNOWN");
    expect(resolve("quillon", "2023-06-01").claims["crisp"]?.state).toBe("ABSENT");
  });

  it("never improves a claim as the as-of date advances", () => {
    const dates = ["2023-06-01", "2024-06-01", "2025-06-01", "2026-08-16"];
    const rank = { CONFIRMED: 3, LIKELY: 2, HINTED: 1 } as const;
    for (const company of CORPUS_COMPANIES) {
      let previous = 4;
      for (const asOf of dates) {
        const claim = resolve(company.id, asOf).claims["segment"];
        const current = claim?.grade === undefined || claim.grade === null ? 0 : rank[claim.grade];
        if (asOf !== dates[0]) expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    }
  });
});
