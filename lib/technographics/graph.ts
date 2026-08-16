/**
 * The graph, as the engine sees it.
 *
 * Constructed from data passed in — the engine never imports `@/data`, so a
 * caller can hand it a different corpus and every answer changes with it.
 */

import { categorySchema, relationSchema, technologySchema } from "./schema";
import { getSurface } from "./surfaces";
import type {
  Category,
  CategoryId,
  Relation,
  SurfaceId,
  Technology,
} from "./types";

export type Graph = {
  categories: Category[];
  technologies: Technology[];
  relations: Relation[];
  technology: (id: string) => Technology;
  category: (id: CategoryId) => Category;
  inCategory: (id: CategoryId) => Technology[];
  competitorsOf: (id: string) => string[];
  supersededBy: (id: string) => string | null;
  supersedes: (id: string) => string | null;
  /** `implies` edges whose target is this technology or its category. */
  impliersOf: (id: string) => { from: string; because: string }[];
  impliersOfCategory: (id: CategoryId) => { from: string; because: string }[];
  /**
   * Technologies whose absence can never be established on any surface. Every
   * negative query over one of these is uncomputable, by construction.
   */
  darkForNegation: () => Technology[];
  /** True when no technology in the category admits a negative answer. */
  isCategoryDarkForNegation: (id: CategoryId) => boolean;
};

export function buildGraph(input: {
  categories: Category[];
  technologies: Technology[];
  relations: Relation[];
}): Graph {
  const categories = input.categories.map((c) => categorySchema.parse(c));
  const technologies = input.technologies.map((t) => technologySchema.parse(t));
  const relations = input.relations.map((r) => relationSchema.parse(r));

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const technologyById = new Map(technologies.map((t) => [t.id, t]));

  if (technologyById.size !== technologies.length) {
    throw new Error("duplicate technology id in the graph");
  }

  // Structural checks that must hold for the four-state model to mean anything.
  for (const technology of technologies) {
    if (!categoryById.has(technology.category)) {
      throw new Error(
        `technology ${technology.id} names unknown category ${technology.category}`,
      );
    }
    for (const surfaceId of technology.absenceEstablishableOn) {
      if (!getSurface(surfaceId).exhaustive) {
        throw new Error(
          `technology ${technology.id} claims absence is establishable on ${surfaceId}, which is not an exhaustive surface`,
        );
      }
      if (!technology.visibleOn.includes(surfaceId)) {
        throw new Error(
          `technology ${technology.id} claims absence is establishable on ${surfaceId}, where its presence is not even visible`,
        );
      }
    }
  }

  for (const relation of relations) {
    const referenced =
      relation.kind === "competes_with"
        ? [relation.a, relation.b]
        : relation.kind === "superseded_by"
          ? [relation.old, relation.replacement]
          : [relation.from];
    for (const id of referenced) {
      if (!technologyById.has(id)) {
        throw new Error(`relation references unknown technology: ${id}`);
      }
    }
    if (relation.kind === "implies") {
      const known =
        relation.toKind === "category"
          ? categoryById.has(relation.to as CategoryId)
          : technologyById.has(relation.to);
      if (!known) {
        throw new Error(`implies relation references unknown target: ${relation.to}`);
      }
    }
  }

  const technology = (id: string): Technology => {
    const found = technologyById.get(id);
    if (found === undefined) throw new Error(`unknown technology: ${id}`);
    return found;
  };

  const category = (id: CategoryId): Category => {
    const found = categoryById.get(id);
    if (found === undefined) throw new Error(`unknown category: ${id}`);
    return found;
  };

  const competitorsOf = (id: string): string[] =>
    relations.flatMap((relation) =>
      relation.kind === "competes_with"
        ? relation.a === id
          ? [relation.b]
          : relation.b === id
            ? [relation.a]
            : []
        : [],
    );

  const supersessions = relations.flatMap((relation) =>
    relation.kind === "superseded_by" ? [relation] : [],
  );

  const supersededBy = (id: string): string | null =>
    supersessions.find((relation) => relation.old === id)?.replacement ?? null;

  const supersedes = (id: string): string | null =>
    supersessions.find((relation) => relation.replacement === id)?.old ?? null;

  const impliesEdges = relations.flatMap((relation) =>
    relation.kind === "implies" ? [relation] : [],
  );

  const impliersOf = (id: string) =>
    impliesEdges
      .filter((edge) => edge.toKind === "technology" && edge.to === id)
      .map((edge) => ({ from: edge.from, because: edge.because }));

  const impliersOfCategory = (id: CategoryId) =>
    impliesEdges
      .filter((edge) => edge.toKind === "category" && edge.to === id)
      .map((edge) => ({ from: edge.from, because: edge.because }));

  const darkForNegation = (): Technology[] =>
    technologies.filter((t) => t.absenceEstablishableOn.length === 0);

  const isCategoryDarkForNegation = (id: CategoryId): boolean =>
    technologies
      .filter((t) => t.category === id)
      .every((t) => t.absenceEstablishableOn.length === 0);

  return {
    categories,
    technologies,
    relations,
    technology,
    category,
    inCategory: (id) => technologies.filter((t) => t.category === id),
    competitorsOf,
    supersededBy,
    supersedes,
    impliersOf,
    impliersOfCategory,
    darkForNegation,
    isCategoryDarkForNegation,
  };
}

/** Surfaces that could ever establish absence for this technology. */
export function absenceSurfaces(technology: Technology): SurfaceId[] {
  return technology.absenceEstablishableOn;
}
