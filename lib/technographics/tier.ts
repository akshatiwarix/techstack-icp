/**
 * Tiers. Five of them, no score.
 *
 * The order below is the precedence, and it is deliberate: a definitive no
 * beats an unanswerable question, and an unanswerable question beats a
 * merely uninspected one. Ranking these by a number would let a strong
 * `MATCH` on two predicates outweigh a definitive exclusion on a third, which
 * is the failure mode that puts 200,000-employee enterprises in an SMB list.
 */

import { evaluatePredicate, computabilityOf } from "./query";
import { GRADE_ORDER } from "./types";
import type { Graph } from "./graph";
import type {
  AccountResult,
  CompanyResolution,
  Grade,
  Query,
  QueryResult,
  Tier,
} from "./types";

const TIER_ORDER: Record<Tier, number> = {
  MATCH: 0,
  MIGRATING: 1,
  INCONCLUSIVE: 2,
  UNANSWERABLE: 3,
  EXCLUDED: 4,
};

export function evaluateAccount(input: {
  resolution: CompanyResolution;
  query: Query;
  graph: Graph;
}): AccountResult {
  const { resolution, query, graph } = input;

  const predicateResults = query.predicates.map((predicate) =>
    evaluatePredicate({ predicate, resolution, graph }),
  );

  const failed = predicateResults.filter((result) => result.outcome === "FAILED");
  const unanswerable = predicateResults.filter(
    (result) => result.outcome === "UNANSWERABLE",
  );
  const inconclusive = predicateResults.filter(
    (result) => result.outcome === "INCONCLUSIVE",
  );

  let tier: Tier;
  let reason: string;

  if (failed.length > 0) {
    tier = "EXCLUDED";
    reason = failed[0]?.reason ?? "A predicate definitively does not hold.";
  } else if (unanswerable.length > 0) {
    tier = "UNANSWERABLE";
    reason = unanswerable[0]?.reason ?? "A predicate cannot be answered by this data.";
  } else if (inconclusive.length > 0) {
    tier = "INCONCLUSIVE";
    reason = inconclusive[0]?.reason ?? "A predicate depends on something nobody inspected.";
  } else {
    const migrating = Object.values(resolution.claims).some(
      (claim) => claim.flags.includes("MIGRATING") && claim.state === "PRESENT",
    );
    tier = migrating ? "MIGRATING" : "MATCH";
    reason = migrating
      ? "Every predicate holds, and two competing tools are confirmed at once — a migration is running."
      : "Every predicate holds at the confidence it asked for.";
  }

  return {
    companyId: resolution.companyId,
    tier,
    predicateResults,
    weakestGrade: weakestGrade(resolution, predicateResults),
    reason,
  };
}

function weakestGrade(
  resolution: CompanyResolution,
  results: ReturnType<typeof evaluatePredicate>[],
): Grade | null {
  const grades: Grade[] = [];
  for (const result of results) {
    if (result.outcome !== "SATISFIED") continue;
    for (const technologyId of result.citedTechnologyIds) {
      const claim = resolution.claims[technologyId];
      if (claim?.state === "PRESENT" && claim.grade !== null) {
        grades.push(claim.grade);
      }
    }
  }
  if (grades.length === 0) return null;
  return grades.reduce((weakest, grade) =>
    GRADE_ORDER[grade] < GRADE_ORDER[weakest] ? grade : weakest,
  );
}

export function runQuery(input: {
  resolutions: CompanyResolution[];
  query: Query;
  graph: Graph;
}): QueryResult {
  const { resolutions, query, graph } = input;

  const accounts = resolutions
    .map((resolution) => evaluateAccount({ resolution, query, graph }))
    .sort((a, b) => {
      const byTier = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
      if (byTier !== 0) return byTier;
      const gradeOf = (grade: Grade | null) =>
        grade === null ? 0 : GRADE_ORDER[grade];
      const byGrade = gradeOf(b.weakestGrade) - gradeOf(a.weakestGrade);
      if (byGrade !== 0) return byGrade;
      return a.companyId.localeCompare(b.companyId);
    });

  return {
    asOf: query.asOf,
    computability: query.predicates.map((predicate) => ({
      predicate,
      computability: computabilityOf(predicate, graph),
    })),
    accounts,
  };
}

export function tierCounts(result: QueryResult): Record<Tier, number> {
  const counts: Record<Tier, number> = {
    MATCH: 0,
    MIGRATING: 0,
    INCONCLUSIVE: 0,
    UNANSWERABLE: 0,
    EXCLUDED: 0,
  };
  for (const account of result.accounts) counts[account.tier] += 1;
  return counts;
}
