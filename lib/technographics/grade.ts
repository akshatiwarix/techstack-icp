/**
 * Grading and decay.
 *
 * A grade is ordinal and comes from a lookup, never from arithmetic. There is
 * no 0.7 × 0.8 anywhere in this file, because the product of two numbers nobody
 * can defend is a number nobody can defend.
 *
 * Decay is one demotion per elapsed half-life of the surface the observation
 * came from. Below HINTED the observation is expired and stops supporting the
 * claim at all. The consequence is the invariant the sweep asserts: confidence
 * never improves as the as-of date advances.
 */

import { daysBetween, describeAge } from "./dates";
import { getSurface } from "./surfaces";
import type {
  Evidence,
  EvidenceKind,
  Grade,
  Observation,
  Surface,
} from "./types";
import { GRADE_ORDER } from "./types";

/**
 * What kind of thing was seen decides the base grade. Not which technology, and
 * not how badly the query wants it to be true.
 */
const BASE_GRADE: Record<EvidenceKind, Grade | null> = {
  // The tag is loading, the header is present, the record resolves.
  runtime_artifact: "CONFIRMED",
  configuration_record: "CONFIRMED",
  // A paid relationship. Real, but not a deployment.
  commercial_listing: "LIKELY",
  // Somebody is being hired to work on it. Intent, in a different tense.
  stated_requirement: "LIKELY",
  // One sentence, once.
  stated_mention: "HINTED",
  // Never support. Handled as a contradiction.
  negative_statement: null,
};

const GRADE_BY_RANK: Record<number, Grade> = {
  3: "CONFIRMED",
  2: "LIKELY",
  1: "HINTED",
};

export function baseGradeFor(kind: EvidenceKind): Grade | null {
  return BASE_GRADE[kind];
}

/** Number of the surface's half-lives elapsed at `asOf`. Never negative. */
export function halfLivesElapsed(
  observedOn: string,
  asOf: string,
  surface: Surface,
): number {
  const ageDays = Math.max(0, daysBetween(observedOn, asOf));
  return ageDays / surface.halfLifeDays;
}

/**
 * Demote one grade per completed half-life. `null` means expired: too old to
 * support anything, which is a different answer from "weakly supported".
 */
export function decay(base: Grade, halfLives: number): Grade | null {
  const demotions = Math.floor(halfLives);
  const rank = GRADE_ORDER[base] - demotions;
  return GRADE_BY_RANK[rank] ?? null;
}

/**
 * An inspection ages the same way a CONFIRMED observation does. A page fetched
 * four years ago does not establish what is on the page today, so an expired
 * inspection stops establishing absence and the claim falls back to UNKNOWN.
 */
export function inspectionIsCurrent(
  inspectedOn: string,
  asOf: string,
  surface: Surface,
): boolean {
  return decay("CONFIRMED", halfLivesElapsed(inspectedOn, asOf, surface)) !== null;
}

export function gradeObservation(
  observation: Observation,
  asOf: string,
): Evidence {
  const surface = getSurface(observation.surface);
  const ageDays = Math.max(0, daysBetween(observation.observedOn, asOf));
  const halfLives = halfLivesElapsed(observation.observedOn, asOf, surface);
  const baseGrade = baseGradeFor(observation.kind);
  const grade = baseGrade === null ? null : decay(baseGrade, halfLives);
  const demotions = Math.floor(halfLives);

  return {
    observation,
    surface,
    baseGrade,
    grade,
    ageDays,
    halfLivesElapsed: halfLives,
    expired: baseGrade !== null && grade === null,
    why: explain({
      kind: observation.kind,
      surfaceLabel: surface.label,
      halfLifeDays: surface.halfLifeDays,
      ageDays,
      demotions,
      baseGrade,
      grade,
    }),
  };
}

function explain(input: {
  kind: EvidenceKind;
  surfaceLabel: string;
  halfLifeDays: number;
  ageDays: number;
  demotions: number;
  baseGrade: Grade | null;
  grade: Grade | null;
}): string {
  const seen = `${input.surfaceLabel}, ${describeAge(input.ageDays)}`;

  if (input.kind === "negative_statement") {
    return `${seen} — a statement against this technology, so it counts against the claim rather than for it.`;
  }
  if (input.baseGrade === null) {
    return `${seen} — no grade is defined for this kind of evidence.`;
  }
  if (input.grade === null) {
    return `${seen} — ${input.baseGrade} when observed, expired after ${input.demotions} half-lives of ${input.halfLifeDays} days.`;
  }
  if (input.demotions === 0) {
    return `${seen} — ${input.grade}, inside the ${input.halfLifeDays}-day half-life of this surface.`;
  }
  return `${seen} — ${input.baseGrade} when observed, now ${input.grade} after ${input.demotions} half-${input.demotions === 1 ? "life" : "lives"} of ${input.halfLifeDays} days.`;
}

export function strongestGrade(grades: (Grade | null)[]): Grade | null {
  let best: Grade | null = null;
  for (const grade of grades) {
    if (grade === null) continue;
    if (best === null || GRADE_ORDER[grade] > GRADE_ORDER[best]) best = grade;
  }
  return best;
}

export function meetsGrade(actual: Grade | null, required: Grade): boolean {
  return actual !== null && GRADE_ORDER[actual] >= GRADE_ORDER[required];
}
