/**
 * The engine's public surface. Route handlers and components import from here,
 * not from the modules underneath.
 */

export * from "./types";
export { SURFACES, FETCHABLE_SURFACES, getSurface } from "./surfaces";
export { buildGraph, type Graph } from "./graph";
export { daysBetween, addDays, describeAge } from "./dates";
export {
  gradeObservation,
  baseGradeFor,
  decay,
  meetsGrade,
  strongestGrade,
  inspectionIsCurrent,
} from "./grade";
export { resolveCompany, presentIn } from "./resolve";
export {
  computabilityOf,
  describePredicate,
  evaluatePredicate,
} from "./query";
export { evaluateAccount, runQuery, tierCounts } from "./tier";
export {
  querySchema,
  predicateSchema,
  translatedQuerySchema,
  type TranslatedQuery,
} from "./schema";
