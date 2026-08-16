/**
 * One URL, two surfaces.
 *
 * A live fetch can populate `page_markup` and `http_headers` and nothing else.
 * Every other surface stays UNKNOWN — never ABSENT — which is the thesis
 * demonstrating itself on data the user chose.
 */

import { FETCHABLE_SURFACES } from "@/lib/technographics";
import type { Observation, SurfaceId } from "@/lib/technographics";
import { DETECTION_RULES } from "./rules";

const TIMEOUT_MS = 6_000;
const MAX_BYTES = 1_500_000;

export class InspectError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type InspectResult = {
  url: string;
  fetchedOn: string;
  inspectedSurfaces: SurfaceId[];
  observations: Observation[];
};

export function normaliseUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new InspectError("That is not a URL this can fetch.", 400);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new InspectError("Only http and https URLs can be inspected.", 400);
  }
  if (isPrivateHost(url.hostname)) {
    throw new InspectError(
      "Private and loopback addresses are not fetched.",
      400,
    );
  }
  return url;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = [parts[0] ?? 0, parts[1] ?? 0];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return host === "[::1]" || host.startsWith("[fd") || host.startsWith("[fe80");
}

async function robotsAllows(url: URL, signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(new URL("/robots.txt", url.origin), {
      signal,
      redirect: "follow",
    });
    if (!response.ok) return true;
    const text = (await response.text()).slice(0, 100_000);
    return !disallowsRoot(text);
  } catch {
    // No robots.txt, or it could not be read. Fetching one page is allowed.
    return true;
  }
}

function disallowsRoot(robots: string): boolean {
  let inStarGroup = false;
  for (const rawLine of robots.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (line === "") continue;
    const [field, ...rest] = line.split(":");
    const key = field?.trim().toLowerCase() ?? "";
    const value = rest.join(":").trim();
    if (key === "user-agent") inStarGroup = value === "*";
    else if (key === "disallow" && inStarGroup && value === "/") return true;
  }
  return false;
}

export async function inspectUrl(input: string, today: string): Promise<InspectResult> {
  const url = normaliseUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (!(await robotsAllows(url, controller.signal))) {
      throw new InspectError(
        "This site's robots.txt disallows crawling, so nothing was fetched.",
        403,
      );
    }

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "techstack-icp (one page, on request)" },
    });

    if (!response.ok) {
      throw new InspectError(
        `The site answered ${response.status}. Nothing was inspected.`,
        502,
      );
    }

    const html = (await response.text()).slice(0, MAX_BYTES);
    const headerLines = [...response.headers.entries()].map(
      ([name, value]) => `${name}: ${value}`,
    );

    const observations: Observation[] = [];
    let index = 0;

    for (const rule of DETECTION_RULES) {
      const haystacks =
        rule.surface === "page_markup" ? [html] : headerLines;

      for (const haystack of haystacks) {
        const match = rule.pattern.exec(haystack);
        rule.pattern.lastIndex = 0;
        if (match === null) continue;
        index += 1;
        observations.push({
          id: `live-${index}`,
          companyId: "live",
          surface: rule.surface,
          observedOn: today,
          raw: match[0].slice(0, 240),
          kind: rule.kind,
          technologyId: rule.technologyId,
          ruleId: rule.id,
        });
        break;
      }
    }

    return {
      url: url.toString(),
      fetchedOn: today,
      inspectedSurfaces: [...FETCHABLE_SURFACES],
      observations,
    };
  } catch (error) {
    if (error instanceof InspectError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new InspectError("The site took longer than six seconds.", 504);
    }
    throw new InspectError("The site could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
}
