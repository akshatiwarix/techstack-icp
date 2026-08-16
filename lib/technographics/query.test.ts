import { describe, expect, it } from "vitest";
import { computabilityOf, describePredicate } from "./query";
import { runQuery, tierCounts } from "./tier";
import { GRAPH } from "@/data/graph";
import { resolveCorpus, runCorpusQuery } from "@/data/resolve";
import { DEFAULT_AS_OF, PRESETS } from "@/data/presets";
import type { Predicate, Query } from "./types";

function preset(id: string): Predicate[] {
  const found = PRESETS.find((p) => p.id === id);
  if (found === undefined) throw new Error(`no preset ${id}`);
  return found.predicates;
}

function query(predicates: Predicate[], asOf = DEFAULT_AS_OF): Query {
  return { predicates, asOf };
}

describe("computability, decided before any company is looked at", () => {
  it("refuses a negative over a technology whose absence can never be established", () => {
    const result = computabilityOf(
      { op: "not", technologyId: "snowflake" },
      GRAPH,
    );
    expect(result.computable).toBe(false);
    expect(result.reason).toMatch(/absence cannot be established/);
  });

  it("accepts a negative over a technology that would appear on a fetched page", () => {
    expect(
      computabilityOf({ op: "not", technologyId: "intercom" }, GRAPH).computable,
    ).toBe(true);
  });

  it("refuses a gap over a category that is dark end to end", () => {
    expect(
      computabilityOf({ op: "gap", categoryId: "reverse_etl" }, GRAPH).computable,
    ).toBe(false);
    expect(
      computabilityOf({ op: "gap", categoryId: "warehouse" }, GRAPH).computable,
    ).toBe(false);
  });

  it("accepts a gap over a category that is exhaustively visible", () => {
    expect(
      computabilityOf({ op: "gap", categoryId: "support_chat" }, GRAPH).computable,
    ).toBe(true);
  });

  it("never refuses a positive predicate — the worst case is that nobody looked", () => {
    for (const technology of GRAPH.technologies) {
      expect(
        computabilityOf(
          { op: "has", technologyId: technology.id, minGrade: "HINTED" },
          GRAPH,
        ).computable,
      ).toBe(true);
    }
  });

  it("describes every predicate shape in words a rep would use", () => {
    expect(
      describePredicate({ op: "not", technologyId: "intercom" }, GRAPH),
    ).toBe("does not use Intercom");
    expect(
      describePredicate({ op: "gap", categoryId: "support_chat" }, GRAPH),
    ).toBe("no Support & chat at all");
  });
});

describe("the presets", () => {
  it("finds the displacement targets and excludes the rest", () => {
    const result = runCorpusQuery(query(preset("displacement")));
    const matched = result.accounts.filter(
      (account) => account.tier === "MATCH" || account.tier === "MIGRATING",
    );
    expect(matched.map((a) => a.companyId)).toContain("harborview");
    expect(matched.map((a) => a.companyId)).toContain("oakline");
    // Palisade has no chat widget on a page that was actually fetched.
    const palisade = result.accounts.find((a) => a.companyId === "palisade");
    expect(palisade?.tier).toBe("EXCLUDED");
  });

  it("refuses the reverse-ETL gap for every account", () => {
    const result = runCorpusQuery(query(preset("data-stack-gap")));
    const refused = result.computability.filter(
      (entry) => !entry.computability.computable,
    );
    expect(refused).toHaveLength(1);
    expect(
      result.accounts.every((account) => account.tier !== "MATCH"),
    ).toBe(true);
    const counts = tierCounts(result);
    expect(counts.UNANSWERABLE).toBeGreaterThan(0);
  });

  it("answers the chat gap, so the refusal reads as principled", () => {
    const result = runCorpusQuery(query(preset("chat-gap")));
    expect(
      result.computability.every((entry) => entry.computability.computable),
    ).toBe(true);
    const matched = result.accounts.filter((a) => a.tier === "MATCH");
    expect(matched.map((a) => a.companyId)).toContain("palisade");
  });

  it("finds the accounts running two competing CDPs at once", () => {
    const result = runCorpusQuery(query(preset("mid-migration")));
    const matched = result.accounts.filter(
      (a) => a.tier === "MATCH" || a.tier === "MIGRATING",
    );
    expect(matched.map((a) => a.companyId)).toEqual(["tessellate"]);
    expect(matched[0]?.tier).toBe("MIGRATING");
  });
});

describe("tiers", () => {
  it("gives every account exactly one tier", () => {
    const result = runCorpusQuery(query(preset("displacement")));
    expect(result.accounts).toHaveLength(14);
    const counts = tierCounts(result);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(14);
  });

  it("lets a definitive no beat an unanswerable question", () => {
    // Oakline runs Intercom, so the exclusion is definitive even though the
    // second predicate is uncomputable.
    const result = runCorpusQuery(
      query([
        { op: "not", technologyId: "intercom" },
        { op: "not", technologyId: "snowflake" },
      ]),
    );
    const oakline = result.accounts.find((a) => a.companyId === "oakline");
    expect(oakline?.tier).toBe("EXCLUDED");
  });

  it("separates 'nobody looked' from 'nothing can look'", () => {
    const result = runCorpusQuery(
      query([{ op: "has", technologyId: "cloudflare", minGrade: "CONFIRMED" }]),
    );
    const vermilion = result.accounts.find((a) => a.companyId === "vermilion");
    expect(vermilion?.tier).toBe("INCONCLUSIVE");

    const dark = runCorpusQuery(
      query([{ op: "has", technologyId: "redshift", minGrade: "CONFIRMED" }]),
    );
    expect(
      dark.accounts.find((a) => a.companyId === "vermilion")?.tier,
    ).toBe("UNANSWERABLE");
  });

  it("orders matches by their weakest link, not by a score", () => {
    const result = runCorpusQuery(
      query([{ op: "has_any_in", categoryId: "analytics", minGrade: "HINTED" }]),
    );
    const matched = result.accounts.filter(
      (a) => a.tier === "MATCH" || a.tier === "MIGRATING",
    );
    for (let i = 1; i < matched.length; i += 1) {
      const rank = { CONFIRMED: 3, LIKELY: 2, HINTED: 1 } as const;
      const previous = matched[i - 1]?.weakestGrade;
      const current = matched[i]?.weakestGrade;
      if (previous != null && current != null) {
        expect(rank[previous]).toBeGreaterThanOrEqual(rank[current]);
      }
    }
  });

  it("resolves the same corpus identically whoever calls it", () => {
    const a = runQuery({
      resolutions: resolveCorpus(DEFAULT_AS_OF),
      query: query(preset("displacement")),
      graph: GRAPH,
    });
    const b = runCorpusQuery(query(preset("displacement")));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
