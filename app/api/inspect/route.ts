import { NextResponse } from "next/server";
import { z } from "zod";
import { InspectError, inspectUrl } from "@/lib/inspect/fetch-site";
import { rateLimit } from "@/lib/translate/rate-limit";
import { GRAPH } from "@/data/graph";
import { resolveCompany, SURFACES } from "@/lib/technographics";

const bodySchema = z.object({
  url: z.string().min(3).max(300),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give me a URL to fetch." }, { status: 400 });
  }

  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`inspect:${key}`, Date.now());
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Inspection is limited to six requests a minute. Try again in ${limit.retryAfterSeconds}s.`,
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const inspection = await inspectUrl(parsed.data.url, parsed.data.asOf);

    // The same engine the corpus goes through. Two surfaces were inspected, so
    // four are UNKNOWN — and the resolution says so rather than reporting them
    // as absent.
    const resolution = resolveCompany({
      company: {
        id: "live",
        name: inspection.url,
        domain: "live.example",
        employees: 1,
        industry: "live inspection",
        inspections: inspection.inspectedSurfaces.map((surface) => ({
          surface,
          on: inspection.fetchedOn,
        })),
        trap: "live",
        trapNote: "Fetched on request. Two surfaces of six.",
      },
      observations: inspection.observations,
      graph: GRAPH,
      asOf: parsed.data.asOf,
    });

    return NextResponse.json({
      url: inspection.url,
      inspectedSurfaces: inspection.inspectedSurfaces,
      uninspectedSurfaces: SURFACES.filter(
        (surface) => !inspection.inspectedSurfaces.includes(surface.id),
      ).map((surface) => surface.label),
      claims: Object.values(resolution.claims)
        .filter((claim) => claim.state === "PRESENT")
        .map((claim) => ({
          technology: GRAPH.technology(claim.technologyId).name,
          grade: claim.grade,
          rule: claim.evidence[0]?.observation.ruleId ?? null,
          raw: claim.evidence[0]?.observation.raw ?? null,
          surface: claim.evidence[0]?.surface.label ?? null,
        })),
    });
  } catch (error) {
    if (error instanceof InspectError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Inspection failed." }, { status: 500 });
  }
}
