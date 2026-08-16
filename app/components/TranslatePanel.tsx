"use client";

/**
 * Prose in, predicates out — landing in the builder unrun. Collapsed by
 * default, because it is not on the main path: the builder does everything
 * this does, and without a key this panel says so and gets out of the way.
 */

import { useState } from "react";
import { predicateSchema, type Predicate } from "@/lib/technographics";

export function TranslatePanel({
  onQuery,
}: {
  onQuery: (predicates: Predicate[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    setNote(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Translation failed.";
        setError(message);
        return;
      }
      const raw =
        typeof payload === "object" && payload !== null && "predicates" in payload
          ? (payload as { predicates: unknown[] }).predicates
          : [];
      const predicates = raw
        .map((entry) => predicateSchema.safeParse(entry))
        .flatMap((result) => (result.success ? [result.data] : []));
      if (predicates.length === 0) {
        setError("Nothing in that mapped onto a predicate the engine can run.");
        return;
      }
      onQuery(predicates);
      if (
        typeof payload === "object" &&
        payload !== null &&
        "note" in payload &&
        typeof (payload as { note: unknown }).note === "string"
      ) {
        setNote((payload as { note: string }).note);
      }
    } catch {
      setError("The request did not complete.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="border border-rule bg-card"
    >
      <summary className="marking cursor-pointer px-3 py-2 select-none">
        Describe the segment in words
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <p className="text-xs leading-snug text-slate">
          The model maps your sentence onto predicates and stops there. It never
          detects a technology and never assigns confidence — the result lands in
          the builder for you to check before it runs.
        </p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="companies running a CDP but no chat tool"
          className="border border-rule bg-paper px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || description.trim().length < 3}
          className="border border-ink bg-ink px-3 py-1.5 text-sm text-[color:var(--paper)] disabled:opacity-40"
        >
          {pending ? "Translating…" : "Translate to a query"}
        </button>
        {error !== null ? (
          <p className="border-l-2 border-[color:var(--unknown)] pl-2 text-xs leading-snug">
            {error}
          </p>
        ) : null}
        {note !== null ? (
          <p className="text-xs leading-snug text-slate">Note from the model: {note}</p>
        ) : null}
      </div>
    </details>
  );
}
