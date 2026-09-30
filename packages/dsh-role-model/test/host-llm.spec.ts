/**
 * L0: host module identity.
 *
 * The plugin installs its own `node_modules`, so importing `@deepseek-ai/dsh-llm`
 * naively yields a second `LlmError`/`HarnessError` class identity. The host
 * deliberately refuses foreign error classes:
 *
 *   // packages/llm/llm/src/adapter-failure.ts:104-107
 *   function harnessErrorCode(error: Error): string {
 *     return error instanceof HarnessError ? error.code : 'UNKNOWN'
 *   }
 *
 * `UNKNOWN` is not in `DEFAULT_RETRYABLE_CODES`, so a duplicated error class
 * silently disables retry for transient failures and destroys the failure
 * taxonomy. These specs lock the resolution order and the safety properties that
 * keep failure codes correct regardless of which class identity we end up with.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  type HostLlmCandidate,
  candidateFromCwd,
  candidateFromHarnessRoot,
  candidateFromProcessEntry,
  createHostLlmResolver,
  createLlmFailureError,
  harnessRootMarker,
  loadHostLlmClasses,
  resolveHostLlmPathFromEntry,
} from "../src/host-llm.js";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "dsh-role-model-host-llm-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Build a fake harness checkout carrying the module marker. */
function fakeHarnessRoot(root: string): string {
  // `harnessRootMarker()` already ends in `index.js`; it IS the module file.
  const markerPath = join(root, harnessRootMarker());
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, "export const marker = true\n");
  return root;
}

describe("harness module marker", () => {
  test("is the path DSH resolves @deepseek-ai/dsh-llm to", () => {
    expect(harnessRootMarker()).toBe(join("packages", "llm", "llm", "lib", "index.js"));
  });
});

describe("candidateFromHarnessRoot", () => {
  test("accepts a root whose marker exists", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const candidate = candidateFromHarnessRoot(root);
    expect(candidate?.kind).toBe("harness-root");
    if (candidate?.kind !== "harness-root") throw new Error("expected a harness-root candidate");
    expect(candidate.path).toBe(resolve(join(root, harnessRootMarker())));
  });

  test("rejects a root without the marker", () => {
    expect(candidateFromHarnessRoot(temporaryDirectory())).toBeUndefined();
  });

  test("rejects blank, relative-looking, and non-string roots", () => {
    expect(candidateFromHarnessRoot("")).toBeUndefined();
    expect(candidateFromHarnessRoot("   ")).toBeUndefined();
    expect(candidateFromHarnessRoot(undefined)).toBeUndefined();
    expect(candidateFromHarnessRoot(42)).toBeUndefined();
  });
});

describe("resolveHostLlmPathFromEntry", () => {
  test("walks up from a process entry path to the harness root", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const entry = join(root, "apps", "cli", "lib", "bin.js");
    mkdirSync(dirname(entry), { recursive: true });
    writeFileSync(entry, "// entry\n");
    expect(resolveHostLlmPathFromEntry(entry)).toBe(resolve(join(root, harnessRootMarker())));
  });

  test("returns undefined when no ancestor carries the marker", () => {
    const root = temporaryDirectory();
    const entry = join(root, "some", "entry.js");
    mkdirSync(dirname(entry), { recursive: true });
    writeFileSync(entry, "// entry\n");
    expect(resolveHostLlmPathFromEntry(entry)).toBeUndefined();
  });

  test("ignores blank and non-string entry paths", () => {
    expect(resolveHostLlmPathFromEntry("")).toBeUndefined();
    expect(resolveHostLlmPathFromEntry("   ")).toBeUndefined();
    expect(resolveHostLlmPathFromEntry(undefined)).toBeUndefined();
  });

  test("does not ascend past the filesystem root", () => {
    expect(
      resolveHostLlmPathFromEntry(join(sep, "definitely-not-a-harness", "entry.js")),
    ).toBeUndefined();
  });
});

describe("candidateFromProcessEntry", () => {
  test("produces a process-entry candidate for a harness-shaped entry path", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const entry = join(root, "packages", "cli", "lib", "bin.js");
    mkdirSync(dirname(entry), { recursive: true });
    writeFileSync(entry, "// entry\n");
    const candidate = candidateFromProcessEntry(entry);
    expect(candidate?.kind).toBe("process-entry");
  });
});

