# `lib/technographics`

The engine. Dependency-free, framework-free: it imports `zod` and its own
relative modules, nothing else. No React, no Next, no model client, no DOM
globals, no `@/data`. `purity.test.ts` enforces that by scanning the source with
no allowlist beyond `zod`; the eslint boundary rule says the same thing in a way
that can be disabled, which is why the test exists.

The consequence is the point: a module that cannot import a model client cannot
invent a detection. Every claim this package emits was derived from an
observation that was passed in as an argument.

## The distinction the whole package protects

A technographic claim is an inference from an observation on a named surface.
Four states, always distinct:

| state | meaning | fixable with more data? |
|---|---|---|
| `PRESENT` | we saw it | — |
| `ABSENT` | we inspected a surface that would have shown it, and it was not there | — |
| `UNKNOWN` | nobody inspected a surface that would show it | yes |
| `UNKNOWABLE` | no surface in this model can ever show it | **no** |

Collapsing `UNKNOWN` into `UNKNOWABLE` — or either into `ABSENT` — is the
failure this package exists to prevent. `not(Intercom)` is computable because a
chat widget would necessarily appear in fetched page markup. `not(Snowflake)` is
not computable at any price, and the engine refuses it rather than returning
every account in the corpus.

## Modules

| module | responsibility |
|---|---|
| `types.ts` | the type contract; the load-bearing distinctions are marked |
| `schema.ts` | Zod schemas for corpus and query; parsed at import, throws on bad data |
| `surfaces.ts` | six surfaces: reach, half-life, exhaustiveness |
| `graph.ts` | categories, technologies, four relations, the dark set |
| `detect.ts` | observation → evidence (which rule fired, on which surface) |
| `grade.ts` | `(kind, surface, age)` → grade; decay; expiry |
| `resolve.ts` | claims: four states, contradiction, migration, vestigial, implied |
| `query.ts` | predicate evaluation, minimum-confidence thresholds, computability |
| `tier.ts` | account × query → exactly one of five tiers |
| `export.ts` | CSV serialisation and permalink encode/decode |

## Rules

- Grades are ordinal and come from a lookup table. No arithmetic, ever.
- Decay is monotone: confidence never improves as the as-of date advances.
- An `implies` edge annotates a claim; it never promotes a state.
- Reach is not confidence. A `CONFIRMED` marketing-surface detection is
  confidently a fact about the marketing team and nobody else.
- Surfaces, technologies and relations are data. An `if (technologyId === ...)`
  inside this package means a field is missing from the record.
