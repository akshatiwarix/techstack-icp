/**
 * Resolving the whole corpus at an as-of date. Pure and cheap, so the same
 * function runs in the browser when the as-of slider moves and on the server
 * for the first render.
 */

import { resolveCompany, runQuery } from "@/lib/technographics";
import type { CompanyResolution, Query, QueryResult } from "@/lib/technographics";
import { CORPUS_COMPANIES, OBSERVATIONS_BY_COMPANY } from "./corpus";
import { GRAPH } from "./graph";

export function resolveCorpus(asOf: string): CompanyResolution[] {
  return CORPUS_COMPANIES.map((company) =>
    resolveCompany({
      company,
      observations: OBSERVATIONS_BY_COMPANY.get(company.id) ?? [],
      graph: GRAPH,
      asOf,
    }),
  );
}

export function runCorpusQuery(query: Query): QueryResult {
  return runQuery({
    resolutions: resolveCorpus(query.asOf),
    query,
    graph: GRAPH,
  });
}