describe("createHostLlmResolver resolution order", () => {
  test("prefers the explicit module override", () => {
    const override = join(temporaryDirectory(), "override-host-llm.js");
    writeFileSync(override, 'export const marker = "override"\n');
    const resolver = createHostLlmResolver({
      moduleOverride: override,
      env: { DSH_HARNESS_ROOT: fakeHarnessRoot(temporaryDirectory()) },
      cwd: fakeHarnessRoot(temporaryDirectory()),
      packageRoot: temporaryDirectory(),
    });
    expect(resolver.candidates()[0]).toMatchObject({ kind: "module-override", path: override });
    expect(resolver.resolve()).toMatchObject({ kind: "module-override", path: override });
  });

  test("falls back to DSH_HARNESS_ROOT when no override is configured", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const resolver = createHostLlmResolver({
      env: { DSH_HARNESS_ROOT: root },
      packageRoot: temporaryDirectory(),
    });
    expect(resolver.resolve()).toMatchObject({
      kind: "harness-root",
      path: resolve(join(root, harnessRootMarker())),
    });
  });

  test("falls back to walking up from the working directory", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const nested = join(root, "apps", "cli");
    mkdirSync(nested, { recursive: true });
    const resolver = createHostLlmResolver({
      env: {},
      cwd: nested,
      packageRoot: temporaryDirectory(),
    });
    expect(resolver.resolve()).toMatchObject({
      kind: "cwd",
      path: resolve(join(root, harnessRootMarker())),
    });
  });

  test("records every candidate it tried, in order, and always ends with the self import", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const nested = join(root, "apps", "cli");
    mkdirSync(nested, { recursive: true });
    const resolver = createHostLlmResolver({
      env: { DSH_HARNESS_ROOT: root },
      cwd: nested,
      packageRoot: temporaryDirectory(),
      fallbackSpecifier: "not-a-real-package-xyz",
    });
    const tried = resolver.candidates().map((candidate) => candidate.kind);
    expect(tried).toEqual(["harness-root", "cwd", "package-import"]);
  });

  test("reports no resolution when no candidate exists", () => {
    const resolver = createHostLlmResolver({
      env: {},
      cwd: temporaryDirectory(),
      packageRoot: temporaryDirectory(),
      fallbackSpecifier: "not-a-real-package-xyz",
    });
    expect(resolver.resolve()).toBeUndefined();
    expect(resolver.candidates().map((candidate) => candidate.kind)).toEqual(["package-import"]);
  });

  test("never treats a blank override or blank harness root as a candidate", () => {
    const resolver = createHostLlmResolver({
      moduleOverride: "   ",
      env: { DSH_HARNESS_ROOT: "" },
      cwd: "",
      packageRoot: temporaryDirectory(),
    });
    const kinds = resolver.candidates().map((candidate) => candidate.kind);
    expect(kinds).not.toContain("module-override");
    expect(kinds).not.toContain("harness-root");
    expect(kinds).not.toContain("cwd");
  });
});

