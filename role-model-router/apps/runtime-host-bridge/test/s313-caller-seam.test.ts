import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

/**
 * S314 regression guard: every plain-options startBridgeServer caller must either pass the explicit test seam
 * ({ allowTestSeamBackend: true }), start from the DAG-composed options (createCliServerOptions, plain or
 * namespaced), or pass an explicit backend owner as the second argument. A bare one-argument call (or a
 * trailing-comma/handler-only second argument) would hit the production fail-closed throw at runtime.
 */

const testRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = join(testRoot, "..");
const EXEMPT = new Set(["s313-caller-seam.test.ts", "s313-server-owner.test.ts"]);

const callFiles = (): readonly { file: string; text: string }[] => {
  const files = [
    ...readdirSync(testRoot)
      .filter((name) => name.endsWith(".ts") && !EXEMPT.has(name))
      .map((name) => join(testRoot, name)),
    ...readdirSync(join(appRoot, "src"))
      .filter((name) => name.startsWith("validate-") && name.endsWith(".ts"))
      .map((name) => join(appRoot, "src", name)),
    ...readdirSync(join(appRoot, "scripts"))
      .filter((name) => name.endsWith(".ts"))
      .map((name) => join(appRoot, "scripts", name)),
  ];
  return files.map((file) => ({ file, text: readFileSync(file, "utf8") }));
};

const callTexts = (text: string): readonly string[] => {
  const token = "startBridgeServer(";
  const calls: string[] = [];
  let index = 0;
  while ((index = text.indexOf(token, index)) >= 0) {
    const open = index + token.length;
    let depth = 0;
    let quote: string | null = null;
    let close = -1;
    for (let i = open; i < text.length; i++) {
      const ch = text[i] ?? "";
      if (quote !== null) {
        if (ch === "\\") {
          i += 1;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "(" || ch === "{" || ch === "[") depth += 1;
      else if (ch === ")" || ch === "}" || ch === "]") {
        if (ch === ")" && depth === 0) {
          close = i;
          break;
        }
        depth -= 1;
      }
    }
    if (close >= 0) calls.push(text.slice(index, close + 1));
    index = close >= 0 ? close + 1 : index + token.length;
  }
  return calls;
};

/** Splits the call's arguments at top level; trailing commas and an empty tail are ignored. */
export const splitTopLevelArgs = (call: string): readonly string[] => {
  const open = call.indexOf("(");
  const close = call.lastIndexOf(")");
  if (open < 0 || close <= open) return [];
  const inner = call.slice(open + 1, close);
  const args: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i] ?? "";
    if (quote !== null) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "}" || ch === "]") depth -= 1;
    else if (ch === "," && depth === 0) {
      const arg = inner.slice(start, i).trim();
      if (arg.length > 0) args.push(arg);
      start = i + 1;
    }
  }
  const tail = inner.slice(start).trim();
  if (tail.length > 0) args.push(tail);
  return args;
};

const CREATE_OPTIONS_FORMS = [
  /^createCliServerOptions\s*\(/,
  /^(?:[\w$]+\s*\.\s*)+createCliServerOptions\s*\(/,
];

/** True only for a call whose seam/backend is actually recognized, not for a bare second argument. */
export const isSafeCall = (call: string): boolean => {
  if (call.includes("allowTestSeamBackend")) return true;
  const args = splitTopLevelArgs(call);
  const first = args[0] ?? "";
  if (CREATE_OPTIONS_FORMS.some((pattern) => pattern.test(first))) return true;
  const second = args[1] ?? "";
  return second.includes("backend");
};

describe("S314 caller seam sweep", () => {
  test("every plain-options startBridgeServer caller carries the explicit test seam, composed options or backend", () => {
    const offenders: string[] = [];
    for (const { file, text } of callFiles()) {
      for (const call of callTexts(text)) {
        if (!isSafeCall(call))
          offenders.push(
            `${file.replace(appRoot, "")} :: ${call.slice(0, 90).replace(/\s+/g, " ")}`,
          );
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("S314 guard fixtures", () => {
  test("negative fixtures: trailing comma and handler-only second argument are rejected", () => {
    const fixtures = [
      'startBridgeServer({ host: "127.0.0.1", port: 0 },)',
      'startBridgeServer({ host: "127.0.0.1", port: 0 }, { handlerFactory })',
    ];
    for (const fixture of fixtures) expect(isSafeCall(fixture)).toBe(false);
  });

  test("positive fixtures: composed options and explicit backend/seam second arguments are accepted", () => {
    const fixtures = [
      "startBridgeServer(createCliServerOptions(inputs, resolver))",
      "startBridgeServer(cli.createCliServerOptions(inputs, resolver))",
      "startBridgeServer(options, { allowTestSeamBackend: true })",
      "startBridgeServer(options, { backend: owner })",
      "startBridgeServer(options, backendOwner === undefined ? undefined : { backend: backendOwner })",
    ];
    for (const fixture of fixtures) expect(isSafeCall(fixture)).toBe(true);
  });
});
