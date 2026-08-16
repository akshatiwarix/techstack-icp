import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The engine boundary, enforced with no allowlist beyond `zod`.
 *
 * A module that cannot import a model client cannot invent a detection, so
 * every claim rendered on screen came from an observation passed in as an
 * argument. The eslint rule says the same thing; this test is the one that
 * cannot be silenced with a disable comment.
 */

const ENGINE_DIR = join(process.cwd(), "lib", "technographics");
const ALLOWED_BARE_SPECIFIERS = new Set(["zod"]);

function engineSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return engineSourceFiles(full);
    if (!entry.name.endsWith(".ts")) return [];
    if (entry.name.endsWith(".test.ts")) return [];
    return [full];
  });
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_RE = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

function specifiersIn(source: string): string[] {
  const found: string[] = [];
  for (const re of [IMPORT_RE, DYNAMIC_IMPORT_RE, REQUIRE_RE]) {
    re.lastIndex = 0;
    let match = re.exec(source);
    while (match !== null) {
      const specifier = match[1];
      if (specifier !== undefined) found.push(specifier);
      match = re.exec(source);
    }
  }
  return found;
}

describe("engine purity", () => {
  const files = engineSourceFiles(ENGINE_DIR);

  it("finds engine source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.slice(ENGINE_DIR.length + 1)} imports only zod and relative modules`, () => {
      const offenders = specifiersIn(readFileSync(file, "utf8")).filter(
        (specifier) =>
          !specifier.startsWith(".") &&
          !ALLOWED_BARE_SPECIFIERS.has(specifier),
      );
      expect(offenders).toEqual([]);
    });
  }
});