describe("createLlmFailureError", () => {
  test("carries an own failure whose code agrees with the error code", () => {
    const error = createLlmFailureError("provider rejected the credential", "AUTH", {
      status: 401,
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("AUTH");
    expect(error.message).toBe("provider rejected the credential");
    expect(error.failure).toEqual({
      message: "provider rejected the credential",
      code: "AUTH",
      status: 401,
    });
  });

  test("freezes the failure carrier so normalization cannot be defeated by later mutation", () => {
    const error = createLlmFailureError("rate limited", "RATE_LIMIT", {
      status: 429,
      providerRetryAfterMs: 1500,
    });
    expect(Object.isFrozen(error.failure)).toBe(true);
  });

  test("carries the code as an own data property, not an accessor", () => {
    const error = createLlmFailureError("boom", "SERVER");
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    expect(descriptor).toBeDefined();
    expect("value" in (descriptor ?? {})).toBe(true);
    expect(descriptor?.value).toBe("SERVER");
  });

  test("omits absent optional facts rather than emitting undefined fields", () => {
    const error = createLlmFailureError("boom", "SERVER");
    expect(Object.keys(error.failure).sort()).toEqual(["code", "message"]);
  });

  test("rejects empty messages and codes the same way as the host error", () => {
    expect(() => createLlmFailureError("", "AUTH")).toThrow();
    expect(() => createLlmFailureError("boom", "")).toThrow();
  });

  test("preserves the cause chain", () => {
    const cause = new Error("socket closed");
    const error = createLlmFailureError("transport failed", "TRANSPORT", { cause });
    expect(error.cause).toBe(cause);
  });

  test("is accepted by the host normalization rule for cross-package copies", () => {
    // Mirrors packages/llm/llm/src/adapter-failure.ts:20-27 — carried facts are
    // trusted only when the failure code agrees with the error's own code.
    const error = createLlmFailureError("rate limited", "RATE_LIMIT", { status: 429 });
    const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
    const ownCode = Object.getOwnPropertyDescriptor(error, "code");
    expect(descriptor).toBeDefined();
    expect(ownCode).toBeDefined();
    const carried = (descriptor as PropertyDescriptor).value as { code?: unknown };
    expect(carried.code).toBe((ownCode as PropertyDescriptor).value);
  });

  test("keeps code configurable so a rewrite can be detected as a mismatch", () => {
    // The host guard compares the carried failure code against the error's
    // *current* code; a non-configurable property would make that check
    // untestable and would let a rewrite silently succeed elsewhere.
    const error = createLlmFailureError("tampered", "AUTH");
    expect(Object.getOwnPropertyDescriptor(error, "code")?.configurable).toBe(true);
    Object.defineProperty(error, "code", {
      value: "SERVER",
      enumerable: true,
      writable: false,
      configurable: true,
    });
    expect(error.code).toBe("SERVER");
    expect(error.failure.code).toBe("AUTH");
  });
});

describe("loadHostLlmClasses", () => {
  test("loads LlmAdapter and LlmError from a harness checkout", async () => {
    const root = temporaryDirectory();
    const moduleDirectory = join(root, "packages", "llm", "llm", "lib");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      join(moduleDirectory, "index.js"),
      "export class LlmAdapter {}\nexport class LlmError extends Error {}\n",
    );
    const classes = await loadHostLlmClasses({ env: { DSH_HARNESS_ROOT: root }, cwd: root });
    expect(classes).toBeDefined();
    expect(typeof classes?.LlmAdapter).toBe("function");
    expect(typeof classes?.LlmError).toBe("function");
    expect(classes?.source.kind).toBe("harness-root");
  });

  test("returns undefined when a candidate exports no adapter classes", async () => {
    const root = temporaryDirectory();
    const moduleDirectory = join(root, "packages", "llm", "llm", "lib");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(join(moduleDirectory, "index.js"), "export const unrelated = true\n");
    expect(
      await loadHostLlmClasses({ env: { DSH_HARNESS_ROOT: root }, cwd: root }),
    ).toBeUndefined();
  });

  test("falls through a candidate with no exports to a working one", async () => {
    const brokenRoot = fakeHarnessRoot(temporaryDirectory());
    const workingRoot = temporaryDirectory();
    const workingModule = join(workingRoot, "packages", "llm", "llm", "lib");
    mkdirSync(workingModule, { recursive: true });
    writeFileSync(
      join(workingModule, "index.js"),
      "export class LlmAdapter {}\nexport class LlmError extends Error {}\n",
    );
    const classes = await loadHostLlmClasses({
      env: { DSH_HARNESS_ROOT: brokenRoot },
      cwd: workingRoot,
    });
    expect(classes).toBeDefined();
    expect(typeof classes?.LlmAdapter).toBe("function");
  });

  test("never throws when nothing can be loaded", async () => {
    await expect(
      loadHostLlmClasses({
        env: {},
        cwd: temporaryDirectory(),
        fallbackSpecifier: "not-a-real-package-xyz",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("candidate shape", () => {
  test("every emitted candidate path is absolute", () => {
    const root = fakeHarnessRoot(temporaryDirectory());
    const resolver = createHostLlmResolver({
      env: { DSH_HARNESS_ROOT: root },
      packageRoot: temporaryDirectory(),
    });
    const candidates: readonly HostLlmCandidate[] = resolver.candidates();
    for (const candidate of candidates) {
      if (candidate.kind === "package-import") continue;
      expect(candidate.path.startsWith(sep) || /^[A-Za-z]:[\\/]/u.test(candidate.path)).toBe(true);
      expect(existsSync(candidate.path) || candidate.kind !== "harness-root").toBe(true);
    }
  });
});
