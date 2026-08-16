/**
 * Four presets. Two of them are a matched pair and neither ships without the
 * other: `data-stack-gap` asks a question this data cannot answer, and
 * `chat-gap` asks the same shape of question about a category where it can.
 * Without the second, the refusal reads as a broken product instead of a
 * principled one.
 */

import { presetSchema } from "@/lib/technographics/schema";
import type { Preset } from "@/lib/technographics/types";

export const PRESETS: Preset[] = [
  {
    id: "displacement",
    label: "Competitive displacement",
    blurb:
      "Accounts running the competitor right now, confirmed by something loading on the page rather than a directory listing.",
    predicates: [{ op: "has", technologyId: "intercom", minGrade: "CONFIRMED" }],
  },
  {
    id: "data-stack-gap",
    label: "Modern data stack, no reverse ETL",
    blurb:
      "The query every technographic vendor will happily run for you. Reverse ETL has nothing client-side to observe, so its absence cannot be established — this one refuses.",
    predicates: [
      { op: "has_any_in", categoryId: "cdp", minGrade: "CONFIRMED" },
      { op: "gap", categoryId: "reverse_etl" },
    ],
  },
  {
    id: "chat-gap",
    label: "Analytics in place, no chat tool",
    blurb:
      "The same shape of question about a category that is exhaustively visible on a fetched page. This one has a real answer.",
    predicates: [
      { op: "has_any_in", categoryId: "analytics", minGrade: "CONFIRMED" },
      { op: "gap", categoryId: "support_chat" },
    ],
  },
  {
    id: "mid-migration",
    label: "Mid-migration",
    blurb:
      "Two competing customer data platforms confirmed at once. Not a data error — the best week of the year to call.",
    predicates: [
      { op: "count_in", categoryId: "cdp", atLeast: 2, minGrade: "CONFIRMED" },
    ],
  },
].map((preset) => presetSchema.parse(preset));

export const DEFAULT_PRESET_ID = "displacement";

/** The corpus is a fixed snapshot, so "today" is a date, not the wall clock. */
export const DEFAULT_AS_OF = "2026-08-16";
