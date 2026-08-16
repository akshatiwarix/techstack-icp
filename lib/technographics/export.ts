/**
 * Permalinks and CSV.
 *
 * The CSV keeps the four-state value per predicate as a word. Exporting
 * `UNKNOWN` as an empty cell would re-create, in a spreadsheet, exactly the
 * failure this repo exists to refuse.
 */

import { describePredicate } from "./query";
import type { Graph } from "./graph";
import { querySchema } from "./schema";
import type { Query, QueryResult } from "./types";

/** Compact, URL-safe, and readable enough to eyeball in the address bar. */
export function encodeQuery(query: Query): string {
  return encodeURIComponent(JSON.stringify(query));
}

export function decodeQuery(encoded: string): Query | null {
  try {
    return querySchema.parse(JSON.parse(decodeURIComponent(encoded)));
  } catch {
    return null;
  }
}

export function toCsv(input: {
  result: QueryResult;
  graph: Graph;
  companyName: (companyId: string) => string;
  companyDomain: (companyId: string) => string;
}): string {
  const { result, graph } = input;
  const predicates = result.computability.map((entry) => entry.predicate);

  const header = [
    "company",
    "domain",
    "tier",
    "weakest_confidence",
    "reason",
    ...predicates.map((predicate) => describePredicate(predicate, graph)),
  ];

  const rows = result.accounts.map((account) => [
    input.companyName(account.companyId),
    input.companyDomain(account.companyId),
    account.tier,
    account.weakestGrade ?? "NONE",
    account.reason,
    ...account.predicateResults.map((predicateResult) => predicateResult.outcome),
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");
}

function escapeCell(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
