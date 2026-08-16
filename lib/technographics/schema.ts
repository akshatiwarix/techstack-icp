/**
 * Zod is the trust boundary. The corpus is parsed at import time and throws on
 * bad data, so no module downstream has to defend against a malformed record.
 */

import { z } from "zod";
import {
  CATEGORY_IDS,
  CLAIM_STATES,
  EVIDENCE_KINDS,
  GRADES,
  SURFACE_IDS,
} from "./types";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date (YYYY-MM-DD)");

export const surfaceIdSchema = z.enum(SURFACE_IDS);
export const categoryIdSchema = z.enum(CATEGORY_IDS);
export const gradeSchema = z.enum(GRADES);
export const evidenceKindSchema = z.enum(EVIDENCE_KINDS);
export const claimStateSchema = z.enum(CLAIM_STATES);

export const reachSchema = z.enum([
  "marketing",
  "edge_infra",
  "email_infra",
  "engineering_intent",
  "engineering",
  "commercial",
]);

export const surfaceSchema = z.object({
  id: surfaceIdSchema,
  label: z.string().min(1),
  reach: reachSchema,
  halfLifeDays: z.number().int().positive(),
  exhaustive: z.boolean(),
  proves: z.string().min(1),
});

export const categorySchema = z.object({
  id: categoryIdSchema,
  label: z.string().min(1),
  note: z.string().min(1),
});

export const technologySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: categoryIdSchema,
  visibleOn: z.array(surfaceIdSchema),
  absenceEstablishableOn: z.array(surfaceIdSchema),
});

export const relationSchema = z.union([
  z.object({
    kind: z.literal("competes_with"),
    a: z.string().min(1),
    b: z.string().min(1),
  }),
  z.object({
    kind: z.literal("implies"),
    from: z.string().min(1),
    to: z.string().min(1),
    toKind: z.enum(["technology", "category"]),
    because: z.string().min(1),
  }),
  z.object({
    kind: z.literal("superseded_by"),
    old: z.string().min(1),
    replacement: z.string().min(1),
  }),
]);

export const observationSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  surface: surfaceIdSchema,
  observedOn: isoDate,
  raw: z.string().min(1),
  kind: evidenceKindSchema,
  technologyId: z.string().min(1),
  ruleId: z.string().min(1),
});

export const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z
    .string()
    .regex(/\.example$/, "corpus domains must end in .example"),
  employees: z.number().int().positive(),
  industry: z.string().min(1),
  trap: z.string().min(1),
  trapNote: z.string().min(1),
});

export const predicateSchema = z.union([
  z.object({
    op: z.literal("has"),
    technologyId: z.string().min(1),
    minGrade: gradeSchema,
  }),
  z.object({
    op: z.literal("has_any_in"),
    categoryId: categoryIdSchema,
    minGrade: gradeSchema,
  }),
  z.object({
    op: z.literal("count_in"),
    categoryId: categoryIdSchema,
    atLeast: z.number().int().min(1).max(8),
    minGrade: gradeSchema,
  }),
  z.object({ op: z.literal("not"), technologyId: z.string().min(1) }),
  z.object({ op: z.literal("gap"), categoryId: categoryIdSchema }),
]);

export const querySchema = z.object({
  predicates: z.array(predicateSchema).min(1).max(8),
  asOf: isoDate,
});

export const presetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  blurb: z.string().min(1),
  predicates: z.array(predicateSchema).min(1),
});

/**
 * The shape the model is allowed to return from /api/translate. Deliberately
 * the query schema minus `asOf` — the model does not get to move time.
 */
export const translatedQuerySchema = z.object({
  predicates: z.array(predicateSchema).min(1).max(8),
  note: z.string().max(280).optional(),
});

export type TranslatedQuery = z.infer<typeof translatedQuerySchema>;
