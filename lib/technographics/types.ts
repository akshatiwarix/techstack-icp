/**
 * The type contract for the engine.
 *
 * Every name here exists to keep one distinction alive: a technographic claim
 * is an inference from an observation on a named surface, not a fact. The
 * distinctions that must never collapse are marked LOAD-BEARING.
 */

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export const SURFACE_IDS = [
  "page_markup",
  "http_headers",
  "dns_records",
  "job_posting",
  "engineering_blog",
  "integrations_directory",
] as const;

export type SurfaceId = (typeof SURFACE_IDS)[number];

/**
 * What a surface actually proves about an organisation. A CDP tag in the
 * marketing site's markup proves the marketing team bought a CDP; it says
 * nothing about the data team.
 */
export type Reach =
  | "marketing"
  | "edge_infra"
  | "email_infra"
  | "engineering_intent"
  | "engineering"
  | "commercial";

export type Surface = {
  id: SurfaceId;
  label: string;
  reach: Reach;
  /** Grade demotes by one step per elapsed half-life. */
  halfLifeDays: number;
  /**
   * LOAD-BEARING. Can *not* observing something on this surface mean the
   * technology is absent? True for surfaces that enumerate what is installed
   * (a fetched page, response headers, DNS records). False for narrative
   * surfaces — a job posting that does not mention Snowflake is not evidence
   * that Snowflake is absent.
   */
  exhaustive: boolean;
  /** One sentence, rendered in the UI wherever this surface is cited. */
  proves: string;
};

// ---------------------------------------------------------------------------
// Technologies and the graph
// ---------------------------------------------------------------------------

