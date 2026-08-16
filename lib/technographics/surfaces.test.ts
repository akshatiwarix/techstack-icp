import { describe, expect, it } from "vitest";
import {
  EXHAUSTIVE_SURFACES,
  FETCHABLE_SURFACES,
  SURFACES,
  getSurface,
} from "./surfaces";
import { SURFACE_IDS } from "./types";
import { addDays, daysBetween, describeAge } from "./dates";

describe("surfaces", () => {
  it("defines every surface in the type contract exactly once", () => {
    expect(SURFACES.map((surface) => surface.id).sort()).toEqual(
      [...SURFACE_IDS].sort(),
    );
  });

  it("marks only the enumerating surfaces exhaustive", () => {
    expect([...EXHAUSTIVE_SURFACES].sort()).toEqual(
      ["dns_records", "http_headers", "page_markup"].sort(),
    );
  });

  it("keeps the narrative surfaces non-exhaustive", () => {
    // A job posting that does not mention Snowflake is not evidence that
    // Snowflake is absent. This is the whole negation thesis in one assertion.
    for (const id of [
      "job_posting",
      "engineering_blog",
      "integrations_directory",
    ] as const) {
      expect(getSurface(id).exhaustive).toBe(false);
    }
  });

  it("can only ever fetch two surfaces from one URL", () => {
    expect(FETCHABLE_SURFACES).toEqual(["page_markup", "http_headers"]);
    for (const id of FETCHABLE_SURFACES) {
      expect(getSurface(id).exhaustive).toBe(true);
    }
  });

  it("gives every surface a distinct reach sentence", () => {
    const proves = SURFACES.map((surface) => surface.proves);
    expect(new Set(proves).size).toBe(proves.length);
  });

  it("throws on an unknown surface rather than returning undefined", () => {
    // @ts-expect-error deliberately outside the union
    expect(() => getSurface("carrier_pigeon")).toThrow(/unknown surface/);
  });
});

describe("dates", () => {
  it("counts whole days across a year boundary", () => {
    expect(daysBetween("2025-12-25", "2026-01-01")).toBe(7);
    expect(daysBetween("2026-01-01", "2025-12-25")).toBe(-7);
  });

  it("is unaffected by daylight saving", () => {
    // A local-time implementation returns 0 or 2 for one of these.
    expect(daysBetween("2026-03-28", "2026-03-29")).toBe(1);
    expect(daysBetween("2026-10-24", "2026-10-25")).toBe(1);
  });

  it("round-trips through addDays", () => {
    expect(addDays("2026-08-16", 365)).toBe("2027-08-16");
    expect(addDays("2026-08-16", -1)).toBe("2026-08-15");
  });

  it("rejects a non-date", () => {
    expect(() => daysBetween("last tuesday", "2026-01-01")).toThrow(
      /ISO date/,
    );
  });

  it("describes ages the way a receipt reads", () => {
    expect(describeAge(0)).toBe("today");
    expect(describeAge(1)).toBe("1 day ago");
    expect(describeAge(30)).toBe("30 days ago");
    expect(describeAge(365)).toBe("12 months ago");
    expect(describeAge(1095)).toBe("3 years ago");
  });
});
