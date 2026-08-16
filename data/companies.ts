/**
 * Fourteen companies, every one of them invented, every domain ending in
 * `.example`. Each carries one named trap, and each trap has a test named after
 * it in `lib/technographics/traps.test.ts`.
 *
 * `inspections` is the record of which surfaces were looked at and when —
 * including surfaces where nothing was found. That list is what makes `ABSENT`
 * reachable and is therefore as load-bearing as the observations themselves.
 */

import type { Company } from "@/lib/technographics/types";

export const COMPANIES: Company[] = [
  {
    id: "northwind",
    name: "Northwind Retail",
    domain: "northwind.example",
    employees: 640,
    industry: "Retail",
    inspections: [
      { surface: "page_markup", on: "2026-06-02" },
      { surface: "http_headers", on: "2026-06-02" },
      { surface: "engineering_blog", on: "2026-03-11" },
      { surface: "job_posting", on: "2026-05-20" },
    ],
    trap: "vestigial",
    trapNote:
      "A retired analytics tag is still loading months after engineering wrote that it was switched off. The tag is real; the deployment is not. Compare Thornbury, where the same shape has to be caught from the graph alone.",
  },
  {
    id: "tessellate",
    name: "Tessellate",
    domain: "tessellate.example",
    employees: 310,
    industry: "B2B SaaS",
    inspections: [
      { surface: "page_markup", on: "2026-07-28" },
      { surface: "http_headers", on: "2026-07-28" },
      { surface: "job_posting", on: "2026-07-02" },
    ],
    trap: "mid_migration",
    trapNote:
      "Two competing CDPs are both confirmed on the page at once. That is not a data error — it is the single most actionable week to call.",
  },
  {
    id: "kestrel",
    name: "Kestrel Health",
    domain: "kestrelhealth.example",
    employees: 1_400,
    industry: "Healthcare",
    inspections: [
      { surface: "page_markup", on: "2026-07-09" },
      { surface: "http_headers", on: "2026-07-09" },
      { surface: "job_posting", on: "2026-06-14" },
    ],
    trap: "aspirational_posting",
    trapNote:
      "A job posting asks for three years of a warehouse nobody has deployed. Evidence that somebody wants it, in a different tense from evidence that it is running.",
  },
  {
    id: "bellwether",
    name: "Bellwether Labs",
    domain: "bellwetherlabs.example",
    employees: 95,
    industry: "Life sciences",
    inspections: [
      { surface: "page_markup", on: "2026-08-04" },
      { surface: "dns_records", on: "2026-08-04" },
    ],
    trap: "marketing_only_reach",
    trapNote:
      "Everything confirmed here was confirmed on marketing surfaces. An ICP that reads it as engineering adoption is measuring the marketing budget.",
  },
  {
    id: "ardent",
    name: "Ardent Freight",
    domain: "ardentfreight.example",
    employees: 2_200,
    industry: "Logistics",
    inspections: [
      { surface: "page_markup", on: "2026-07-21" },
      { surface: "http_headers", on: "2026-07-21" },
      { surface: "integrations_directory", on: "2026-05-30" },
    ],
    trap: "implied_but_dark",
    trapNote:
      "A confirmed CDP means a warehouse exists somewhere. No surface in this model can say which one, and the implication must not pretend otherwise.",
  },
  {
    id: "vermilion",
    name: "Vermilion",
    domain: "vermilion.example",
    employees: 48,
    industry: "Design tooling",
    inspections: [{ surface: "page_markup", on: "2026-07-02" }],
    trap: "one_surface_only",
    trapNote:
      "One surface was ever looked at. For most questions the honest answer here is that nobody has checked — which is not the same answer as no.",
  },
  {
    id: "solstice",
    name: "Solstice Financial",
    domain: "solsticefinancial.example",
    employees: 5_800,
    industry: "Financial services",
    inspections: [
      { surface: "page_markup", on: "2026-08-07" },
      { surface: "http_headers", on: "2026-08-07" },
      { surface: "dns_records", on: "2026-08-07" },
      { surface: "engineering_blog", on: "2026-02-19" },
    ],
    trap: "uncomputable_negation",
    trapNote:
      "Four surfaces inspected, three of them exhaustive, and the obvious question — do they run a competing warehouse — is still unanswerable at any price.",
  },
  {
    id: "harborview",
    name: "Harborview",
    domain: "harborview.example",
    employees: 780,
    industry: "Hospitality",
    inspections: [
      { surface: "page_markup", on: "2026-08-01" },
      { surface: "http_headers", on: "2026-08-01" },
      { surface: "dns_records", on: "2026-08-01" },
    ],
    trap: "displacement_target",
    trapNote:
      "The competitor's widget is loading right now on a page fetched a fortnight ago. This is what a technographic claim looks like when it is actually strong.",
  },
  {
    id: "quillon",
    name: "Quillon",
    domain: "quillon.example",
    employees: 420,
    industry: "Media",
    inspections: [
      { surface: "page_markup", on: "2023-05-10" },
      { surface: "http_headers", on: "2023-05-10" },
    ],
    trap: "stale",
    trapNote:
      "Every detection here was confirmed — three years ago. Move the as-of date back and the account is a perfect match; leave it today and nobody has checked since.",
  },
  {
    id: "meridian",
    name: "Meridian Grid",
    domain: "meridiangrid.example",
    employees: 3_100,
    industry: "Energy",
    inspections: [
      { surface: "page_markup", on: "2026-04-18" },
      { surface: "dns_records", on: "2026-04-18" },
      { surface: "http_headers", on: "2026-04-18" },
    ],
    trap: "dns_only",
    trapNote:
      "Nothing on the page. The entire detection is a mail record, which is why a page-only crawler reports this account as running nothing.",
  },
  {
    id: "palisade",
    name: "Palisade",
    domain: "palisade.example",
    employees: 260,
    industry: "Construction tech",
    inspections: [
      { surface: "page_markup", on: "2026-08-05" },
      { surface: "http_headers", on: "2026-08-05" },
      { surface: "job_posting", on: "2026-07-15" },
    ],
    trap: "answerable_gap",
    trapNote:
      "No chat widget on a page that was actually fetched. Chat widgets are exhaustively visible, so this absence is real — the gap query that does have an answer.",
  },
  {
    id: "cinder",
    name: "Cinder & Co",
    domain: "cinderandco.example",
    employees: 150,
    industry: "E-commerce",
    inspections: [
      { surface: "page_markup", on: "2026-07-19" },
      { surface: "http_headers", on: "2026-07-19" },
      { surface: "engineering_blog", on: "2026-06-30" },
    ],
    trap: "contradiction",
    trapNote:
      "The page loads the old vendor. The engineering blog says they replaced it. Both are true, and only one of them is about today.",
  },
  {
    id: "oakline",
    name: "Oakline",
    domain: "oakline.example",
    employees: 890,
    industry: "Insurance",
    inspections: [
      { surface: "page_markup", on: "2026-07-30" },
      { surface: "http_headers", on: "2026-07-30" },
      { surface: "integrations_directory", on: "2026-06-11" },
    ],
    trap: "excluded",
    trapNote:
      "Runs the tool the query rules out, confirmed on an exhaustive surface. A definitive no is a result, not a failure.",
  },
  {
    id: "thornbury",
    name: "Thornbury",
    domain: "thornbury.example",
    employees: 1_050,
    industry: "Education",
    inspections: [
      { surface: "page_markup", on: "2026-07-11" },
      { surface: "http_headers", on: "2026-07-11" },
      { surface: "job_posting", on: "2026-05-28" },
    ],
    trap: "supersession_chain",
    trapNote:
      "A retired analytics tag and its replacement are both loading. Counting both inflates the stack; ignoring the retired one loses the migration story.",
  },
];
