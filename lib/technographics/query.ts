/**
 * Predicate evaluation, and the refusal that makes it honest.
 *
 * Two questions, deliberately separate:
 *
 *   computability — can this predicate be answered *by this model at all*,
 *                   before any company is considered?
 *   evaluation    — given one company's claims, does it hold?
 *
 * `not(Intercom)` is computable: a chat widget would necessarily appear on a
 * fetched page. `not(Snowflake)` is not, at any price. A tool that answers both
 * the same way is lying about one of them, and it is always the second.
 */

import { meetsGrade } from "./grade";
import type { Graph } from "./graph";
import type {
  CategoryId,
  Claim,
  CompanyResolution,
  Computability,
  Predicate,
  PredicateResult,
} from "./types";

export function describePredicate(predicate: Predicate, graph: Graph): string {
  switch (predicate.op) {
    case "has":
      return `has ${graph.technology(predicate.technologyId).name} @ ${predicate.minGrade}`;
    case "has_any_in":
      return `has any ${graph.category(predicate.categoryId).label} @ ${predicate.minGrade}`;
    case "count_in":
      return `${predicate.atLeast}+ in ${graph.category(predicate.categoryId).label} @ ${predicate.minGrade}`;
    case "not":
      return `does not use ${graph.technology(predicate.technologyId).name}`;
    case "gap":
      return `no ${graph.category(predicate.categoryId).label} at all`;
  }
}

/**
 * Computability against the model. Positive predicates are always computable —
 * the worst case is that nobody looked, which is a per-company answer. Negative
 * predicates are only computable when absence can be established at all.
 */
export function computabilityOf(
  predicate: Predicate,
  graph: Graph,
): Computability {
  if (predicate.op === "not") {
    const technology = graph.technology(predicate.technologyId);
    if (technology.absenceEstablishableOn.length > 0) {
      return { computable: true, reason: "" };
    }
    return {
      computable: false,
      reason: `${technology.name} is never observable on a surface that enumerates what is installed, so its absence cannot be established. Answering this would need an inside view — a warehouse query log, a contract, or the customer telling you.`,
    };
  }

  if (predicate.op === "gap") {
    if (!graph.isCategoryDarkForNegation(predicate.categoryId)) {
      return { computable: true, reason: "" };
    }
    const category = graph.category(predicate.categoryId);
    return {
      computable: false,
      reason: `No ${category.label.toLowerCase()} tool in this model can be shown to be absent, so "no ${category.label.toLowerCase()}" is not a question this data can answer. ${category.note}`,
    };
  }

  return { computable: true, reason: "" };
}

