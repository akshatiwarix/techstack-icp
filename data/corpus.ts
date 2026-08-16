/**
 * The corpus, validated at import. A malformed record throws here, before any
 * component or route can render a claim derived from it.
 */

import { companySchema, observationSchema } from "@/lib/technographics/schema";
import type { Company, Observation } from "@/lib/technographics/types";
import { COMPANIES } from "./companies";
import { OBSERVATIONS } from "./observations";
import { GRAPH } from "./graph";

export const CORPUS_COMPANIES: Company[] = COMPANIES.map((company) =>
  companySchema.parse(company),
);

export const CORPUS_OBSERVATIONS: Observation[] = OBSERVATIONS.map(
  (observation) => observationSchema.parse(observation),
);

const COMPANY_IDS = new Set(CORPUS_COMPANIES.map((company) => company.id));
const OBSERVATION_IDS = new Set<string>();

for (const observation of CORPUS_OBSERVATIONS) {
  if (OBSERVATION_IDS.has(observation.id)) {
    throw new Error(`duplicate observation id: ${observation.id}`);
  }
  OBSERVATION_IDS.add(observation.id);

  if (!COMPANY_IDS.has(observation.companyId)) {
    throw new Error(
      `observation ${observation.id} names unknown company ${observation.companyId}`,
    );
  }

  // Throws if the technology is not in the graph.
  const technology = GRAPH.technology(observation.technologyId);

  if (!technology.visibleOn.includes(observation.surface)) {
    throw new Error(
      `observation ${observation.id} claims ${technology.id} was seen on ${observation.surface}, where the graph says it is not visible`,
    );
  }

  const company = CORPUS_COMPANIES.find((c) => c.id === observation.companyId);
  if (
    company !== undefined &&
    !company.inspections.some(
      (inspection) => inspection.surface === observation.surface,
    )
  ) {
    // An observation on a surface nobody recorded inspecting means the
    // inspection log is wrong, and the inspection log is what makes ABSENT
    // reachable. Fail loudly rather than silently under-reporting absence.
    throw new Error(
      `observation ${observation.id} is on ${observation.surface}, which is not in ${company.id}'s inspection log`,
    );
  }
}

export const OBSERVATIONS_BY_COMPANY = new Map<string, Observation[]>(
  CORPUS_COMPANIES.map((company) => [
    company.id,
    CORPUS_OBSERVATIONS.filter(
      (observation) => observation.companyId === company.id,
    ),
  ]),
);

export function getCompany(id: string): Company {
  const company = CORPUS_COMPANIES.find((c) => c.id === id);
  if (company === undefined) throw new Error(`unknown company: ${id}`);
  return company;
}
