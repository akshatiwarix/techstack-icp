/**
 * Claim resolution — where the four states are decided.
 *
 * The order matters and is stated once, here:
 *
 *   1. surviving supporting evidence            → PRESENT at the strongest grade
 *   2. an exhaustive surface that would have     → ABSENT
 *      shown it was inspected, and is current
 *   3. the technology is visible somewhere       → UNKNOWN  (nobody looked)
 *   4. nothing in the model can ever see it      → UNKNOWABLE
 *
 * Step 2 is the one every vendor skips, and steps 3 and 4 are the distinction
 * every vendor collapses.
 */

import { gradeObservation, inspectionIsCurrent, strongestGrade } from "./grade";
import { getSurface } from "./surfaces";
import type { Graph } from "./graph";
import type {
  Claim,
  ClaimFlag,
  Company,
  CompanyResolution,
  Evidence,
  Grade,
  Observation,
  Reach,
  SurfaceId,
} from "./types";

export function resolveCompany(input: {
  company: Company;
  observations: Observation[];
  graph: Graph;
  asOf: string;
}): CompanyResolution {
  const { company, observations, graph, asOf } = input;

  /** Surfaces whose inspection is recent enough to still say anything. */
  const currentInspections: SurfaceId[] = company.inspections
    .filter((inspection) =>
      inspectionIsCurrent(inspection.on, asOf, getSurface(inspection.surface)),
    )
    .map((inspection) => inspection.surface);

  const graded = observations.map((observation) =>
    gradeObservation(observation, asOf),
  );

  const byTechnology = new Map<string, Evidence[]>();
  for (const evidence of graded) {
    const existing = byTechnology.get(evidence.observation.technologyId) ?? [];
    existing.push(evidence);
    byTechnology.set(evidence.observation.technologyId, existing);
  }

  // First pass: state and grade, with no cross-technology reasoning.
  const claims: Record<string, Claim> = {};
  for (const technology of graph.technologies) {
    const evidence = byTechnology.get(technology.id) ?? [];
    const supporting = evidence.filter(
      (item) =>
        item.observation.kind !== "negative_statement" && item.grade !== null,
    );
    const contradictions = evidence.filter(
      (item) => item.observation.kind === "negative_statement" && !item.expired,
    );

    const absenceSurfaces = technology.absenceEstablishableOn.filter((surface) =>
      currentInspections.includes(surface),
    );

    let state: Claim["state"];
    let grade: Grade | null = null;
    let reason: string;

    if (supporting.length > 0) {
      state = "PRESENT";
      grade = strongestGrade(supporting.map((item) => item.grade));
      const strongest = supporting.find((item) => item.grade === grade);
      reason = `${grade} — ${strongest?.why ?? "supported by observed evidence."}`;
    } else if (absenceSurfaces.length > 0) {
      state = "ABSENT";
      const surfaceLabels = absenceSurfaces
        .map((surface) => getSurface(surface).label.toLowerCase())
        .join(" and ");
      reason = `Not found on ${surfaceLabels}, where it would necessarily appear if installed. This absence is real.`;
    } else if (technology.absenceEstablishableOn.length === 0) {
      state = "UNKNOWABLE";
      reason =
        technology.visibleOn.length === 0
          ? "No surface in this model can observe this technology at all."
          : `Presence could be observed on ${technology.visibleOn.map((surface) => getSurface(surface).label.toLowerCase()).join(", ")}, but nothing here can establish its absence. A negative answer is not available at any price.`;
    } else if (
      evidence.length === 0 &&
      technology.visibleOn.some((surface) =>
        currentInspections.includes(surface),
      )
    ) {
      // Visible on a surface that was inspected and current, and still nothing
      // was found — but that surface cannot establish absence for this
      // technology, so silence stays silence.
      state = "UNKNOWN";
      reason = `Nothing found, but no surface that could establish absence has been inspected recently enough to say so.`;
    } else {
      state = "UNKNOWN";
      const stale = company.inspections.some(
        (inspection) =>
          technology.absenceEstablishableOn.includes(inspection.surface) &&
          !currentInspections.includes(inspection.surface),
      );
      reason = stale
        ? `The surface that could answer this was last inspected too long ago to still be current. Nobody has checked since.`
        : `No surface that could show this technology has been inspected for this company.`;
    }

    claims[technology.id] = {
      technologyId: technology.id,
      state,
      grade,
      reach: uniqueReach(supporting),
      evidence,
      contradictions,
      flags: [],
      impliedBy: [],
      reason,
    };
  }

  // Second pass: relations. Nothing here changes a state.
  for (const technology of graph.technologies) {
    const claim = claims[technology.id];
    if (claim === undefined) continue;

    const flags: ClaimFlag[] = [];

    if (claim.state === "PRESENT" && claim.contradictions.length > 0) {
      flags.push("CONTRADICTED");
    }

    if (claim.state === "PRESENT" && claim.grade === "CONFIRMED") {
      const migratingWith = graph
        .competitorsOf(technology.id)
        .filter((competitorId) => claims[competitorId]?.grade === "CONFIRMED");
      if (migratingWith.length > 0) flags.push("MIGRATING");
    }

    const replacement = graph.supersededBy(technology.id);
    if (
      claim.state === "PRESENT" &&
      replacement !== null &&
      claims[replacement]?.state === "PRESENT"
    ) {
      flags.push("VESTIGIAL");
    }

    claim.flags = flags;

    // `implies` is annotation only. A state is never promoted by it — the
    // whole point is to render the shape of the blind spot, not to fill it in.
    if (claim.state === "UNKNOWABLE" || claim.state === "UNKNOWN") {
      const direct = graph.impliersOf(technology.id);
      const viaCategory = graph.impliersOfCategory(technology.category);
      claim.impliedBy = [...direct, ...viaCategory]
        .filter((edge) => claims[edge.from]?.state === "PRESENT")
        .map((edge) => ({ technologyId: edge.from, because: edge.because }));
    }
  }

  return {
    companyId: company.id,
    asOf,
    inspectedSurfaces: currentInspections,
    claims,
  };
}

function uniqueReach(evidence: Evidence[]): Reach[] {
  const seen: Reach[] = [];
  for (const item of evidence) {
    if (!seen.includes(item.surface.reach)) seen.push(item.surface.reach);
  }
  return seen;
}

/** Categories in which at least one claim is PRESENT. */
export function presentIn(
  resolution: CompanyResolution,
  graph: Graph,
  categoryId: string,
): Claim[] {
  return graph.technologies
    .filter((technology) => technology.category === categoryId)
    .map((technology) => resolution.claims[technology.id])
    .filter((claim): claim is Claim => claim !== undefined)
    .filter((claim) => claim.state === "PRESENT");
}
