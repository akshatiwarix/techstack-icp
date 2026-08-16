/**
 * The shared vocabulary. The state chip is the one component the whole
 * interface is built around: a claim's texture tells you what kind of knowledge
 * it is before you have read a word of it.
 */

import type { ClaimState, Grade, Tier } from "@/lib/technographics";

const STATE_STYLE: Record<ClaimState, string> = {
  PRESENT:
    "border-[color:var(--present)] bg-[color:var(--present-soft)] text-[color:var(--present)]",
  ABSENT:
    "border-[color:var(--absent)] bg-transparent text-[color:var(--absent)]",
  UNKNOWN:
    "border-dashed border-[color:var(--unknown)] bg-[color:var(--unknown-soft)] text-[color:var(--unknown)]",
  UNKNOWABLE:
    "hatch border-[color:var(--unknowable)] text-[color:var(--unknowable)]",
};

const STATE_WORD: Record<ClaimState, string> = {
  PRESENT: "present",
  ABSENT: "absent",
  UNKNOWN: "not checked",
  UNKNOWABLE: "unknowable",
};

export function StateChip({
  state,
  grade,
  className = "",
}: {
  state: ClaimState;
  grade?: Grade | null;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-wide uppercase ${STATE_STYLE[state]} ${className}`}
      style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
    >
      {STATE_WORD[state]}
      {state === "PRESENT" && grade != null ? (
        <span className="opacity-70">· {grade.toLowerCase()}</span>
      ) : null}
    </span>
  );
}

const TIER_STYLE: Record<Tier, { bar: string; label: string }> = {
  MATCH: { bar: "bg-[color:var(--present)]", label: "text-[color:var(--present)]" },
  MIGRATING: { bar: "bg-[color:var(--accent)]", label: "text-[color:var(--accent)]" },
  INCONCLUSIVE: { bar: "bg-[color:var(--unknown)]", label: "text-[color:var(--unknown)]" },
  UNANSWERABLE: {
    bar: "bg-[color:var(--unknowable)]",
    label: "text-[color:var(--unknowable)]",
  },
  EXCLUDED: { bar: "bg-[color:var(--rule-strong)]", label: "text-[color:var(--slate)]" },
};

export const TIER_BLURB: Record<Tier, string> = {
  MATCH: "Every predicate holds.",
  MIGRATING: "Holds, and two competing tools are live at once.",
  INCONCLUSIVE: "Nobody inspected a surface that could decide it. More data would fix this.",
  UNANSWERABLE: "No surface in this model can decide it. More data would not.",
  EXCLUDED: "A predicate definitively fails.",
};

export function TierBar({ tier }: { tier: Tier }) {
  return <span className={`block h-full w-[3px] ${TIER_STYLE[tier].bar}`} />;
}

export function TierLabel({ tier }: { tier: Tier }) {
  return (
    <span className={`marking ${TIER_STYLE[tier].label}`}>{tier}</span>
  );
}

export function Marking({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`marking ${className}`}>{children}</div>;
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-rule bg-card ${className}`}>{children}</div>
  );
}
