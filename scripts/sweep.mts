/**
 * The invariant sweep.
 *
 * 14 companies × 32 technologies × 5 as-of dates = 2,240 claim resolutions,
 * plus every predicate shape against every account. No network, no model, no
 * randomness — the same inputs give the same output every run.
 *
 * The unit tests check that the interesting cases are right. This checks that
 * nothing anywhere is wrong in a way the interesting cases would not notice.
 */

import { GRAPH } from "@/data/graph";
import { CORPUS_COMPANIES } from "@/data/corpus";
import { resolveCorpus, runCorpusQuery } from "@/data/resolve";
import { getSurface } from "@/lib/technographics";
import { GRADE_ORDER } from "@/lib/technographics";
import type {
  Claim,
  CompanyResolution,
  Grade,
  Predicate,
} from "@/lib/technographics";

const AS_OF_DATES = [
  "2023-06-01",
  "2024-06-01",
  "2025-06-01",
  "2026-02-01",
  "2026-08-16",
];

type Failure = { invariant: string; detail: string };

const failures: Failure[] = [];
let assertions = 0;

function check(invariant: string, ok: boolean, detail: string): void {
  assertions += 1;
  if (!ok) failures.push({ invariant, detail });
}

const gradeRank = (grade: Grade | null): number =>
  grade === null ? 0 : GRADE_ORDER[grade];

// ---------------------------------------------------------------------------
// 1–7: claim invariants, across the full cross-product
// ---------------------------------------------------------------------------

const byDate = new Map<string, CompanyResolution[]>(
  AS_OF_DATES.map((asOf) => [asOf, resolveCorpus(asOf)]),
);

let resolutions = 0;

