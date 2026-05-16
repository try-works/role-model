import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const execFileAsync = promisify(execFile);

async function listTrackedRecursiveJsonFiles() {
  const result = await execFileAsync("git", ["ls-files", ".recursive/run"], {
    cwd: repoRoot,
    windowsHide: true,
  });

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".json"))
    .sort();
}

describe("tracked recursive JSON evidence", () => {
  it("requires tracked recursive JSON files to contain parseable JSON payloads", async () => {
    const filePaths = await listTrackedRecursiveJsonFiles();
    const parseFailures: Array<{ filePath: string; error: string }> = [];

    for (const relativePath of filePaths) {
      let raw: string;

      try {
        raw = await readFile(path.join(repoRoot, relativePath), "utf8");
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          continue;
        }

        throw error;
      }

      try {
        JSON.parse(raw);
      } catch (error) {
        parseFailures.push({
          filePath: relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    expect(parseFailures).toEqual([]);
  });
});
