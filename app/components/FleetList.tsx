"use client";

/**
 * The fleet, grouped by tier. No score, no ranking number — the group an
 * account is in is the whole answer, and within a group they sit in order of
 * their weakest satisfied claim.
 */

import { getCompany } from "@/data/corpus";
import { GRAPH } from "@/data/graph";
import {
  describePredicate,
  TIERS,
  type AccountResult,
  type QueryResult,
  type Tier,
} from "@/lib/technographics";
import { Marking, TierBar, TIER_BLURB } from "./ui";

export function FleetList({
  result,
  selectedId,
  onSelect,
}: {
  result: QueryResult;
  selectedId: string | null;
  onSelect: (companyId: string) => void;
}) {
  const refused = result.computability.filter(
    (entry) => !entry.computability.computable,
  );

  const grouped = TIERS.map((tier) => ({
    tier,
    accounts: result.accounts.filter((account) => account.tier === tier),
  })).filter((group) => group.accounts.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {refused.length > 0 ? (
        <div className="hatch-strong border-2 border-[color:var(--unknowable)] p-4">
          <Marking className="text-[color:var(--unknowable)]">
            Query not computable
          </Marking>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed">
            {refused.length === 1
              ? "One predicate cannot be answered by this data, so no account can match."
              : `${refused.length} predicates cannot be answered by this data, so no account can match.`}{" "}
            This is a property of the question, not of the accounts.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {refused.map((entry, index) => (
              <li key={index} className="border-l-2 border-[color:var(--unknowable)] pl-3">
                <span className="receipt block line-through">
                  {describePredicate(entry.predicate, GRAPH)}
                </span>
                <span className="mt-1 block max-w-2xl text-sm leading-snug">
                  {entry.computability.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {grouped.map((group) => (
        <section key={group.tier}>
          <header className="mb-2 flex items-baseline gap-3">
            <TierHeading tier={group.tier} count={group.accounts.length} />
          </header>
          <ul className="flex flex-col gap-px bg-rule">
            {group.accounts.map((account) => (
              <li key={account.companyId}>
                <AccountRow
                  account={account}
                  selected={account.companyId === selectedId}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TierHeading({ tier, count }: { tier: Tier; count: number }) {
  return (
    <>
      <span className="marking text-ink">
        {tier} · {count}
      </span>
      <span className="text-xs text-slate">{TIER_BLURB[tier]}</span>
    </>
  );
}

function AccountRow({
  account,
  selected,
  onSelect,
}: {
  account: AccountResult;
  selected: boolean;
  onSelect: (companyId: string) => void;
}) {
  const company = getCompany(account.companyId);

  return (
    <button
      type="button"
      onClick={() => onSelect(account.companyId)}
      aria-pressed={selected}
      className={`flex w-full items-stretch gap-3 text-left transition-colors ${
        selected ? "bg-[color:var(--accent-soft)]" : "bg-card hover:bg-paper"
      }`}
    >
      <TierBar tier={account.tier} />
      <span className="flex-1 py-2.5 pr-3">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{company.name}</span>
          <span className="receipt text-slate">{company.domain}</span>
          <span className="marking ml-auto">
            {company.employees.toLocaleString()} staff · {company.industry}
          </span>
        </span>
        <span className="mt-1 block max-w-3xl text-sm leading-snug text-slate">
          {account.reason}
        </span>
      </span>
    </button>
  );
}
