"use client";

/**
 * The drill-down, where the thesis is actually visible.
 *
 * Three things live here that no technographic tool ships: the receipt for
 * every claim (which rule fired, on which surface, how old, and what that
 * grades to), the coverage strip (which parts of this account's stack are
 * structurally invisible), and the implied-but-dark list (what a confirmed
 * claim tells you must exist even though nothing can see it).
 */

import { getCompany } from "@/data/corpus";
import { GRAPH } from "@/data/graph";
import {
  getSurface,
  describeAge,
  type Claim,
  type CompanyResolution,
  type AccountResult,
} from "@/lib/technographics";
import { Marking, StateChip } from "./ui";

const REACH_WORD: Record<string, string> = {
  marketing: "marketing",
  edge_infra: "edge infrastructure",
  email_infra: "email infrastructure",
  engineering_intent: "engineering intent",
  engineering: "engineering",
  commercial: "a commercial relationship",
};

export function AccountPanel({
  resolution,
  account,
  onClose,
}: {
  resolution: CompanyResolution;
  account: AccountResult | undefined;
  onClose: () => void;
}) {
  const company = getCompany(resolution.companyId);
  const claims = GRAPH.technologies
    .map((technology) => resolution.claims[technology.id])
    .filter((claim): claim is Claim => claim !== undefined);

  const present = claims.filter((claim) => claim.state === "PRESENT");
  const impliedDark = claims.filter((claim) => claim.impliedBy.length > 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-rule bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg leading-tight font-medium">{company.name}</h2>
            <p className="receipt text-slate">{company.domain}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="marking hover:text-ink"
            aria-label="Close account panel"
          >
            close
          </button>
        </div>
        {account !== undefined ? (
          <p className="mt-2 text-sm leading-snug text-slate">{account.reason}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6 px-4 py-4">
        <CoverageStrip resolution={resolution} />

        <section>
          <Marking className="mb-2">Detected · {present.length}</Marking>
          {present.length === 0 ? (
            <p className="text-sm text-slate">
              Nothing detected on any inspected surface.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {present.map((claim) => (
                <ClaimRow key={claim.technologyId} claim={claim} />
              ))}
            </ul>
          )}
        </section>

        {impliedDark.length > 0 ? (
          <section>
            <Marking className="mb-2">Implied, and invisible</Marking>
            <div className="hatch border border-[color:var(--unknowable)] p-3">
              <p className="text-sm leading-snug">
                These follow from something confirmed above. Nothing in this
                model can see them, and no amount of inspection will change
                that — so they stay unknowable rather than being promoted.
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {impliedDark.slice(0, 6).map((claim) => (
                  <li key={claim.technologyId} className="text-sm">
                    <span className="receipt">
                      {GRAPH.technology(claim.technologyId).name}
                    </span>
                    <span className="text-slate">
                      {" "}
                      — {claim.impliedBy[0]?.because}, via{" "}
                      {GRAPH.technology(
                        claim.impliedBy[0]?.technologyId ?? "",
                      ).name}
                      .
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section>
          <Marking className="mb-2">The trap this account carries</Marking>
          <div className="border-l-2 border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-2">
            <p className="receipt">{company.trap}</p>
            <p className="mt-1 text-sm leading-snug">{company.trapNote}</p>
          </div>
        </section>

        <section>
          <Marking className="mb-2">Inspection log</Marking>
          <ul className="flex flex-col gap-1">
            {company.inspections.map((inspection) => {
              const surface = getSurface(inspection.surface);
              const current = resolution.inspectedSurfaces.includes(
                inspection.surface,
              );
              return (
                <li
                  key={inspection.surface}
                  className="receipt flex flex-wrap items-baseline gap-x-2 border-b border-rule py-1.5 last:border-0"
                >
                  <span>{surface.label}</span>
                  <span className="text-slate">{inspection.on}</span>
                  {current ? null : (
                    <span className="text-[color:var(--unknown)]">
                      too old to establish absence
                    </span>
                  )}
                  <span className="ml-auto text-slate">{surface.proves}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  const technology = GRAPH.technology(claim.technologyId);

  return (
    <li className="border border-rule">
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-3 py-2">
        <span className="font-medium">{technology.name}</span>
        <StateChip state={claim.state} grade={claim.grade} />
        {claim.flags.map((flag) => (
          <span
            key={flag}
            className="marking border border-[color:var(--accent)] px-1.5 py-0.5 text-[color:var(--accent)]"
          >
            {flag}
          </span>
        ))}
        {claim.reach.length > 0 ? (
          <span className="marking ml-auto">
            proves {claim.reach.map((reach) => REACH_WORD[reach] ?? reach).join(", ")}
          </span>
        ) : null}
      </div>

      <ul className="flex flex-col">
        {claim.evidence.map((evidence) => (
          <li
            key={evidence.observation.id}
            className={`px-3 py-2 ${
              evidence.observation.kind === "negative_statement"
                ? "bg-[color:var(--unknowable-soft)]"
                : evidence.expired
                  ? "bg-[color:var(--unknown-soft)]"
                  : ""
            }`}
          >
            <p className="receipt break-all">{evidence.observation.raw}</p>
            <p className="receipt mt-1 text-slate">
              {evidence.surface.label.toLowerCase()} · rule{" "}
              {evidence.observation.ruleId} · {evidence.observation.observedOn} ·{" "}
              {describeAge(evidence.ageDays)} ·{" "}
              {evidence.grade ?? (evidence.observation.kind === "negative_statement" ? "against" : "expired")}
            </p>
            <p className="mt-1 text-xs leading-snug text-slate">{evidence.why}</p>
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * The signature element. Eight categories, each rendered by how visible it is
 * for this account: solid where something was found, an outline where absence
 * was established, dashed where nobody looked, hatched where nothing can ever
 * look. An account whose frontend is solid and whose data layer is hatched
 * looks lopsided at a glance, which is the honest picture.
 */
function CoverageStrip({ resolution }: { resolution: CompanyResolution }) {
  return (
    <section>
      <Marking className="mb-2">Coverage — what can be seen here at all</Marking>
      <ul className="flex flex-col gap-1">
        {GRAPH.categories.map((category) => {
          const claims = GRAPH.inCategory(category.id)
            .map((technology) => resolution.claims[technology.id])
            .filter((claim): claim is Claim => claim !== undefined);

          const counts = {
            PRESENT: claims.filter((c) => c.state === "PRESENT").length,
            ABSENT: claims.filter((c) => c.state === "ABSENT").length,
            UNKNOWN: claims.filter((c) => c.state === "UNKNOWN").length,
            UNKNOWABLE: claims.filter((c) => c.state === "UNKNOWABLE").length,
          };
          const total = claims.length || 1;
          const dark = counts.UNKNOWABLE === claims.length;

          return (
            <li key={category.id} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs">{category.label}</span>
              <span
                className="flex h-4 flex-1 overflow-hidden border border-rule"
                title={dark ? category.note : undefined}
              >
                <Segment
                  width={(counts.PRESENT / total) * 100}
                  className="bg-[color:var(--present)]"
                />
                <Segment
                  width={(counts.ABSENT / total) * 100}
                  className="bg-[color:var(--absent-soft)]"
                />
                <Segment
                  width={(counts.UNKNOWN / total) * 100}
                  className="bg-[color:var(--unknown-soft)]"
                />
                <Segment
                  width={(counts.UNKNOWABLE / total) * 100}
                  className="hatch-strong"
                />
              </span>
              {dark ? (
                <span className="marking w-24 shrink-0 text-[color:var(--unknowable)]">
                  never visible
                </span>
              ) : (
                <span className="marking w-24 shrink-0">
                  {counts.PRESENT} found
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs leading-snug text-slate">
        Hatching is the part of the stack no surface in this model reaches. It is
        not missing data — it is data that cannot be collected this way.
      </p>
    </section>
  );
}

function Segment({ width, className }: { width: number; className: string }) {
  if (width <= 0) return null;
  return <span className={className} style={{ width: `${width}%` }} />;
}
