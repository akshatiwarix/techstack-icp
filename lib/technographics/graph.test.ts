import { describe, expect, it } from "vitest";
import { buildGraph } from "./graph";
import { GRAPH } from "@/data/graph";
import { CATEGORY_IDS } from "./types";

describe("the corpus graph", () => {
  it("holds 32 technologies across 8 categories", () => {
    expect(GRAPH.technologies).toHaveLength(32);
    expect(GRAPH.categories).toHaveLength(8);
    expect(GRAPH.categories.map((c) => c.id).sort()).toEqual(
      [...CATEGORY_IDS].sort(),
    );
  });

  it("puts every technology in a declared category", () => {
    for (const technology of GRAPH.technologies) {
      expect(() => GRAPH.category(technology.category)).not.toThrow();
    }
  });

  it("leaves the whole data layer dark for negation", () => {
    // The point of the repo: you cannot ask "does not use Snowflake" and get an
    // answer, no matter how much of the corpus you inspect.
    expect(GRAPH.isCategoryDarkForNegation("warehouse")).toBe(true);
    expect(GRAPH.isCategoryDarkForNegation("reverse_etl")).toBe(true);
    expect(GRAPH.isCategoryDarkForNegation("crm")).toBe(true);
  });

  it("leaves the client-side categories answerable for negation", () => {
    expect(GRAPH.isCategoryDarkForNegation("support_chat")).toBe(false);
    expect(GRAPH.isCategoryDarkForNegation("analytics")).toBe(false);
    expect(GRAPH.isCategoryDarkForNegation("cdp")).toBe(false);
    expect(GRAPH.isCategoryDarkForNegation("infra_edge")).toBe(false);
  });

  it("names the dark set explicitly", () => {
    const dark = GRAPH.darkForNegation().map((t) => t.id);
    expect(dark).toContain("snowflake");
    expect(dark).toContain("hightouch");
    expect(dark).toContain("salesforce");
    expect(dark).not.toContain("intercom");
  });

  it("makes competition symmetric", () => {
    for (const technology of GRAPH.technologies) {
      for (const competitor of GRAPH.competitorsOf(technology.id)) {
        expect(GRAPH.competitorsOf(competitor)).toContain(technology.id);
      }
    }
  });

  it("tracks supersession in both directions", () => {
    expect(GRAPH.supersededBy("universal_analytics")).toBe("ga4");
    expect(GRAPH.supersedes("ga4")).toBe("universal_analytics");
    expect(GRAPH.supersededBy("ga4")).toBeNull();
  });

  it("lets a CDP imply a warehouse category it cannot name", () => {
    const implied = GRAPH.impliersOfCategory("warehouse").map((i) => i.from);
    expect(implied).toContain("segment");
    expect(implied).toContain("hightouch");
    // Deliberately a category, not a technology: which warehouse is the blind
    // spot, and the implication must not pretend to resolve it.
    expect(GRAPH.impliersOf("snowflake")).toEqual([]);
  });
});

describe("graph construction rejects incoherent data", () => {
  const category = {
    id: "support_chat" as const,
    label: "Support & chat",
    note: "n/a",
  };

  it("refuses absence establishable on a non-exhaustive surface", () => {
    expect(() =>
      buildGraph({
        categories: [category],
        technologies: [
          {
            id: "intercom",
            name: "Intercom",
            category: "support_chat",
            visibleOn: ["job_posting"],
            absenceEstablishableOn: ["job_posting"],
          },
        ],
        relations: [],
      }),
    ).toThrow(/not an exhaustive surface/);
  });

  it("refuses absence establishable where presence is not even visible", () => {
    expect(() =>
      buildGraph({
        categories: [category],
        technologies: [
          {
            id: "intercom",
            name: "Intercom",
            category: "support_chat",
            visibleOn: ["job_posting"],
            absenceEstablishableOn: ["page_markup"],
          },
        ],
        relations: [],
      }),
    ).toThrow(/presence is not even visible/);
  });

  it("refuses a relation pointing at nothing", () => {
    expect(() =>
      buildGraph({
        categories: [category],
        technologies: [
          {
            id: "intercom",
            name: "Intercom",
            category: "support_chat",
            visibleOn: ["page_markup"],
            absenceEstablishableOn: ["page_markup"],
          },
        ],
        relations: [
          { kind: "competes_with", a: "intercom", b: "telepathy" },
        ],
      }),
    ).toThrow(/unknown technology: telepathy/);
  });
});
