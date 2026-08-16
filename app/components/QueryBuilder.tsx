"use client";

/**
 * The builder. A predicate that cannot be computed is struck through here,
 * before it is ever run — the refusal is a property of the question, not of the
 * accounts, so it belongs next to the question.
 */

import { useState } from "react";
import { GRAPH } from "@/data/graph";
import { PRESETS } from "@/data/presets";
import {
  computabilityOf,
  describePredicate,
  type CategoryId,
  type Grade,
  type Predicate,
} from "@/lib/technographics";
import { Marking } from "./ui";

const GRADES: Grade[] = ["CONFIRMED", "LIKELY", "HINTED"];

export function QueryBuilder({
  predicates,
  asOf,
  activePresetId,
  onChange,
  onAsOfChange,
  onPreset,
}: {
  predicates: Predicate[];
  asOf: string;
  activePresetId: string | null;
  onChange: (predicates: Predicate[]) => void;
  onAsOfChange: (asOf: string) => void;
  onPreset: (id: string) => void;
}) {
  const [op, setOp] = useState<Predicate["op"]>("has");
  const [technologyId, setTechnologyId] = useState("segment");
  const [categoryId, setCategoryId] = useState<CategoryId>("cdp");
  const [minGrade, setMinGrade] = useState<Grade>("CONFIRMED");

  function add() {
    const next: Predicate =
      op === "has"
        ? { op, technologyId, minGrade }
        : op === "not"
          ? { op, technologyId }
          : op === "gap"
            ? { op, categoryId }
            : op === "has_any_in"
              ? { op, categoryId, minGrade }
              : { op: "count_in", categoryId, atLeast: 2, minGrade };
    onChange([...predicates, next]);
  }

  const needsTechnology = op === "has" || op === "not";
  const needsGrade = op === "has" || op === "has_any_in" || op === "count_in";

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Marking className="mb-2">Start from</Marking>
        <div className="flex flex-col gap-1">
          {PRESETS.map((preset) => {
            const active = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPreset(preset.id)}
                className={`border px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                    : "border-rule bg-card hover:border-rule-strong"
                }`}
              >
                <span className="block font-medium">{preset.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate">
                  {preset.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <Marking className="mb-2">Query</Marking>
        {predicates.length === 0 ? (
          <p className="border border-dashed border-rule-strong px-3 py-4 text-sm text-slate">
            No predicates. Every account is in the fleet. Add one below.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {predicates.map((predicate, index) => {
              const computability = computabilityOf(predicate, GRAPH);
              return (
                <li
                  key={`${predicate.op}-${index}`}
                  className={`flex items-start gap-2 border px-3 py-2 ${
                    computability.computable
                      ? "border-rule bg-card"
                      : "hatch border-[color:var(--unknowable)]"
                  }`}
                >
                  <span className="flex-1">
                    <span
                      className={`receipt block ${
                        computability.computable
                          ? ""
                          : "text-[color:var(--unknowable)] line-through decoration-2"
                      }`}
                    >
                      {describePredicate(predicate, GRAPH)}
                    </span>
                    {computability.computable ? null : (
                      <span className="mt-1 block text-xs leading-snug text-[color:var(--unknowable)]">
                        Not computable. {computability.reason}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${describePredicate(predicate, GRAPH)}`}
                    onClick={() =>
                      onChange(predicates.filter((_, i) => i !== index))
                    }
                    className="marking hover:text-ink"
                  >
                    remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <Marking className="mb-2">Add a predicate</Marking>
        <div className="flex flex-col gap-2 border border-rule bg-card p-3">
          <label className="flex flex-col gap-1">
            <span className="marking">Operator</span>
            <select
              value={op}
              onChange={(event) =>
                setOp(event.target.value as Predicate["op"])
              }
              className="border border-rule bg-paper px-2 py-1.5 text-sm"
            >
              <option value="has">has technology</option>
              <option value="has_any_in">has any in category</option>
              <option value="count_in">has 2+ in category</option>
              <option value="not">does not use</option>
              <option value="gap">no tool in category</option>
            </select>
          </label>

          {needsTechnology ? (
            <label className="flex flex-col gap-1">
              <span className="marking">Technology</span>
              <select
                value={technologyId}
                onChange={(event) => setTechnologyId(event.target.value)}
                className="border border-rule bg-paper px-2 py-1.5 text-sm"
              >
                {GRAPH.technologies.map((technology) => (
                  <option key={technology.id} value={technology.id}>
                    {technology.name}
                    {technology.absenceEstablishableOn.length === 0
                      ? " — absence unknowable"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="marking">Category</span>
              <select
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(event.target.value as CategoryId)
                }
                className="border border-rule bg-paper px-2 py-1.5 text-sm"
              >
                {GRAPH.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {needsGrade ? (
            <label className="flex flex-col gap-1">
              <span className="marking">Minimum confidence</span>
              <div className="flex">
                {GRADES.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setMinGrade(grade)}
                    className={`receipt flex-1 border px-2 py-1.5 ${
                      minGrade === grade
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "border-rule bg-paper text-slate"
                    }`}
                  >
                    {grade.toLowerCase()}
                  </button>
                ))}
              </div>
            </label>
          ) : (
            <p className="text-xs leading-snug text-slate">
              Negative predicates carry no confidence. They are either computable
              or they are not.
            </p>
          )}

          <button
            type="button"
            onClick={add}
            className="mt-1 border border-ink bg-ink px-3 py-2 text-sm font-medium text-[color:var(--paper)] hover:opacity-90"
          >
            Add predicate
          </button>
        </div>
      </section>

      <section>
        <Marking className="mb-2">As of</Marking>
        <input
          type="date"
          value={asOf}
          min="2022-01-01"
          max="2027-12-31"
          onChange={(event) => onAsOfChange(event.target.value)}
          className="w-full border border-rule bg-card px-2 py-1.5 text-sm"
        />
        <p className="mt-1.5 text-xs leading-snug text-slate">
          Evidence decays against this date, never against the wall clock. Move
          it back and stale accounts come alive.
        </p>
      </section>
    </div>
  );
}
