/**
 * Detection rules for the live path.
 *
 * Deliberately small and deliberately literal. Every rule names the technology
 * it fires for and the surface it fires on, and the matched text is what gets
 * shown in the receipt — a rule whose match you cannot read is a rule you
 * cannot disagree with.
 */

import type { EvidenceKind, SurfaceId } from "@/lib/technographics";

export type DetectionRule = {
  id: string;
  technologyId: string;
  surface: SurfaceId;
  kind: EvidenceKind;
  pattern: RegExp;
};

export const DETECTION_RULES: DetectionRule[] = [
  {
    id: "ga4/gtag-measurement-id",
    technologyId: "ga4",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /gtag\/js\?id=G-[A-Z0-9]+/i,
  },
  {
    id: "ua/ga-create-call",
    technologyId: "universal_analytics",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /UA-\d{4,10}-\d{1,4}/,
  },
  {
    id: "segment/analytics-js-writekey",
    technologyId: "segment",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /cdn\.segment\.(com|io)\/analytics\.js[^"'\s]*/i,
  },
  {
    id: "rudderstack/sdk-script",
    technologyId: "rudderstack",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /rudder-analytics(\.min)?\.js/i,
  },
  {
    id: "amplitude/init-call",
    technologyId: "amplitude",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /amplitude[^"'\s]{0,40}\.(js|min\.js)|amplitude\.getInstance\(\)/i,
  },
  {
    id: "mixpanel/init-token",
    technologyId: "mixpanel",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /mixpanel(\.init|[^"'\s]{0,30}\.js)/i,
  },
  {
    id: "heap/loader-script",
    technologyId: "heap",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /heapanalytics\.com\/js\/heap-\d+\.js/i,
  },
  {
    id: "intercom/app-id-settings",
    technologyId: "intercom",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /intercomSettings|widget\.intercom\.io/i,
  },
  {
    id: "zendesk/ekr-snippet",
    technologyId: "zendesk",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /static\.zdassets\.com\/ekr\/snippet\.js[^"'\s]*/i,
  },
  {
    id: "drift/include-script",
    technologyId: "drift",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /js\.driftt\.com\/include\/[^"'\s]+/i,
  },
  {
    id: "crisp/loader-script",
    technologyId: "crisp",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /client\.crisp\.chat\/l\.js/i,
  },
  {
    id: "front/chat-widget",
    technologyId: "front",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /chat\.frontapp\.com\/[^"'\s]+/i,
  },
  {
    id: "hubspot/hs-scripts-portal",
    technologyId: "hubspot_marketing",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /js\.hs-scripts\.com\/\d+\.js/i,
  },
  {
    id: "hubspot/cms-generator-meta",
    technologyId: "hubspot_crm",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /<meta[^>]+content="HubSpot[^"]*"[^>]*>/i,
  },
  {
    id: "marketo/munchkin-script",
    technologyId: "marketo",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /munchkin\.js|marketo\.com\/[^"'\s]+/i,
  },
  {
    id: "braze/sdk-script",
    technologyId: "braze",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /appboy(\.min)?\.js|braze[^"'\s]{0,20}\.js/i,
  },
  {
    id: "customer_io/track-script",
    technologyId: "customer_io",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /customerio|cdp\.customer\.io[^"'\s]*/i,
  },
  {
    id: "salesforce/web-to-lead-form",
    technologyId: "salesforce",
    surface: "page_markup",
    kind: "runtime_artifact",
    pattern: /webto\.salesforce\.com[^"'\s]*|pardot\.com[^"'\s]*/i,
  },
  {
    id: "cloudflare/server-header",
    technologyId: "cloudflare",
    surface: "http_headers",
    kind: "configuration_record",
    pattern: /^(server: cloudflare|cf-ray: .+)$/i,
  },
  {
    id: "fastly/x-served-by",
    technologyId: "fastly",
    surface: "http_headers",
    kind: "configuration_record",
    pattern: /^(x-served-by: cache-.+|x-fastly-request-id: .+)$/i,
  },
  {
    id: "vercel/x-vercel-id",
    technologyId: "vercel",
    surface: "http_headers",
    kind: "configuration_record",
    pattern: /^(x-vercel-id: .+|server: vercel)$/i,
  },
  {
    id: "cloudfront/x-amz-cf-pop",
    technologyId: "cloudfront",
    surface: "http_headers",
    kind: "configuration_record",
    pattern: /^(x-amz-cf-pop: .+|x-amz-cf-id: .+)$/i,
  },
];
