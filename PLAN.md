# Day 008 — TechStack ICP — Implementation Plan

Day 008 of a 100-day building challenge. The concept is fixed by the master
backlog (`~/Desktop/100-days-portfolio-execution-plan.md`): *a prospecting
concept for identifying or ranking accounts based on technologies they appear to
use.* Every choice below came out of a decision-by-decision interview across
three rounds and is deliberate rather than a default. The 24 settled decisions
are recorded at the bottom; treat them as decided, not as open questions to
relitigate.

**Time limit:** one day. Feature-frozen at plan sign-off.

---

## Problem

Technographic data is sold as fact and consumed as fact. A vendor row says

```json
{ "company": "northwind.example", "technologies": ["Segment", "Snowflake", "Intercom"] }
```

and every downstream system — the ICP filter, the territory carve, the "they use
our competitor" campaign — treats those three strings as equally true, equally
current, and equally meaningful. None of that survives contact with how the data
was actually produced.

Four failures live inside that JSON array, and this repo exists because of them.

**A detection is an observation, not a fact.** Somebody saw something: a script
tag in the page markup, a `Server:` header, an SPF include, a sentence in a job
posting, a logo in an integrations directory. Those are not interchangeable
sources of the same claim. A script tag that is loading right now is a runtime
artifact — the strongest thing you can have. A job posting that asks for three
years of Databricks is evidence that somebody *wants* Databricks, which is a
different sentence in a different tense. The array flattens all of it to a
string, and the string is what the rep reads.

**A detection has a reach, and the reach is usually not what the rep assumed.**
A CDP tag in the marketing site's markup proves that the marketing team bought a
CDP. It says nothing about the data team, and an ICP built on "companies with
modern data infrastructure" that fires on marketing-site tags is measuring
marketing budget. The reach of a surface is knowable and declarable, and no
product declares it.

**Absence of evidence is sold as evidence of absence.** The highest-value
technographic queries are negative — *does not use our competitor*, *has a CDP
but no reverse ETL*, *no chat widget yet*. And negation is exactly where the
data model collapses. "Not detected" gets rendered as "does not use," and
whether that inference is sound depends entirely on whether the technology would
necessarily have shown up on a surface you actually inspected. An Intercom
widget would have: chat widgets are client-side and exhaustively visible on a
page you fetched, so its absence means something. Snowflake would not have:
warehouses are server-side, and no amount of fetching the marketing site will
ever produce their absence. Same query shape, one sound, one meaningless, and no
tool in the category tells you which one you just ran.

**The detectable set is biased, and the bias deforms the ICP.** You can see what
is client-side. So technographic ICPs skew hard toward marketing and frontend
tooling, and the entire data and internal-tooling layer is dark. Teams then
build profiles out of the tools that happen to be visible and conclude that
those tools are what predicts a good customer.

So the interesting problems are:

- Can a technology claim carry its **evidence, surface, reach, and age** all the
  way to the rep, instead of collapsing to a boolean?
- Can the system distinguish *we looked and it is not there* from *we did not
  look* from *nothing we can ever look at would show this* — and **refuse** the
  queries that fall in the third bucket?
- Can a system **infer past its own blind spots** — a confirmed CDP implies a
  warehouse exists even though every warehouse is invisible — without pretending
  the inference is a detection?
- Can technographic prospecting work as **stack shape** (co-presence, mutual
  exclusion, supersession, gaps) rather than set membership?

### What this repo is not

Three sibling repos own the neighbouring problems and this one does not rebuild
any of them.

- **Day 001 `icp-score`** owns weighted scoring with visible arithmetic. Day 008
  has **no score, no weights, no number**. Results are grouped into tiers, and
  the grouping is a state machine, not a sum.
- **Day 005 `signal-scout`** owns deriving events by diffing dated observations.
  Day 008 dates its observations and decays their confidence, but derives **no
  events, no timeline, no diffs**.
- **Day 006 `account-brief`** owns character-span provenance. Day 008 shows the
  raw observation and the **detection rule that fired** — surface, pattern,
  date, resulting grade. **No spans, no offsets, no citation UI.**
- **Day 007 `why-now`** asks whether an inference *follows*. Day 008 asks
  whether we *know the thing at all*, and what we can structurally never know.

---

## Intended user

A GTM engineer or RevOps person building a technographic segment, and the AE who
has to work the list it produces.

