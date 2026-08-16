/**
 * The technology graph. Data, not code — if the engine ever needs
 * `if (technologyId === ...)`, a field is missing from a record here.
 *
 * `visibleOn` is where presence can ever be observed. `absenceEstablishableOn`
 * is where *not* seeing it establishes absence, and is always a subset of the
 * exhaustive surfaces. An empty `absenceEstablishableOn` means every negative
 * query over that technology is uncomputable — which is true of the entire data
 * layer, and is the point.
 */

import type { Category, Relation, Technology } from "@/lib/technographics/types";

export const CATEGORIES: Category[] = [
  {
    id: "analytics",
    label: "Product & web analytics",
    note: "Client-side by nature. The most visible category there is.",
  },
  {
    id: "cdp",
    label: "Customer data platform",
    note: "Ships a browser tag, so presence and absence are both observable.",
  },
  {
    id: "warehouse",
    label: "Data warehouse",
    note: "Server-side. Never appears in markup, headers or DNS — structurally dark.",
  },
  {
    id: "reverse_etl",
    label: "Reverse ETL",
    note: "Runs between the warehouse and SaaS tools. Nothing client-side to see.",
  },
  {
    id: "support_chat",
    label: "Support & chat",
    note: "A widget on the page. Absence here is real absence.",
  },
  {
    id: "crm",
    label: "CRM",
    note: "Visible only when it leaks — forms, tracking pixels, MX records.",
  },
  {
    id: "marketing_automation",
    label: "Marketing automation",
    note: "Leaves tags and mail records. Proves marketing, not engineering.",
  },
  {
    id: "infra_edge",
    label: "Edge & CDN",
    note: "Announces itself in response headers.",
  },
];

// Surface shorthands, so the table below stays readable.
const PAGE = "page_markup" as const;
const HEAD = "http_headers" as const;
const DNS = "dns_records" as const;
const JOB = "job_posting" as const;
const BLOG = "engineering_blog" as const;
const DIR = "integrations_directory" as const;

/** Client-side tags: visible on the page, and absence there means absence. */
const CLIENT_TAG = {
  visibleOn: [PAGE, JOB, BLOG, DIR],
  absenceEstablishableOn: [PAGE],
};

/** The dark half of the stack: talked about, never observable directly. */
const SERVER_SIDE = {
  visibleOn: [JOB, BLOG, DIR],
  absenceEstablishableOn: [],
};

