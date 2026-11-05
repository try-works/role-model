#!/usr/bin/env node
/**
 * Scan build artifacts / evidence for credential-shaped strings without printing them.
 * Prints only pattern label, hit count, and file paths.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PATTERNS = [
  { label: "sk-key", re: /(?<![A-Za-z0-9])sk[-_][A-Za-z0-9_.-]{20,}/gu },
  { label: "bearer-token", re: /Bearer\s+[A-Za-z0-9._~+/-]{20,}/gu },
  { label: "api-key-assignment", re: /api[_-]?key["'\s:=]{1,8}[A-Za-z0-9._~+/-]{20,}/giu },
  { label: "mock-env-name", re: /MOCK_API_KEY/gu },
];

const walk = (target) => {
  const stat = statSync(target);
  if (stat.isFile()) return [target];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) => walk(path.join(target, entry.name)));
};

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("usage: node scripts/runtime/scan-credential-material.mjs <path...>");
  process.exit(2);
}
const files = roots.flatMap((root) => walk(root));
const results = PATTERNS.map((pattern) => ({ label: pattern.label, files: [], hits: 0 }));
for (const file of files) {
  let text;
  try {
    text = readFileSync(file).toString("latin1");
  } catch {
    continue;
  }
  for (const pattern of results) {
    const matcher = PATTERNS.find((entry) => entry.label === pattern.label);
    matcher.re.lastIndex = 0;
    const matches = text.match(matcher.re);
    if (matches !== null && matches.length > 0) {
      pattern.hits += matches.length;
      pattern.files.push(file);
    }
  }
}
console.log(JSON.stringify({ roots, filesScanned: files.length, patterns: results.map((entry) => ({ label: entry.label, hits: entry.hits, files: [...new Set(entry.files)] })) }, null, 2));
if (results.some((entry) => entry.label.startsWith("sk-") && entry.hits > 0)) process.exitCode = 1;