The GTM engineer's failure today is silent: they write `NOT uses Snowflake`, the
filter returns 4,000 accounts, and nothing in the product indicates that the
predicate was uncomputable and the 4,000 are the entire database minus a rounding
error. The AE's failure is downstream and louder: they open with "I saw you're
running Segment" to a company that ripped it out fourteen months ago and left the
tag on the page.

Both failures are addressed by the same decision: make the epistemic status of
every claim part of the interface rather than a footnote in the vendor's
methodology PDF.

---

## User journey

1. Page loads with **14 companies already resolved** against a default query.
   No sign-up, no key, no upload, no empty state.
2. The fleet is grouped into tiers — `MATCH`, `MIGRATING`, `INCONCLUSIVE`,
   `UNANSWERABLE`, `EXCLUDED` — not sorted by a number.
3. User picks a preset or edits the query: add `has(Segment)`, set its minimum
   confidence to `CONFIRMED`, add `gap(reverse_etl)`.
4. The `gap(reverse_etl)` predicate is **struck through in the builder before it
   runs**, because reverse ETL absence is not establishable on any surface in
   the model. Running it anyway produces the `UNANSWERABLE` tier with the reason
   in one sentence.
5. User swaps it for `gap(support_chat)`, which *is* establishable — chat
   widgets are exhaustively visible in page markup — and gets a real answer.
