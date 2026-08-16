import { describe, expect, it } from "vitest";
import { CORPUS_COMPANIES } from "@/data/corpus";
import { resolveCorpus, runCorpusQuery } from "@/data/resolve";
import { DEFAULT_AS_OF } from "@/data/presets";
import type { CompanyResolution } from "./types";

/**
 * One test per corpus trap, named after the trap, so `vitest -t "stale"` runs
 * the case it describes. A trap without a test is decoration.
 */

const RESOLVED = new Map<string, CompanyResolution>(
  resolveCorpus(DEFAULT_AS_OF).map((resolution) => [
    resolution.companyId,
    resolution,
  ]),
);

function claims(companyId: string) {
  const resolution = RESOLVED.get(companyId);
  if (resolution === undefined) throw new Error(`no resolution for ${companyId}`);
  return resolution.claims;
}

describe("every trap in the corpus is asserted", () => {
  it("declares a test for each named trap", () => {
    const traps = CORPUS_COMPANIES.map((company) => company.trap).sort();
    expect(traps).toEqual(
      [
        "vestigial",
        "mid_migration",
        "aspirational_posting",
        "marketing_only_reach",
        "implied_but_dark",
        "one_surface_only",
        "uncomputable_negation",
        "displacement_target",
        "stale",
        "dns_only",
        "answerable_gap",
        "contradiction",
        "excluded",
        "supersession_chain",
      ].sort(),
    );
  });

  it("vestigial — a retired tag still loading next to its replacement", () => {
    const northwind = claims("northwind");
    expect(northwind["universal_analytics"]?.state).toBe("PRESENT");
    expect(northwind["universal_analytics"]?.flags).toContain("VESTIGIAL");
    expect(northwind["universal_analytics"]?.flags).toContain("CONTRADICTED");
    expect(northwind["ga4"]?.flags).not.toContain("VESTIGIAL");
  });

  it("mid_migration — two competing CDPs confirmed at once", () => {
    const tessellate = claims("tessellate");
    expect(tessellate["segment"]?.grade).toBe("CONFIRMED");
    expect(tessellate["rudderstack"]?.grade).toBe("CONFIRMED");
    expect(tessellate["segment"]?.flags).toContain("MIGRATING");
  });

  it("aspirational_posting — a warehouse wanted, not deployed", () => {
    const kestrel = claims("kestrel");
    const databricks = kestrel["databricks"];
    expect(databricks?.state).toBe("PRESENT");
    // LIKELY, never CONFIRMED: a posting is intent in a different tense.
    expect(databricks?.grade).toBe("LIKELY");
    expect(databricks?.reach).toEqual(["engineering_intent"]);
  });

  it("marketing_only_reach — confident, and only about marketing", () => {
    const bellwether = claims("bellwether");
    const hubspot = bellwether["hubspot_marketing"];
    expect(hubspot?.grade).toBe("CONFIRMED");
    expect(hubspot?.reach).not.toContain("engineering");
    expect(hubspot?.reach.every((reach) =>
      ["marketing", "email_infra", "commercial"].includes(reach),
    )).toBe(true);
  });

  it("implied_but_dark — a CDP implies a warehouse it cannot name", () => {
    const ardent = claims("ardent");
    expect(ardent["segment"]?.state).toBe("PRESENT");
    for (const warehouse of ["snowflake", "bigquery", "redshift", "databricks"]) {
      expect(ardent[warehouse]?.state).toBe("UNKNOWABLE");
      expect(ardent[warehouse]?.impliedBy.map((i) => i.technologyId)).toContain(
        "segment",
      );
    }
  });

  it("one_surface_only — most answers here are 'nobody checked'", () => {
    const vermilion = claims("vermilion");
    expect(RESOLVED.get("vermilion")?.inspectedSurfaces).toEqual(["page_markup"]);
    expect(vermilion["cloudflare"]?.state).toBe("UNKNOWN");
    // The page was fetched, so chat widgets really are absent.
    expect(vermilion["intercom"]?.state).toBe("ABSENT");
  });

  it("uncomputable_negation — four surfaces, and still no answer", () => {
    const result = runCorpusQuery({
      predicates: [{ op: "not", technologyId: "snowflake" }],
      asOf: DEFAULT_AS_OF,
    });
    expect(result.computability[0]?.computability.computable).toBe(false);
    const solstice = result.accounts.find((a) => a.companyId === "solstice");
    expect(solstice?.tier).toBe("UNANSWERABLE");
    expect(RESOLVED.get("solstice")?.inspectedSurfaces.length).toBe(4);
  });

  it("displacement_target — the strongest shape a claim can take", () => {
    const harborview = claims("harborview");
    expect(harborview["intercom"]?.grade).toBe("CONFIRMED");
    expect(harborview["intercom"]?.evidence[0]?.observation.kind).toBe(
      "runtime_artifact",
    );
    expect(harborview["intercom"]?.flags).toEqual([]);
  });

  it("stale — a perfect match three years ago, unknown today", () => {
    const then = resolveCorpus("2023-06-01").find((r) => r.companyId === "quillon");
    expect(then?.claims["segment"]?.grade).toBe("CONFIRMED");
    expect(claims("quillon")["segment"]?.state).toBe("UNKNOWN");
  });

  it("dns_only — invisible to a page-only crawler", () => {
    const meridian = claims("meridian");
    expect(meridian["marketo"]?.state).toBe("PRESENT");
    expect(meridian["marketo"]?.evidence[0]?.surface.id).toBe("dns_records");
    expect(meridian["marketo"]?.reach).toContain("email_infra");
  });

  it("answerable_gap — the gap query that does have an answer", () => {
    const result = runCorpusQuery({
      predicates: [{ op: "gap", categoryId: "support_chat" }],
      asOf: DEFAULT_AS_OF,
    });
    expect(result.computability[0]?.computability.computable).toBe(true);
    expect(
      result.accounts.find((a) => a.companyId === "palisade")?.tier,
    ).toBe("MATCH");
  });

  it("contradiction — the page and the blog are both right", () => {
    const cinder = claims("cinder");
    expect(cinder["intercom"]?.state).toBe("PRESENT");
    expect(cinder["intercom"]?.flags).toContain("CONTRADICTED");
    expect(cinder["zendesk"]?.state).toBe("PRESENT");
    expect(cinder["intercom"]?.flags).toContain("MIGRATING");
  });

  it("excluded — a definitive no is a result", () => {
    const result = runCorpusQuery({
      predicates: [{ op: "not", technologyId: "intercom" }],
      asOf: DEFAULT_AS_OF,
    });
    const oakline = result.accounts.find((a) => a.companyId === "oakline");
    expect(oakline?.tier).toBe("EXCLUDED");
    expect(oakline?.reason).toMatch(/Intercom is CONFIRMED here/);
  });

  it("supersession_chain — caught from the graph alone, with nothing said", () => {
    const thornbury = claims("thornbury");
    expect(thornbury["universal_analytics"]?.flags).toContain("VESTIGIAL");
    // No negative statement anywhere for this company: the flag has to come
    // from the supersession edge plus two live tags.
    expect(thornbury["universal_analytics"]?.contradictions).toEqual([]);
  });
});