export const CATEGORY_IDS = [
  "analytics",
  "cdp",
  "warehouse",
  "reverse_etl",
  "support_chat",
  "crm",
  "marketing_automation",
  "infra_edge",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type Category = {
  id: CategoryId;
  label: string;
  /** Rendered on the coverage strip when the whole category is dark. */
  note: string;
};

export type Technology = {
  id: string;
  name: string;
  category: CategoryId;
  /** Surfaces on which this technology's presence can ever be observed. */
  visibleOn: SurfaceId[];
  /**
   * LOAD-BEARING. Surfaces on which *not* seeing this technology establishes
   * absence. Always a subset of the exhaustive surfaces. Empty means `not(x)`
   * and `gap(category)` over it are uncomputable and the query must refuse.
   */
  absenceEstablishableOn: SurfaceId[];
};

export type Relation =
  | { kind: "competes_with"; a: string; b: string }
  /**
   * `to` names either a technology or a whole category. "A CDP implies a
   * warehouse exists" is the useful form and it cannot name which warehouse —
   * that is exactly the blind spot being pointed at.
   */
  | {
      kind: "implies";
      from: string;
      to: string;
      toKind: "technology" | "category";
      because: string;
    }
  | { kind: "superseded_by"; old: string; replacement: string };

// ---------------------------------------------------------------------------
// Observations and evidence
// ---------------------------------------------------------------------------

/**
 * What kind of thing was seen. This, not the technology, is what sets the
 * base grade.
 */
export const EVIDENCE_KINDS = [
  "runtime_artifact",
  "configuration_record",
  "commercial_listing",
  "stated_requirement",
  "stated_mention",
  "negative_statement",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export type Observation = {
  id: string;
  companyId: string;
  surface: SurfaceId;
  /** ISO date. Everything about decay hangs off this. */
  observedOn: string;
  /** The literal thing seen — script tag, header line, posting paragraph. */
  raw: string;
  kind: EvidenceKind;
  technologyId: string;
  /** The detection rule that fired. Rendered in the receipt. */
  ruleId: string;
};

export const GRADES = ["CONFIRMED", "LIKELY", "HINTED"] as const;
export type Grade = (typeof GRADES)[number];

/** Ordinal only. Never averaged, multiplied, or summed. */
export const GRADE_ORDER: Record<Grade, number> = {
  CONFIRMED: 3,
  LIKELY: 2,
  HINTED: 1,
};

/** An observation after grading against an as-of date. */
export type Evidence = {
  observation: Observation;
  surface: Surface;
  /** Grade before decay was applied. */
  baseGrade: Grade | null;
  /** Grade after decay. `null` means the observation has expired. */
  grade: Grade | null;
  ageDays: number;
  halfLivesElapsed: number;
  expired: boolean;
  /** One sentence explaining exactly how this grade was reached. */
  why: string;
};

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

/**
 * LOAD-BEARING — all four, always distinct.
 *
 * PRESENT     we saw it
 * ABSENT      we inspected a surface that would have shown it, and it was not there
 * UNKNOWN     nobody inspected a surface that would show it — answerable with more data
 * UNKNOWABLE  no surface in this model can ever show it — not answerable, ever
 */
export const CLAIM_STATES = [
  "PRESENT",
  "ABSENT",
  "UNKNOWN",
  "UNKNOWABLE",
] as const;

export type ClaimState = (typeof CLAIM_STATES)[number];

export type ClaimFlag = "MIGRATING" | "VESTIGIAL" | "CONTRADICTED";

export type Claim = {
  technologyId: string;
  state: ClaimState;
  /** Set if and only if state is PRESENT. */
  grade: Grade | null;
  /** What the supporting evidence actually proves about the organisation. */
  reach: Reach[];
  evidence: Evidence[];
  contradictions: Evidence[];
  flags: ClaimFlag[];
  /**
   * Annotation only. An `implies` edge NEVER promotes a state — that is the
   * vendor behaviour this repo exists to refuse.
   */
  impliedBy: { technologyId: string; because: string }[];
  /** Plain-English reason this claim is in this state. Always populated. */
  reason: string;
};

export type CompanyResolution = {
  companyId: string;
  asOf: string;
  /** Surfaces on which this company was actually observed at all. */
  inspectedSurfaces: SurfaceId[];
  claims: Record<string, Claim>;
};

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

/**
 * LOAD-BEARING. A record that a surface was looked at for this company, whether
 * or not anything was found on it. Without this, `ABSENT` is unreachable and the
 * four-state model collapses to three: you cannot distinguish "we fetched the
 * page and there was no chat widget" from "nobody fetched the page".
 *
 * An inspection decays like evidence does. A page fetched four years ago does
 * not establish what is on the page today.
 */
export type Inspection = {
  surface: SurfaceId;
  on: string;
};

export type Company = {
  id: string;
  name: string;
  domain: string;
  employees: number;
  industry: string;
  inspections: Inspection[];
  /** The named trap this company carries. Asserted by a test of the same name. */
  trap: string;
  trapNote: string;
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type Predicate =
  | { op: "has"; technologyId: string; minGrade: Grade }
  | { op: "has_any_in"; categoryId: CategoryId; minGrade: Grade }
  | {
      op: "count_in";
      categoryId: CategoryId;
      atLeast: number;
      minGrade: Grade;
    }
  | { op: "not"; technologyId: string }
  | { op: "gap"; categoryId: CategoryId };

export type Query = {
  predicates: Predicate[];
  /** ISO date. Decay is evaluated against this, never against the wall clock. */
  asOf: string;
};

export type Preset = {
  id: string;
  label: string;
  blurb: string;
  predicates: Predicate[];
};

/**
 * Per-account result of one predicate.
 *
 * SATISFIED     the predicate holds at the requested grade
 * FAILED        the predicate definitively does not hold
 * INCONCLUSIVE  depends on a claim nobody inspected — fixable with more data
 * UNANSWERABLE  depends on something no surface in the model can establish
 */
export type PredicateOutcome =
  | "SATISFIED"
  | "FAILED"
  | "INCONCLUSIVE"
  | "UNANSWERABLE";

export type PredicateResult = {
  predicate: Predicate;
  outcome: PredicateOutcome;
  /** One sentence. Rendered verbatim in the refusal banner. */
  reason: string;
  /** Technologies whose claims decided this outcome. */
  citedTechnologyIds: string[];
};

/** Computability of a predicate against the *model*, before any company. */
export type Computability = {
  computable: boolean;
  /** One sentence naming what would be needed. Empty when computable. */
  reason: string;
};

export const TIERS = [
  "MATCH",
  "MIGRATING",
  "INCONCLUSIVE",
  "UNANSWERABLE",
  "EXCLUDED",
] as const;

export type Tier = (typeof TIERS)[number];

export type AccountResult = {
  companyId: string;
  tier: Tier;
  predicateResults: PredicateResult[];
  /** Weakest grade across satisfied predicates — orders within a tier. */
  weakestGrade: Grade | null;
  reason: string;
};

export type QueryResult = {
  asOf: string;
  /** Model-level refusals, independent of any company. */
  computability: { predicate: Predicate; computability: Computability }[];
  accounts: AccountResult[];
};
