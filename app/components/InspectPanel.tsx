"use client";

/**
 * The live path, and the clearest demonstration of the whole thesis: one fetch
 * populates two surfaces out of six, so four categories of question stay
 * unanswered — not answered "no".
 */

import { useState } from "react";
import { DEFAULT_AS_OF } from "@/data/presets";
import { Marking } from "./ui";

type Claim = {
  technology: string;
  grade: string | null;
  rule: string | null;
  raw: string | null;
  surface: string | null;
};

type Result = {
  url: string;
  uninspectedSurfaces: string[];
  claims: Claim[];
};

export function InspectPanel() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, asOf: DEFAULT_AS_OF }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The fetch failed.",
        );
        return;
      }
      setResult(payload as Result);
    } catch {
      setError("The request did not complete.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="border border-rule bg-card">
      <summary className="marking cursor-pointer px-3 py-2 select-none">
        Inspect a live URL
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <p className="text-xs leading-snug text-slate">
          Fetches one page, honours robots.txt, stores nothing. It populates two
          surfaces of six — page markup and response headers — so everything else
          stays unchecked rather than absent.
        </p>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="example.com"
          className="border border-rule bg-paper px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || url.trim().length < 3}
          className="border border-ink bg-ink px-3 py-1.5 text-sm text-[color:var(--paper)] disabled:opacity-40"
        >
          {pending ? "Fetching…" : "Fetch and detect"}
        </button>

        {error !== null ? (
          <p className="border-l-2 border-[color:var(--unknown)] pl-2 text-xs leading-snug">
            {error}
          </p>
        ) : null}

        {result !== null ? (
          <div className="flex flex-col gap-2">
            <Marking>{result.claims.length} detected</Marking>
            {result.claims.length === 0 ? (
              <p className="text-xs leading-snug text-slate">
                Nothing matched on either surface. That is not the same as
                nothing being installed.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {result.claims.map((claim) => (
                  <li key={claim.technology} className="border border-rule p-2">
                    <p className="receipt">
                      {claim.technology} · {claim.grade?.toLowerCase()}
                    </p>
                    <p className="receipt mt-0.5 break-all text-slate">
                      {claim.raw}
                    </p>
                    <p className="receipt text-slate">
                      {claim.surface?.toLowerCase()} · rule {claim.rule}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="hatch border border-[color:var(--unknowable)] p-2">
              <p className="text-xs leading-snug">
                Not inspected: {result.uninspectedSurfaces.join(", ")}. Anything
                only visible there is unchecked, and a negative query over it
                would be a guess.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