6. User opens an account. The panel shows every claim with its state, grade,
   evidence receipts, and reach; a coverage strip showing which of the eight
   categories can be seen at all for this account; and the implied-but-dark
   entries ("Segment is CONFIRMED, and Segment implies a warehouse; no surface
   in this model can see which one").
7. Optional, collapsed: describe the segment in plain English and have it
   translated into an editable query. Optional, collapsed: fetch a live URL and
   watch two surfaces get populated and the other four stay `UNKNOWN`.
8. User copies the permalink or exports the fleet as CSV — with the four-state
   value preserved per predicate, so `UNKNOWN` does not become a blank cell.

---

## MVP scope

**In:**

- Six detection surfaces with declared reach, half-life, and exhaustiveness.
- 32 technologies across 8 categories, with four graph relations.
- ~120 authored observations across 14 companies, each company carrying at least
  one named trap.
- Four-state claim resolution (`PRESENT` / `ABSENT` / `UNKNOWN` / `UNKNOWABLE`)
  with three presence grades (`CONFIRMED` / `LIKELY` / `HINTED`), contradiction
  handling, and age decay.
- Query builder: `has`, `has_any_in`, `count_in`, `not`, `gap`, each with a
  minimum-confidence threshold. Four presets.
- Five-tier result grouping with a refusal path for uncomputable predicates.
- Account panel: evidence receipts, coverage strip, implied-but-dark, migration
  and vestigial flags.
- As-of date control (decay is visible, not theoretical).
- Query permalink and CSV export.
- Optional Gemini prose→query translation (key-optional).
- Optional live single-URL fetch populating exactly two surfaces (key-free,
  rate-limited, cuttable).
- `lib/technographics/` as a dependency-free, framework-free package.

**Out (explicitly) — as binding as the "In" list:**

- Any numeric score, weight, or ranking arithmetic. That is Day 001.
- Event derivation, timelines, or observation diffing. That is Day 005.
- Character spans, offsets, or citation resolution. That is Day 006.
- Argument chains, warrants, defeaters. That is Day 007.
- Real vendor data, real company names, real domains. Corpus is authored;
  every domain ends in `.example`.
- Auth, accounts, persistence, a database. Corpus is imported and Zod-validated;
  live-fetch results live in memory for the request.
- Crawling more than one URL, following links, or storing fetched content.
- A model anywhere in detection, grading, or state resolution.
- Multi-page apps, routing beyond the single console, dark-mode toggle.

---

## Stack

Unchanged from Days 001–007, deliberately — a reviewer who cloned Day 007 types
the same commands here.

- **Next 16** (App Router), React 19, TypeScript `strict` + `noUncheckedIndexedAccess`
- **Tailwind v4** via `@tailwindcss/postcss`
- **Zod v4** for the corpus contract and the query schema
- **Vitest** (`vitest.config.mts`, globs `lib/**/*.test.ts` only), `vite-node` for scripts
- **npm** as the committed package manager
- **`@google/genai`** — `gemini-2.5-flash`, optional
- **Vercel** for deployment; **GitHub** `akshatiwarix/techstack-icp`, MIT

**Engine boundary (new this day):** `lib/technographics/` imports nothing but
`zod`. No React, no Next, no `@/app`, no DOM globals. Enforced by an eslint
`no-restricted-imports` rule scoped to that directory, with its own `README.md`.
The UI is a client of the engine, provably rather than rhetorically.

---

## APIs / data sources

1. **Authored corpus** (`data/`) — the demo path, zero network, Zod-validated at
   import. Companies, technologies, surfaces, relations, observations.
2. **`POST /api/translate`** — plain English → structured query via
   `gemini-2.5-flash`, structured output validated by Zod, result lands
   **unrun and editable** in the builder. No key → the panel collapses to a line
   pointing at the builder; nothing else changes.
3. **`POST /api/inspect`** — one URL, server-side, 6s timeout, `robots.txt`
   honored, in-memory rate limit, nothing persisted. Yields exactly two
   surfaces: `page_markup` and `http_headers`. Every other surface stays
   `UNKNOWN` — **never** `ABSENT` — and the UI says so. If this proves risky
   mid-build it is cut and replaced by paste-your-own-HTML, which uses the same
   detection path minus the fetch.

The model never detects a technology, never assigns a grade, and never resolves
a state.

---

## System / architecture

```
                    ┌─ server component ─► data/*.ts (Zod-validated at import)
Browser ────────────┤
                    ├─ lib/technographics (pure, zero deps) ─► runs on both sides
                    │
                    ├─ POST /api/translate   ─► Zod ─► query object (unrun)
                    └─ POST /api/inspect     ─► fetch ─► lib/technographics/detect
```

`lib/technographics/`

| module | responsibility |
|---|---|
| `types.ts` | the type contract — surfaces, grades, states, claims, predicates |
| `schema.ts` | Zod schemas for corpus + query; parse at import, throw on bad data |
| `surfaces.ts` | six surfaces: reach, half-life, exhaustiveness |
| `graph.ts` | categories, technologies, four relations, dark-set computation |
| `detect.ts` | observation → evidence (which rule fired, on which surface) |
| `grade.ts` | `(evidence kind, surface, age)` → grade; decay; expiry |
| `resolve.ts` | claims: four states, contradictions, migration, vestigial, implied |
| `query.ts` | predicate evaluation, confidence thresholds, computability check |
| `tier.ts` | account × query → one of five tiers |
| `export.ts` | CSV serialisation and permalink encode/decode |

---

## Data model

### Surface

```ts
type SurfaceId =
  | "page_markup" | "http_headers" | "dns_records"
  | "job_posting" | "engineering_blog" | "integrations_directory";

type Surface = {
  id: SurfaceId;
  reach: "marketing" | "edge_infra" | "email_infra" | "engineering_intent"
       | "engineering" | "commercial";
  halfLifeDays: number;      // 180 / 90 / 365 / 120 / 540 / 270
  exhaustive: boolean;       // can non-observation on this surface mean absence?
};
```

`exhaustive` is true for `page_markup`, `http_headers`, `dns_records` and false
for the three narrative surfaces. A job posting that does not mention Snowflake
is not evidence that Snowflake is absent; a fetched page with no chat widget is
evidence that no chat widget is installed.

### Technology

```ts
type Technology = {
  id: string;
  name: string;
  category: CategoryId;              // 8 categories
  visibleOn: SurfaceId[];            // where presence can ever be observed
  absenceEstablishableOn: SurfaceId[]; // ⊆ exhaustive surfaces; [] ⇒ negation is UNKNOWABLE
};
```

`absenceEstablishableOn` is the single most important field in the repo. Empty
for every warehouse and every reverse-ETL tool; `["page_markup"]` for chat
widgets, analytics, and CDP tags.

### Relations

```ts
type Relation =
  | { kind: "competes_with"; a: string; b: string }   // two CONFIRMED ⇒ MIGRATING
  | { kind: "implies"; from: string; to: string }     // infer past blind spots
  | { kind: "superseded_by"; old: string; new: string } // both present ⇒ VESTIGIAL
```

Category membership is the fourth relation and lives on `Technology.category`.

### Observation and evidence

```ts
type Observation = {
  id: string;
  companyId: string;
  surface: SurfaceId;
  observedOn: string;         // ISO date
  raw: string;                // the script tag / header line / posting paragraph
  kind: "runtime_artifact" | "configuration_record" | "commercial_listing"
      | "stated_requirement" | "stated_mention" | "negative_statement";
  technologyId: string;
  ruleId: string;             // the detection rule that fired
};
```

Base grade, before decay:

| kind | base grade | note |
|---|---|---|
| `runtime_artifact` | `CONFIRMED` | the tag is loading, the header is present |
| `configuration_record` | `CONFIRMED` | MX / SPF / TXT record |
| `commercial_listing` | `LIKELY` | a paid relationship, not a deployment |
| `stated_requirement` | `LIKELY` | job posting asks for N years of it |
| `stated_mention` | `HINTED` | one careers-page or blog sentence |
| `negative_statement` | — | contradiction, never support |

Decay: one grade demotion per elapsed half-life of the observation's surface.
Below `HINTED` the observation is `EXPIRED` and stops supporting the claim.
Confidence therefore never rises as the as-of date advances — an asserted
invariant.

### Claim

```ts
type Claim = {
  technologyId: string;
  state: "PRESENT" | "ABSENT" | "UNKNOWN" | "UNKNOWABLE";
  grade?: "CONFIRMED" | "LIKELY" | "HINTED";     // present only when PRESENT
  reach: Surface["reach"][];                     // what the evidence actually proves
  evidence: Evidence[];
  contradictions: Evidence[];
  flags: ("MIGRATING" | "VESTIGIAL" | "CONTRADICTED")[];
  impliedBy?: string[];                          // set on UNKNOWABLE/UNKNOWN claims
};
```

State resolution, in order:

1. Any surviving supporting evidence → `PRESENT` at the strongest surviving grade.
2. Else, technology has `absenceEstablishableOn` ∩ *surfaces inspected for this
   company* ≠ ∅ → `ABSENT`.
3. Else, `visibleOn` ≠ ∅ → `UNKNOWN` (answerable in principle; we did not look).
4. Else → `UNKNOWABLE`.

`impliedBy` is annotation only. An `implies` edge **never** promotes a state.
The whole point is to show the shape of the dark region, not to pretend to see it.

### Query

```ts
type Predicate =
  | { op: "has"; technologyId: string; minGrade: Grade }
  | { op: "has_any_in"; categoryId: string; minGrade: Grade }
  | { op: "count_in"; categoryId: string; atLeast: number; minGrade: Grade }
  | { op: "not"; technologyId: string }
  | { op: "gap"; categoryId: string };

type Query = { predicates: Predicate[]; asOf: string };
```

`not` and `gap` carry no `minGrade` — negation is not graded, it is either
computable or it is not.

### Tiers

Evaluated per account, first match wins:

| tier | condition |
|---|---|
| `EXCLUDED` | a predicate definitively fails (`not(x)` and `x` is `PRESENT`) |
| `UNANSWERABLE` | a predicate is structurally uncomputable — `UNKNOWABLE` |
| `INCONCLUSIVE` | a predicate depends on `UNKNOWN` — answerable with more data |
| `MIGRATING` | all predicates satisfied, and a `competes_with` pair is both `CONFIRMED` |
| `MATCH` | all predicates satisfied at the requested grade |

> **Refinement of settled decision 12.** The interview settled on
> `MATCH / MATCH_WITH_GAPS / MIGRATING / UNANSWERABLE / EXCLUDED`.
> `MATCH_WITH_GAPS` is replaced by `INCONCLUSIVE`, because the useful
> distinction is *nobody looked* (fixable) versus *nothing can look* (structural)
> — that is decision 9 carried into the result UI. Still five tiers, still no
> number.

---

## The corpus: 14 companies and the trap each one carries

All names invented, all domains `.example`.

| # | Company | Trap |
|---|---|---|
| 1 | Northwind Retail | **Vestigial tag.** Superseded tool still loading in markup; engineering blog says they moved off it. |
| 2 | Tessellate | **Mid-migration.** Two CDPs both `CONFIRMED` via runtime artifacts. |
| 3 | Kestrel Health | **Aspirational posting.** Job posting asks for a warehouse they never deployed — `LIKELY`, reach `engineering_intent`, labelled as intent. |
| 4 | Bellwether Labs | **Marketing-only reach.** Marketing automation `CONFIRMED` on `page_markup`; an ICP reading it as engineering adoption is wrong. |
| 5 | Ardent Freight | **Implied but dark.** CDP `CONFIRMED` ⇒ a warehouse exists; every warehouse is `UNKNOWABLE`. |
| 6 | Vermilion | **One surface only.** Only `page_markup` was ever observed; the honest answer to most queries is `INCONCLUSIVE`. |
| 7 | Solstice Financial | **Uncomputable negation.** The natural query `not(warehouse X)` is structurally unanswerable. |
| 8 | Harborview | **Clean displacement target.** Competitor `CONFIRMED` via runtime artifact. |
| 9 | Quillon | **Stale.** Everything `CONFIRMED` — three years ago. Same query at two as-of dates gives two answers. |
| 10 | Meridian Grid | **DNS-only.** Detected solely via MX/SPF; invisible in page markup. |
| 11 | Palisade | **Answerable gap.** No chat widget on a fully-inspected page ⇒ genuine `ABSENT`. |
| 12 | Cinder & Co | **Contradiction.** Markup shows the old vendor; blog states the replacement; both `CONFIRMED`. |
| 13 | Oakline | **Excluded.** Runs the competitor the query rules out. |
| 14 | Thornbury | **Supersession chain.** Legacy analytics and its successor both present. |

**Categories (8):** `analytics`, `cdp`, `warehouse`, `reverse_etl`,
`support_chat`, `crm`, `marketing_automation`, `infra_edge`.
Warehouses and reverse-ETL tools have empty `absenceEstablishableOn` — the dark
half of the stack, by construction.

**Presets (4):**

1. *Competitive displacement* — `has(<competitor chat tool>) @ CONFIRMED`.
2. *Modern data stack with a gap* — `has_any_in(cdp) @ CONFIRMED` +
   `gap(reverse_etl)` → **demonstrates the refusal**.
3. *Answerable gap* — `has_any_in(analytics) @ CONFIRMED` + `gap(support_chat)`
   → the same query shape, computable, so the refusal reads as principled rather
   than broken.
4. *Mid-migration* — `count_in(cdp) >= 2 @ CONFIRMED`.

Presets 2 and 3 are a matched pair and neither ships without the other.

---

## Main states and workflows

- **Default load** — corpus resolved against preset 1, fleet grouped into tiers,
  nothing empty.
- **Dark predicate** — struck through in the builder pre-run; post-run produces
  the `UNANSWERABLE` tier with a one-sentence reason and what would be needed.
- **As-of change** — grades demote, `PRESENT` claims fall to `UNKNOWN`/`ABSENT`
  as observations expire, tiers re-group. Never the reverse.
- **Account panel** — claims by category, evidence receipts, coverage strip,
  implied-but-dark, migration/vestigial flags.
- **Translate (no key)** — panel collapses to a pointer at the builder.
- **Translate (key)** — prose → Zod-validated query, editable, unrun.
- **Inspect (success)** — two surfaces populate; four stay `UNKNOWN` with a
  banner naming them.
- **Inspect (blocked / timeout / rate-limited / robots-disallowed)** — stated in
  plain language; the corpus view is untouched.

---

## Implementation task order

One commit each, pushed to `main` immediately after.

1. `docs: the plan — the four failures, the four states, and fourteen traps`
2. `docs: CLAUDE.md — the thesis, the engine boundary, and the rules easy to break`
3. `chore: scaffold Next 16, the type contract, and the dependency-free engine boundary`
4. `feat: six surfaces — reach, half-life, and what absence is allowed to mean`
5. `feat: the technology graph — 32 technologies, 8 categories, four relations, and the dark set`
6. `feat: the corpus — fourteen companies and the trap each one carries`
7. `feat: claim resolution — four states, three grades, decay, and contradiction`
8. `feat: the query engine — predicates, confidence thresholds, and five tiers`
9. `test: the invariant sweep — every account × every technology × five as-of dates`
10. `feat: the console — the fleet, the tiers, and the refusal banner`
11. `feat: the account panel — evidence receipts, the coverage strip, and implied-but-dark`
12. `feat: the two routes — key-optional translation and rate-limited inspection`
13. `feat: permalinks and a CSV that keeps UNKNOWN`
14. `docs: README, the plain-English guide, and screenshots from the live deployment`

---

## Validation / test plan

Unit tests per module under `lib/**/*.test.ts`, plus:

**`npm run sweep`** — 14 companies × 32 technologies × 5 as-of dates (~2,240
resolutions), asserting:

1. Every `(company, technology)` resolves to **exactly one** of the four states.
2. `PRESENT` ⇒ at least one non-expired supporting evidence item.
3. `ABSENT` ⇒ the technology's `absenceEstablishableOn` intersects the surfaces
   actually inspected for that company.
4. `UNKNOWABLE` ⇒ `visibleOn` is empty **or** no modelled surface reaches it.
5. Two `CONFIRMED` technologies in a `competes_with` pair ⇒ `MIGRATING` flag.
6. Grade never improves as `asOf` advances — monotone decay across the five dates.
7. `impliedBy` never changes a state.
8. Every predicate against every account returns exactly one tier.
9. A query containing a predicate over a technology with empty
   `absenceEstablishableOn` never returns `MATCH` for anybody.

**Trap tests** — one named test per corpus trap, asserted by trap name, so
`vitest -t "vestigial"` runs the trap it describes.

**Manual checks before claiming done** — the four presets; the refusal banner;
the as-of slider moving an account out of `MATCH`; a permalink pasted into a
fresh tab reproducing the fleet exactly; the CSV opened in a spreadsheet showing
`UNKNOWN` as a value.

---

## Deployment plan

Vercel, project `techstack-icp`, `main` auto-deploys. `GEMINI_API_KEY` is the
only environment variable and is optional — a deployment without it is fully
functional minus one collapsed panel. `.env.example` documents it. Screenshots
in the README come from the deployed URL, not localhost.

---

## README plan

Master structure from the backlog: one-sentence description; live demo link and
demo GIF; *Why I Built This* (the four failures); *What It Does*; *Demo*;
*How It Works* (observation → evidence → claim → predicate → tier);
*Architecture*; *Key Decisions & Tradeoffs* (no score; four states not three;
`implies` never promotes; live fetch populates two surfaces); *Getting Started*;
*Corpus is authored* disclaimer; link to `docs/plain-english-guide.md`.

---

## Definition of done

- Corpus loads pre-resolved; no empty state anywhere.
- All four claim states reachable from the UI in ≤3 clicks.
- A query with a dark predicate produces the refusal banner and the paired
  answerable-gap preset produces a real answer.
- `npm run build`, `npm test`, `npm run sweep`, `npm run typecheck`, `npm run lint`
  all green.
- Engine boundary rule passes — `lib/technographics/` imports only `zod`.
- Deployed to Vercel; README screenshots taken from that deployment.
- Every one of the fourteen traps asserted by a test named after it.

---

## Post-MVP (not in this build)

- More surfaces: certificate issuers, WHOIS, npm/`package.json` on public repos.
- Detection-rule authoring UI.
- Confidence calibration against a labelled sample.
- Multi-page crawl and a real detection-rule corpus.
- Fleet-level coverage report ("this segment is 71% dark in `warehouse`").

---

## Settled decisions

1. Thesis: a technographic claim is an inference from observations on specific
   surfaces; the product renders confidence, staleness, and blindness, and
   refuses negative queries it cannot answer.
2. Shape: fleet console primary, account drill-down secondary; neither alone.
3. Data: authored synthetic corpus primary, optional live single-URL fetch.
4. Stack: unchanged from Days 001–007 — Next 16, Tailwind v4, Zod, Vitest, npm, Vercel.
5. LLM: one job — prose → query. Never detection, never grading.
6. Time: one day, feature-frozen at sign-off, commit-per-task pushed to `main`.
7. Confidence: ordinal grades derived by declared rules; no arithmetic.
8. Six surfaces, each declaring reach and observability.
9. Four states — `PRESENT` / `ABSENT` / `UNKNOWN` / `UNKNOWABLE`.
10. Four relations — category, `competes_with`, `implies`, `superseded_by`.
11. Predicates carry a minimum confidence; `has` / `has_any_in` / `count_in` /
    `not` / `gap`; four presets.
12. No score, no weights, no number. Five tiers.
    *(Refined: `MATCH_WITH_GAPS` → `INCONCLUSIVE`; see Tiers.)*
13. Observations dated; per-surface half-lives; no event derivation.
14. ~14 companies, ~32 technologies, 8 categories, ~120 observations, named traps.
15. `lib/technographics/` is dependency-free and framework-free, enforced by lint.
16. Evidence rendered as a detection receipt — surface, rule, date, grade. No spans.
17. Blindness surfaced in three places: predicate, query, account.
18. Live fetch: one URL, 6s, robots-honoring, rate-limited, two surfaces only,
    unfetched surfaces stay `UNKNOWN`.
19. `gemini-2.5-flash`, structured output, Zod-validated, lands unrun.
20. Exports: query permalink and fleet CSV preserving four-state values.
21. Test plan: unit tests, invariant sweep, one named test per trap.
22. Docs: README, plain-English guide, demo GIF, deployment screenshots.
23. Repo `akshatiwarix/techstack-icp`, public, MIT, push to `main` per task.
24. Done means all five commands green, all four states reachable, deployed,
    every trap tested.
