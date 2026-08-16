import { describe, expect, it } from "vitest";
import {
  CORPUS_COMPANIES,
  CORPUS_OBSERVATIONS,
  OBSERVATIONS_BY_COMPANY,
} from "@/data/corpus";
import { GRAPH } from "@/data/graph";
import { getSurface } from "./surfaces";

describe("the corpus", () => {
  it("holds fourteen companies, each with a named trap", () => {
    expect(CORPUS_COMPANIES).toHaveLength(14);
    const traps = CORPUS_COMPANIES.map((company) => company.trap);
    expect(new Set(traps).size).toBe(14);
  });

  it("is entirely synthetic", () => {
    for (const company of CORPUS_COMPANIES) {
      expect(company.domain).toMatch(/\.example$/);
    }
    for (const observation of CORPUS_OBSERVATIONS) {
      // No raw observation may cite a resolvable hostname.
      expect(observation.raw).not.toMatch(
        /https?:\/\/[a-z0-9.-]+\.(com|io|net|org|co|dev)\b/i,
      );
    }
  });

  it("gives every company at least one observation", () => {
    for (const company of CORPUS_COMPANIES) {
      expect(OBSERVATIONS_BY_COMPANY.get(company.id)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("only records observations on surfaces that were inspected", () => {
    for (const company of CORPUS_COMPANIES) {
      const inspected = new Set(
        company.inspections.map((inspection) => inspection.surface),
      );
      for (const observation of OBSERVATIONS_BY_COMPANY.get(company.id) ?? []) {
        expect(inspected).toContain(observation.surface);
      }
    }
  });

  it("only records observations where the graph says they are visible", () => {
    for (const observation of CORPUS_OBSERVATIONS) {
      expect(
        GRAPH.technology(observation.technologyId).visibleOn,
      ).toContain(observation.surface);
    }
  });

  it("covers every evidence kind, so the grade ladder is exercised", () => {
    const kinds = new Set(CORPUS_OBSERVATIONS.map((o) => o.kind));
    expect(kinds).toContain("runtime_artifact");
    expect(kinds).toContain("configuration_record");
    expect(kinds).toContain("commercial_listing");
    expect(kinds).toContain("stated_requirement");
    expect(kinds).toContain("stated_mention");
    expect(kinds).toContain("negative_statement");
  });

  it("covers every surface", () => {
    const surfaces = new Set(CORPUS_OBSERVATIONS.map((o) => o.surface));
    expect(surfaces.size).toBe(6);
  });

  it("leaves at least one company inspected on a single surface", () => {
    // Without one of these, UNKNOWN is never reachable in the demo.
    const single = CORPUS_COMPANIES.filter(
      (company) => company.inspections.length === 1,
    );
    expect(single.length).toBeGreaterThan(0);
  });

  it("dates every inspection no later than its observations", () => {
    for (const company of CORPUS_COMPANIES) {
      for (const observation of OBSERVATIONS_BY_COMPANY.get(company.id) ?? []) {
        const inspection = company.inspections.find(
          (i) => i.surface === observation.surface,
        );
        expect(inspection?.on).toBe(observation.observedOn);
      }
    }
  });

  it("puts a stale company far enough back to expire a CONFIRMED claim", () => {
    const quillon = CORPUS_COMPANIES.find((c) => c.id === "quillon");
    const halfLife = getSurface("page_markup").halfLifeDays;
    const observedOn = OBSERVATIONS_BY_COMPANY.get("quillon")?.[0]?.observedOn;
    expect(quillon?.trap).toBe("stale");
    expect(observedOn).toBeDefined();
    // Three half-lives is what it takes to demote CONFIRMED off the ladder.
    expect(halfLife * 3).toBeLessThan(1_200);
  });
});