export const TECHNOLOGIES: Technology[] = [
  // analytics — 5
  { id: "ga4", name: "Google Analytics 4", category: "analytics", ...CLIENT_TAG },
  { id: "universal_analytics", name: "Universal Analytics", category: "analytics", ...CLIENT_TAG },
  { id: "amplitude", name: "Amplitude", category: "analytics", ...CLIENT_TAG },
  { id: "mixpanel", name: "Mixpanel", category: "analytics", ...CLIENT_TAG },
  { id: "heap", name: "Heap", category: "analytics", ...CLIENT_TAG },

  // cdp — 3
  { id: "segment", name: "Segment", category: "cdp", ...CLIENT_TAG },
  { id: "rudderstack", name: "RudderStack", category: "cdp", ...CLIENT_TAG },
  { id: "mparticle", name: "mParticle", category: "cdp", ...CLIENT_TAG },

  // warehouse — 5, all structurally dark
  { id: "snowflake", name: "Snowflake", category: "warehouse", ...SERVER_SIDE },
  { id: "bigquery", name: "BigQuery", category: "warehouse", ...SERVER_SIDE },
  { id: "redshift", name: "Redshift", category: "warehouse", ...SERVER_SIDE },
  { id: "databricks", name: "Databricks", category: "warehouse", ...SERVER_SIDE },
  { id: "clickhouse", name: "ClickHouse", category: "warehouse", ...SERVER_SIDE },

  // reverse_etl — 3, also dark
  { id: "hightouch", name: "Hightouch", category: "reverse_etl", ...SERVER_SIDE },
  { id: "census", name: "Census", category: "reverse_etl", ...SERVER_SIDE },
  { id: "grouparoo", name: "Grouparoo", category: "reverse_etl", ...SERVER_SIDE },

  // support_chat — 5, the most observable category in the model
  { id: "intercom", name: "Intercom", category: "support_chat", ...CLIENT_TAG },
  { id: "zendesk", name: "Zendesk", category: "support_chat", ...CLIENT_TAG },
  { id: "drift", name: "Drift", category: "support_chat", ...CLIENT_TAG },
  { id: "front", name: "Front", category: "support_chat", ...CLIENT_TAG },
  { id: "crisp", name: "Crisp", category: "support_chat", ...CLIENT_TAG },

  // crm — 3. Leaks through forms and mail routing, so absence is only
  // establishable on the page, not in DNS.
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    visibleOn: [PAGE, DNS, JOB, BLOG, DIR],
    absenceEstablishableOn: [],
  },
  {
    id: "hubspot_crm",
    name: "HubSpot CRM",
    category: "crm",
    visibleOn: [PAGE, DNS, JOB, DIR],
    absenceEstablishableOn: [],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "crm",
    visibleOn: [PAGE, JOB, DIR],
    absenceEstablishableOn: [],
  },

  // marketing_automation — 4
  {
    id: "marketo",
    name: "Marketo",
    category: "marketing_automation",
    visibleOn: [PAGE, DNS, JOB, DIR],
    absenceEstablishableOn: [PAGE, DNS],
  },
  {
    id: "hubspot_marketing",
    name: "HubSpot Marketing",
    category: "marketing_automation",
    visibleOn: [PAGE, DNS, JOB, DIR],
    absenceEstablishableOn: [PAGE, DNS],
  },
  { id: "braze", name: "Braze", category: "marketing_automation", ...CLIENT_TAG },
  { id: "customer_io", name: "Customer.io", category: "marketing_automation", ...CLIENT_TAG },

  // infra_edge — 4. Announced in headers, so absence there is real.
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "infra_edge",
    visibleOn: [HEAD, DNS, JOB, BLOG],
    absenceEstablishableOn: [HEAD],
  },
  {
    id: "fastly",
    name: "Fastly",
    category: "infra_edge",
    visibleOn: [HEAD, JOB, BLOG],
    absenceEstablishableOn: [HEAD],
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "infra_edge",
    visibleOn: [HEAD, JOB, BLOG],
    absenceEstablishableOn: [HEAD],
  },
  {
    id: "cloudfront",
    name: "CloudFront",
    category: "infra_edge",
    visibleOn: [HEAD, JOB, BLOG],
    absenceEstablishableOn: [HEAD],
  },
];

/**
 * Four relations. `competes_with` drives the migration flag, `implies` lets the
 * system point at its own blind spots without pretending to see into them, and
 * `superseded_by` is what makes a still-loading tag vestigial rather than live.
 */
export const RELATIONS: Relation[] = [
  // Mutually exclusive in practice — two CONFIRMED means a migration is running.
  { kind: "competes_with", a: "segment", b: "rudderstack" },
  { kind: "competes_with", a: "segment", b: "mparticle" },
  { kind: "competes_with", a: "rudderstack", b: "mparticle" },
  { kind: "competes_with", a: "intercom", b: "zendesk" },
  { kind: "competes_with", a: "intercom", b: "drift" },
  { kind: "competes_with", a: "zendesk", b: "front" },
  { kind: "competes_with", a: "hightouch", b: "census" },
  { kind: "competes_with", a: "amplitude", b: "mixpanel" },
  { kind: "competes_with", a: "cloudflare", b: "fastly" },

  // Inference past the blind spot. Never promotes a state.
  {
    kind: "implies",
    from: "segment",
    to: "warehouse",
    toKind: "category",
    because: "a CDP with no destination warehouse is an expensive tag manager",
  },
  {
    kind: "implies",
    from: "rudderstack",
    to: "warehouse",
    toKind: "category",
    because: "RudderStack is sold as warehouse-first; the warehouse precedes it",
  },
  {
    kind: "implies",
    from: "hightouch",
    to: "warehouse",
    toKind: "category",
    because: "reverse ETL syncs out of a warehouse, so one exists",
  },
  {
    kind: "implies",
    from: "census",
    to: "warehouse",
    toKind: "category",
    because: "reverse ETL syncs out of a warehouse, so one exists",
  },

  // A predecessor still loading next to its replacement is vestigial.
  { kind: "superseded_by", old: "universal_analytics", replacement: "ga4" },
  { kind: "superseded_by", old: "grouparoo", replacement: "hightouch" },
];