export function evaluatePredicate(input: {
  predicate: Predicate;
  resolution: CompanyResolution;
  graph: Graph;
}): PredicateResult {
  const { predicate, resolution, graph } = input;
  const computability = computabilityOf(predicate, graph);

  if (!computability.computable) {
    return {
      predicate,
      outcome: "UNANSWERABLE",
      reason: computability.reason,
      citedTechnologyIds: cited(predicate, graph),
    };
  }

  switch (predicate.op) {
    case "has": {
      const claim = claimFor(resolution, predicate.technologyId);
      const name = graph.technology(predicate.technologyId).name;
      if (claim.state === "PRESENT" && meetsGrade(claim.grade, predicate.minGrade)) {
        return satisfied(predicate, graph, `${name} is ${claim.grade}.`);
      }
      if (claim.state === "PRESENT") {
        return failed(
          predicate,
          graph,
          `${name} is only ${claim.grade}, below the ${predicate.minGrade} this predicate asks for.`,
        );
      }
      if (claim.state === "ABSENT") {
        return failed(predicate, graph, `${name} is absent. ${claim.reason}`);
      }
      if (claim.state === "UNKNOWN") {
        return inconclusive(predicate, graph, `${name}: ${claim.reason}`);
      }
      return unanswerable(predicate, graph, `${name}: ${claim.reason}`);
    }

    case "has_any_in": {
      const claims = categoryClaims(resolution, graph, predicate.categoryId);
      const label = graph.category(predicate.categoryId).label.toLowerCase();
      const hits = claims.filter(
        (claim) =>
          claim.state === "PRESENT" && meetsGrade(claim.grade, predicate.minGrade),
      );
      if (hits.length > 0) {
        return satisfied(
          predicate,
          graph,
          `${hits.map((claim) => graph.technology(claim.technologyId).name).join(", ")} at ${predicate.minGrade} or better.`,
        );
      }
      if (claims.some((claim) => claim.state === "UNKNOWN")) {
        return inconclusive(
          predicate,
          graph,
          `Nothing found in ${label}, and part of that category has not been inspected for this account.`,
        );
      }
      if (claims.every((claim) => claim.state === "UNKNOWABLE")) {
        return unanswerable(
          predicate,
          graph,
          `Nothing in ${label} can be observed for this account at all.`,
        );
      }
      return failed(predicate, graph, `Nothing in ${label} reaches ${predicate.minGrade}.`);
    }

    case "count_in": {
      const claims = categoryClaims(resolution, graph, predicate.categoryId);
      const label = graph.category(predicate.categoryId).label.toLowerCase();
      const hits = claims.filter(
        (claim) =>
          claim.state === "PRESENT" && meetsGrade(claim.grade, predicate.minGrade),
      );
      if (hits.length >= predicate.atLeast) {
        return satisfied(
          predicate,
          graph,
          `${hits.length} at ${predicate.minGrade} or better: ${hits.map((claim) => graph.technology(claim.technologyId).name).join(", ")}.`,
        );
      }
      const unknowns = claims.filter((claim) => claim.state === "UNKNOWN").length;
      if (hits.length + unknowns >= predicate.atLeast) {
        return inconclusive(
          predicate,
          graph,
          `${hits.length} confirmed in ${label}, with ${unknowns} more never inspected. The count could reach ${predicate.atLeast} or not.`,
        );
      }
      return failed(
        predicate,
        graph,
        `Only ${hits.length} in ${label} reach ${predicate.minGrade}.`,
      );
    }

    case "not": {
      const claim = claimFor(resolution, predicate.technologyId);
      const name = graph.technology(predicate.technologyId).name;
      if (claim.state === "ABSENT") {
        return satisfied(predicate, graph, `${name} is absent. ${claim.reason}`);
      }
      if (claim.state === "PRESENT") {
        return failed(predicate, graph, `${name} is ${claim.grade} here.`);
      }
      return inconclusive(
        predicate,
        graph,
        `${name}: ${claim.reason} Excluding this account would be a guess.`,
      );
    }

    case "gap": {
      const claims = categoryClaims(resolution, graph, predicate.categoryId);
      const label = graph.category(predicate.categoryId).label.toLowerCase();
      const present = claims.filter((claim) => claim.state === "PRESENT");
      if (present.length > 0) {
        return failed(
          predicate,
          graph,
          `${present.map((claim) => graph.technology(claim.technologyId).name).join(", ")} present, so there is no gap.`,
        );
      }
      // A gap only counts where absence was actually established. Anything
      // else is "nobody looked", which is not a gap — it is ignorance.
      const answerable = claims.filter(
        (claim) => claim.state === "ABSENT" || claim.state === "UNKNOWABLE",
      );
      const established = claims.filter((claim) => claim.state === "ABSENT");
      if (established.length > 0 && answerable.length === claims.length) {
        return satisfied(
          predicate,
          graph,
          `Nothing in ${label}, established on a surface that would have shown it.`,
        );
      }
      return inconclusive(
        predicate,
        graph,
        `Nothing found in ${label}, but the surfaces that could prove that have not been inspected recently enough.`,
      );
    }
  }
}

function claimFor(resolution: CompanyResolution, technologyId: string): Claim {
  const claim = resolution.claims[technologyId];
  if (claim === undefined) {
    throw new Error(
      `no claim for ${technologyId} on ${resolution.companyId} — the resolution and the graph disagree`,
    );
  }
  return claim;
}

function categoryClaims(
  resolution: CompanyResolution,
  graph: Graph,
  categoryId: CategoryId,
): Claim[] {
  return graph
    .inCategory(categoryId)
    .map((technology) => claimFor(resolution, technology.id));
}

function cited(predicate: Predicate, graph: Graph): string[] {
  if (predicate.op === "has" || predicate.op === "not") {
    return [predicate.technologyId];
  }
  return graph
    .inCategory(predicate.categoryId)
    .map((technology) => technology.id);
}

const outcome =
  (kind: PredicateResult["outcome"]) =>
  (predicate: Predicate, graph: Graph, reason: string): PredicateResult => ({
    predicate,
    outcome: kind,
    reason,
    citedTechnologyIds: cited(predicate, graph),
  });

const satisfied = outcome("SATISFIED");
const failed = outcome("FAILED");
const inconclusive = outcome("INCONCLUSIVE");
const unanswerable = outcome("UNANSWERABLE");
