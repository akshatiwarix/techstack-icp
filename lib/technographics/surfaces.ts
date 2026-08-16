/**
 * The six surfaces.
 *
 * Two fields carry all the weight. `reach` is what a detection on this surface
 * proves about the organisation — a CDP tag in marketing-site markup proves the
 * marketing team bought a CDP and nothing more. `exhaustive` is whether *not*
 * seeing something here can mean it is absent: a fetched page enumerates what is
 * installed on it, a job posting enumerates nothing.
 */

import { surfaceSchema } from "./schema";
import type { Surface, SurfaceId } from "./types";
import { SURFACE_IDS } from "./types";

const RAW_SURFACES: Surface[] = [
  {
    id: "page_markup",
    label: "Page markup",
    reach: "marketing",
    halfLifeDays: 180,
    exhaustive: true,
    proves: "the marketing site loads this. Says nothing about engineering.",
  },
  {
    id: "http_headers",
    label: "HTTP headers",
    reach: "edge_infra",
    halfLifeDays: 90,
    exhaustive: true,
    proves: "this sits in front of the site. Edge and CDN only.",
  },
  {
    id: "dns_records",
    label: "DNS records",
    reach: "email_infra",
    halfLifeDays: 365,
    exhaustive: true,
    proves: "the domain is configured to route through this.",
  },
  {
    id: "job_posting",
    label: "Job posting",
    reach: "engineering_intent",
    halfLifeDays: 120,
    exhaustive: false,
    proves: "somebody wants this skill. Intent, not deployment.",
  },
  {
    id: "engineering_blog",
    label: "Engineering blog",
    reach: "engineering",
    halfLifeDays: 540,
    exhaustive: false,
    proves: "engineering wrote about this. Often years out of date.",
  },
  {
    id: "integrations_directory",
    label: "Integrations directory",
    reach: "commercial",
    halfLifeDays: 270,
    exhaustive: false,
    proves: "a commercial relationship exists. Not a deployment.",
  },
];

export const SURFACES: Surface[] = RAW_SURFACES.map((surface) =>
  surfaceSchema.parse(surface),
);

const BY_ID = new Map<SurfaceId, Surface>(
  SURFACES.map((surface) => [surface.id, surface]),
);

export function getSurface(id: SurfaceId): Surface {
  const surface = BY_ID.get(id);
  if (surface === undefined) {
    throw new Error(`unknown surface: ${id}`);
  }
  return surface;
}

/**
 * Surfaces on which not-seeing can mean absence. Anything outside this set is
 * narrative: silence there is silence, not evidence.
 */
export const EXHAUSTIVE_SURFACES: SurfaceId[] = SURFACES.filter(
  (surface) => surface.exhaustive,
).map((surface) => surface.id);

/** The two surfaces a single live URL fetch can ever populate. */
export const FETCHABLE_SURFACES: SurfaceId[] = ["page_markup", "http_headers"];

export function isSurfaceId(value: string): value is SurfaceId {
  return (SURFACE_IDS as readonly string[]).includes(value);
}