for (const asOf of AS_OF_DATES) {
  const forDate = byDate.get(asOf) ?? [];

  for (const resolution of forDate) {
    const company = CORPUS_COMPANIES.find((c) => c.id === resolution.companyId);

    for (const technology of GRAPH.technologies) {
      const claim: Claim | undefined = resolution.claims[technology.id];
      resolutions += 1;

      check(
        "1. every pair resolves to exactly one state",
        claim !== undefined &&
          ["PRESENT", "ABSENT", "UNKNOWN", "UNKNOWABLE"].includes(claim.state),
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );
      if (claim === undefined) continue;

      check(
        "2. PRESENT implies surviving supporting evidence",
        claim.state !== "PRESENT" ||
          claim.evidence.some(
            (item) =>
              item.grade !== null &&
              item.observation.kind !== "negative_statement",
          ),
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );

      check(
        "3. ABSENT implies a current inspection of a surface that could show it",
        claim.state !== "ABSENT" ||
          technology.absenceEstablishableOn.some((surface) =>
            resolution.inspectedSurfaces.includes(surface),
          ),
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );

      check(
        "4. UNKNOWABLE implies absence is establishable nowhere",
        claim.state !== "UNKNOWABLE" ||
          technology.absenceEstablishableOn.length === 0,
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );

      check(
        "5. a grade is set if and only if the claim is PRESENT",
        (claim.state === "PRESENT") === (claim.grade !== null),
        `${resolution.companyId}/${technology.id} @ ${asOf} state=${claim.state} grade=${claim.grade}`,
      );

      check(
        "6. two CONFIRMED competitors are flagged MIGRATING",
        claim.grade !== "CONFIRMED" ||
          !GRAPH.competitorsOf(technology.id).some(
            (id) => resolution.claims[id]?.grade === "CONFIRMED",
          ) ||
          claim.flags.includes("MIGRATING"),
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );

      check(
        "7. implies never promotes a state",
        claim.impliedBy.length === 0 ||
          claim.state === "UNKNOWN" ||
          claim.state === "UNKNOWABLE",
        `${resolution.companyId}/${technology.id} @ ${asOf} state=${claim.state}`,
      );

      check(
        "8. reach is only claimed where evidence supports it",
        claim.reach.every((reach) =>
          claim.evidence.some((item) => item.surface.reach === reach),
        ),
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );

      check(
        "9. no claim is rendered without a reason",
        claim.reason.trim().length > 0,
        `${resolution.companyId}/${technology.id} @ ${asOf}`,
      );

      if (company !== undefined) {
        check(
          "10. an inspection older than three half-lives cannot establish absence",
          claim.state !== "ABSENT" ||
            company.inspections.some((inspection) => {
              if (!technology.absenceEstablishableOn.includes(inspection.surface)) {
                return false;
              }
              const surface = getSurface(inspection.surface);
              const ageDays =
                (Date.parse(`${asOf}T00:00:00Z`) -
                  Date.parse(`${inspection.on}T00:00:00Z`)) /
                86_400_000;
              return ageDays < surface.halfLifeDays * 3;
            }),
          `${resolution.companyId}/${technology.id} @ ${asOf}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 11: monotone decay — nothing gets stronger as time advances
// ---------------------------------------------------------------------------

for (const company of CORPUS_COMPANIES) {
  for (const technology of GRAPH.technologies) {
    let previous = Infinity;
    for (const asOf of AS_OF_DATES) {
      const claim = byDate
        .get(asOf)
        ?.find((r) => r.companyId === company.id)?.claims[technology.id];
      const current = gradeRank(claim?.grade ?? null);
      check(
        "11. confidence never improves as the as-of date advances",
        current <= previous,
        `${company.id}/${technology.id} rose to ${claim?.grade} at ${asOf}`,
      );
      previous = current;
    }
  }
}

// ---------------------------------------------------------------------------
// 12–14: query invariants over every predicate shape
// ---------------------------------------------------------------------------

const PREDICATES: Predicate[] = [
  ...GRAPH.technologies.flatMap((technology): Predicate[] => [
    { op: "has", technologyId: technology.id, minGrade: "CONFIRMED" },
    { op: "has", technologyId: technology.id, minGrade: "HINTED" },
    { op: "not", technologyId: technology.id },
  ]),
  ...GRAPH.categories.flatMap((category): Predicate[] => [
    { op: "has_any_in", categoryId: category.id, minGrade: "CONFIRMED" },
    { op: "count_in", categoryId: category.id, atLeast: 2, minGrade: "CONFIRMED" },
    { op: "gap", categoryId: category.id },
  ]),
];

for (const predicate of PREDICATES) {
  const result = runCorpusQuery({ predicates: [predicate], asOf: "2026-08-16" });

  check(
    "12. every account lands in exactly one tier",
    result.accounts.length === CORPUS_COMPANIES.length &&
      result.accounts.every((account) =>
        ["MATCH", "MIGRATING", "INCONCLUSIVE", "UNANSWERABLE", "EXCLUDED"].includes(
          account.tier,
        ),
      ),
    JSON.stringify(predicate),
  );

  const computable = result.computability[0]?.computability.computable ?? true;

  check(
    "13. an uncomputable predicate never produces a match",
    computable ||
      result.accounts.every(
        (account) => account.tier !== "MATCH" && account.tier !== "MIGRATING",
      ),
    JSON.stringify(predicate),
  );

  check(
    "14. every account carries a reason a rep could read",
    result.accounts.every((account) => account.reason.trim().length > 0),
    JSON.stringify(predicate),
  );

  if (predicate.op === "not") {
    const technology = GRAPH.technology(predicate.technologyId);
    check(
      "15. a negative over a dark technology is refused, not silently answered",
      technology.absenceEstablishableOn.length > 0 || !computable,
      JSON.stringify(predicate),
    );
  }
}

// ---------------------------------------------------------------------------

const width = 68;
console.log("");
console.log("  invariant sweep".padEnd(width));
console.log(`  ${"─".repeat(width - 2)}`);
console.log(
  `  ${CORPUS_COMPANIES.length} companies × ${GRAPH.technologies.length} technologies × ${AS_OF_DATES.length} dates = ${resolutions} resolutions`,
);
console.log(`  ${PREDICATES.length} predicates × ${CORPUS_COMPANIES.length} accounts`);
console.log(`  ${assertions} assertions`);
console.log("");

if (failures.length > 0) {
  const byInvariant = new Map<string, string[]>();
  for (const failure of failures) {
    const existing = byInvariant.get(failure.invariant) ?? [];
    existing.push(failure.detail);
    byInvariant.set(failure.invariant, existing);
  }
  for (const [invariant, details] of byInvariant) {
    console.error(`  ✗ ${invariant} — ${details.length} failures`);
    for (const detail of details.slice(0, 5)) console.error(`      ${detail}`);
    if (details.length > 5) console.error(`      … and ${details.length - 5} more`);
  }
  console.error("");
  process.exit(1);
}

console.log("  ✓ all invariants hold");
console.log("");
