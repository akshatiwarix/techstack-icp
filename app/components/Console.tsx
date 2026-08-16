"use client";

/**
 * The console. The engine is pure and cheap, so everything here recomputes in
 * the browser — moving the as-of date re-resolves 14 companies × 32
 * technologies without a round trip.
 */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CORPUS_COMPANIES, getCompany } from "@/data/corpus";
import { GRAPH } from "@/data/graph";
import { DEFAULT_AS_OF, DEFAULT_PRESET_ID, PRESETS } from "@/data/presets";
import { resolveCorpus } from "@/data/resolve";
import { runQuery, tierCounts, type Predicate, type Query } from "@/lib/technographics";
import { decodeQuery, encodeQuery, toCsv } from "@/lib/technographics/export";
import { FleetList } from "./FleetList";
import { AccountPanel } from "./AccountPanel";
import { QueryBuilder } from "./QueryBuilder";
import { TranslatePanel } from "./TranslatePanel";
import { InspectPanel } from "./InspectPanel";
import { Marking } from "./ui";

const DEFAULT_PREDICATES =
  PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID)?.predicates ?? [];

export function Console() {
  // A permalink in the address bar reproduces the fleet exactly. Read once, as
  // the seed for state — a malformed one falls back to the default preset
  // rather than erroring.
  const restored = decodeQuery(useSearchParams().get("q") ?? "");

  const [predicates, setPredicates] = useState<Predicate[]>(
    restored?.predicates ?? DEFAULT_PREDICATES,
  );
  const [asOf, setAsOf] = useState(restored?.asOf ?? DEFAULT_AS_OF);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const query: Query = useMemo(() => ({ predicates, asOf }), [predicates, asOf]);

  const resolutions = useMemo(() => resolveCorpus(asOf), [asOf]);

  const result = useMemo(
    () => runQuery({ resolutions, query, graph: GRAPH }),
    [resolutions, query],
  );

  const counts = useMemo(() => tierCounts(result), [result]);

  const activePresetId = useMemo(() => {
    const match = PRESETS.find(
      (preset) =>
        JSON.stringify(preset.predicates) === JSON.stringify(predicates),
    );
    return match?.id ?? null;
  }, [predicates]);

  const applyPreset = useCallback((id: string) => {
    const preset = PRESETS.find((candidate) => candidate.id === id);
    if (preset === undefined) return;
    setPredicates(preset.predicates);
  }, []);

  const selected = selectedId === null ? null : resolutions.find((resolution) => resolution.companyId === selectedId) ?? null;

  function copyPermalink() {
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeQuery(query)}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    });
  }

  function downloadCsv() {
    const csv = toCsv({
      result,
      graph: GRAPH,
      companyName: (id) => getCompany(id).name,
      companyDomain: (id) => getCompany(id).domain,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `techstack-icp-${asOf}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col">
      <header className="border-b border-rule bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-xl font-medium tracking-tight">TechStack ICP</h1>
          <p className="max-w-2xl text-sm leading-snug text-slate">
            Technographic prospecting that tells you when it cannot answer your
            question — and why more data would not help.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={copyPermalink}
              className="marking border border-rule px-2 py-1.5 hover:border-rule-strong hover:text-ink"
            >
              {copied ? "copied" : "copy permalink"}
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="marking border border-rule px-2 py-1.5 hover:border-rule-strong hover:text-ink"
            >
              export csv
            </button>
          </div>
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {(
            [
              ["match", counts.MATCH],
              ["migrating", counts.MIGRATING],
              ["inconclusive", counts.INCONCLUSIVE],
              ["unanswerable", counts.UNANSWERABLE],
              ["excluded", counts.EXCLUDED],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="marking">{label}</dt>
              <dd className="receipt">{value}</dd>
            </div>
          ))}
          <div className="flex items-baseline gap-1.5">
            <dt className="marking">corpus</dt>
            <dd className="receipt">
              {CORPUS_COMPANIES.length} companies · {GRAPH.technologies.length}{" "}
              technologies · 6 surfaces
            </dd>
          </div>
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-px bg-rule lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_440px]">
        <aside className="bg-paper p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <QueryBuilder
            predicates={predicates}
            asOf={asOf}
            activePresetId={activePresetId}
            onChange={setPredicates}
            onAsOfChange={setAsOf}
            onPreset={applyPreset}
          />
          <div className="mt-6 flex flex-col gap-3">
            <TranslatePanel onQuery={setPredicates} />
            <InspectPanel />
          </div>
        </aside>

        <main className="bg-paper p-4 lg:p-6">
          <FleetList
            result={result}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          />
        </main>

        <aside className="bg-card xl:sticky xl:top-0 xl:h-screen">
          {selected === null ? (
            <div className="p-4">
              <Marking className="mb-2">Account detail</Marking>
              <p className="text-sm leading-snug text-slate">
                Pick an account to see every claim with the rule that fired, the
                surface it fired on, how old the evidence is, and what part of
                that account&apos;s stack is structurally invisible.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                <li>
                  <span className="receipt">present</span> — we saw it.
                </li>
                <li>
                  <span className="receipt">absent</span> — we inspected a surface
                  that would have shown it, and it was not there.
                </li>
                <li>
                  <span className="receipt">not checked</span> — nobody inspected a
                  surface that would show it. More data fixes this.
                </li>
                <li>
                  <span className="receipt">unknowable</span> — no surface in this
                  model can ever show it. More data does not.
                </li>
              </ul>
            </div>
          ) : (
            <AccountPanel
              key={selected.companyId}
              resolution={selected}
              account={result.accounts.find(
                (account) => account.companyId === selected.companyId,
              )}
              onClose={() => setSelectedId(null)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
