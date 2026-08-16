/**
 * The corpus graph, built once and validated at import. A malformed record
 * throws here rather than producing a quietly wrong claim downstream.
 */

import { buildGraph } from "@/lib/technographics/graph";
import { CATEGORIES, RELATIONS, TECHNOLOGIES } from "./technologies";

export const GRAPH = buildGraph({
  categories: CATEGORIES,
  technologies: TECHNOLOGIES,
  relations: RELATIONS,
});
