import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return "";
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lines(value) {
  return value.split(/\r?\n/);
}

function parseBulletsInSection(markdown, sectionHeading) {
  const sectionPattern = new RegExp(
    `^## ${escapeRegex(sectionHeading)}\\n([\\s\\S]*?)(?=^## |\\Z)`,
    "m",
  );
  const sectionMatch = markdown.match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }
  return lines(sectionMatch[1])
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function parseNestedBulletsAfterLabel(markdown, sectionHeading, label) {
  const sectionPattern = new RegExp(
    `^## ${escapeRegex(sectionHeading)}\\n([\\s\\S]*?)(?=^## |\\Z)`,
    "m",
  );
  const sectionMatch = markdown.match(sectionPattern);
  if (!sectionMatch) {
    return [];
  }

  const sectionLines = lines(sectionMatch[1]);
  const labelIndex = sectionLines.findIndex((line) => line.trim() === label);
  if (labelIndex < 0) {
    return [];
  }

  const bullets = [];
  for (const line of sectionLines.slice(labelIndex + 1)) {
    if (/^\S/.test(line)) {
      break;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2).trim());
    }
  }
  return bullets;
}

function parseScopeNote(markdown) {
  const match = markdown.match(/^Scope note:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function parseAddedBulletsFromDiff(commit, filePath) {
  const diff = tryGit(["show", "--format=", "--unified=0", commit, "--", filePath]);
  if (!diff) {
    return [];
  }

  const bullets = [];
  for (const line of lines(diff)) {
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }
    const stripped = line.slice(1).trim();
    if (stripped.startsWith("- ")) {
      bullets.push(stripped.slice(2).trim());
    }
  }
  return bullets;
}

function parseRunId(filePath) {
  const match = filePath.match(/\.recursive\/run\/([^/]+)\//);
  return match?.[1] ?? null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanScopeNote(scopeNote) {
  return normalizeWhitespace(
    scopeNote
      .replace(/\brun-\d+\b/gi, "this release")
      .replace(/\bPhase\s*\d+(\.\d+)?\b/gi, "")
      .replace(/\bstrict-TDD\b/gi, "")
      .replace(/\bimplementation\b/gi, "")
      .replace(/\bartifact\b/gi, "")
      .replace(/\baddendum\b/gi, "")
      .replace(/\brecords?\b/gi, "")
      .replace(/\bsummarizes?\b/gi, "")
      .replace(/\bthis\b/gi, "")
      .replace(/\s+,/g, ",")
      .replace(/\s+\./g, "."),
  );
}

function entryText(entry) {
  return [
    entry.subject,
    ...entry.scopeNotes,
    ...entry.implementationBullets,
    ...entry.decisionBullets,
    ...entry.stateBullets,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function anyMatch(haystack, patterns) {
  return patterns.some((pattern) => pattern.test(haystack));
}

function buildUserFacingHighlights(entries) {
  const combined = entries.map((entry) => entryText(entry)).join("\n");
  const highlights = [];

  if (
    anyMatch(combined, [
      /\bresponses\b/,
      /\breasoning\b/,
      /\btool_choice\b/,
      /\bprevious_response_id\b/,
      /\bprompt-cache\b/,
      /\bsession-affinity\b/,
      /\bcontinuation\b/,
    ])
  ) {
    highlights.push(
      "Routed requests now preserve OpenAI Responses features such as reasoning, tool choice, continuation IDs, prompt caching, and request affinity when execution moves across compatible endpoints.",
    );
  }

  if (
    anyMatch(combined, [
      /\bcodex\b/,
      /\bsubscription\b/,
      /\bendpoint compatibility\b/,
      /\bstatic model\b/,
      /\boperator-configured\b/,
    ])
  ) {
    highlights.push(
      "Codex subscription and operator-configured OpenAI endpoints are now selected using endpoint compatibility metadata instead of brittle hard-coded model lists, improving alias routing and support for newer model IDs.",
    );
  }

  if (
    anyMatch(combined, [
      /\blitellm\b/,
      /\brouter_settings\b/,
      /\blitellm_settings\b/,
      /\bunified runtime config\b/,
    ])
  ) {
    highlights.push(
      "Managed LiteLLM execution now preserves router and module settings from unified runtime configuration, reducing drift between configured policy and downstream execution behavior.",
    );
  }

  if (
    anyMatch(combined, [
      /\btelemetry\b/,
      /\bexecution-semantics\b/,
      /\bretry\b/,
      /\breroute\b/,
      /\bcooldown\b/,
      /\bidempotency\b/,
      /\bpayload-byte\b/,
      /\bfailure\b/,
      /\bsqlite\b/,
    ])
  ) {
    highlights.push(
      "Request telemetry and failure receipts now capture execution path, payload sizing, retries, reroutes, cooldown decisions, idempotency state, and failure context so routing problems are diagnosable alongside successful calls.",
    );
  }

  if (
    anyMatch(combined, [
      /\bvalidate-vendors\b/,
      /\bcorpus\b/,
      /\bdeterministic\b/,
      /\bpackaged-runtime\b/,
      /\brebuilt-runtime\b/,
      /\bpi\b/,
      /\bcraft\b/,
    ])
  ) {
    highlights.push(
      "Runtime validation now covers deterministic routed client flows and packaged-runtime checks, improving confidence in alias-based text, image, and degraded-primary routing behavior.",
    );
  }

  if (highlights.length > 0) {
    return unique(highlights);
  }

  const fallbackHighlights = entries
    .flatMap((entry) => entry.scopeNotes)
    .map((scopeNote) => cleanScopeNote(scopeNote))
    .filter(Boolean)
    .map((scopeNote) => scopeNote.replace(/^[a-z]/, (char) => char.toUpperCase()));

  return unique(fallbackHighlights).slice(0, 5);
}

function parseImplementationArtifact(commit, filePath) {
  const content = tryGit(["show", `${commit}:${filePath}`]);
  if (!content) {
    return null;
  }
  const summaryBullets = parseBulletsInSection(content, "Sub-phase Implementation Summary");
  return {
    runId: parseRunId(filePath),
    scopeNote: parseScopeNote(content),
    bullets: summaryBullets,
    sourcePath: filePath,
  };
}

function parseDecisionsArtifact(commit, filePath) {
  const content = tryGit(["show", `${commit}:${filePath}`]);
  if (!content) {
    return null;
  }
  const bullets = parseNestedBulletsAfterLabel(
    content,
    "Decisions Changes Applied",
    "- Decision delta recorded:",
  );
  return {
    runId: parseRunId(filePath),
    bullets,
    sourcePath: filePath,
  };
}

function parseStateArtifact(commit, filePath) {
  const content = tryGit(["show", `${commit}:${filePath}`]);
  if (!content) {
    return null;
  }
  const bullets = parseNestedBulletsAfterLabel(
    content,
    "State Changes Applied",
    "- Current truth added:",
  );
  return {
    runId: parseRunId(filePath),
    bullets,
    sourcePath: filePath,
  };
}

function determineRange(toRef, explicitFromRef) {
  if (explicitFromRef) {
    return {
      fromRef: explicitFromRef,
      commits: git(["rev-list", "--reverse", `${explicitFromRef}..${toRef}`])
        .split(/\r?\n/)
        .filter(Boolean),
    };
  }

  const tags = tryGit(["tag", "--merged", toRef, "--sort=-creatordate"])
    .split(/\r?\n/)
    .filter((tag) => /^v\d+\.\d+\.\d+/.test(tag));
  const normalizedToRef = tryGit(["rev-parse", "--verify", toRef]);
  let previousTag = null;

  for (const tag of tags) {
    const tagSha = tryGit(["rev-list", "-n", "1", tag]);
    if (tagSha && tagSha !== normalizedToRef && tag !== toRef) {
      previousTag = tag;
      break;
    }
  }

  if (previousTag) {
    return {
      fromRef: previousTag,
      commits: git(["rev-list", "--reverse", `${previousTag}..${toRef}`])
        .split(/\r?\n/)
        .filter(Boolean),
    };
  }

  return {
    fromRef: null,
    commits: git(["rev-list", "--reverse", toRef]).split(/\r?\n/).filter(Boolean),
  };
}

function buildCommitEntry(commit) {
  const subject = git(["show", "-s", "--format=%s", commit]);
  const changedFiles = git(["diff-tree", "--no-commit-id", "--name-only", "-r", commit])
    .split(/\r?\n/)
    .filter(Boolean);

  const implementationArtifacts = changedFiles
    .filter((filePath) => /\/03-implementation-summary(?:\.|-|$)/.test(filePath))
    .map((filePath) => parseImplementationArtifact(commit, filePath))
    .filter(Boolean);
  const decisionsArtifacts = changedFiles
    .filter((filePath) => /\/06-decisions-update\.md$/.test(filePath))
    .map((filePath) => parseDecisionsArtifact(commit, filePath))
    .filter(Boolean);
  const stateArtifacts = changedFiles
    .filter((filePath) => /\/07-state-update\.md$/.test(filePath))
    .map((filePath) => parseStateArtifact(commit, filePath))
    .filter(Boolean);

  const directDecisionBullets =
    decisionsArtifacts.length === 0 && changedFiles.includes(".recursive/DECISIONS.md")
      ? parseAddedBulletsFromDiff(commit, ".recursive/DECISIONS.md")
      : [];
  const directStateBullets =
    stateArtifacts.length === 0 && changedFiles.includes(".recursive/STATE.md")
      ? parseAddedBulletsFromDiff(commit, ".recursive/STATE.md")
      : [];

  if (
    implementationArtifacts.length === 0 &&
    decisionsArtifacts.length === 0 &&
    stateArtifacts.length === 0 &&
    directDecisionBullets.length === 0 &&
    directStateBullets.length === 0
  ) {
    return null;
  }

  const runIds = unique([
    ...implementationArtifacts.map((entry) => entry.runId),
    ...decisionsArtifacts.map((entry) => entry.runId),
    ...stateArtifacts.map((entry) => entry.runId),
  ]);

  return {
    subject,
    runIds,
    scopeNotes: implementationArtifacts.map((artifact) => artifact.scopeNote).filter(Boolean),
    implementationBullets: implementationArtifacts.flatMap((artifact) =>
      artifact.bullets.slice(0, 4),
    ),
    decisionBullets: [
      ...decisionsArtifacts.flatMap((artifact) => artifact.bullets.slice(0, 4)),
      ...directDecisionBullets.slice(0, 4),
    ],
    stateBullets: [
      ...stateArtifacts.flatMap((artifact) => artifact.bullets.slice(0, 4)),
      ...directStateBullets.slice(0, 4),
    ],
  };
}

const toRef = process.argv[2];
const explicitFromRef = process.argv[3];

if (!toRef) {
  console.error("Usage: node scripts/generate-recursive-release-changelog.mjs <to-ref> [from-ref]");
  process.exit(1);
}

const { fromRef, commits } = determineRange(toRef, explicitFromRef);
const entries = commits.map((commit) => buildCommitEntry(commit)).filter(Boolean);
const highlights = buildUserFacingHighlights(entries);

const linesOut = [
  "## Release Highlights",
  "",
  fromRef
    ? `Source range: \`${fromRef}..${toRef}\``
    : `Source range: initial history through \`${toRef}\``,
  "",
];

if (highlights.length === 0) {
  linesOut.push(
    "No structured release highlights were derived from the recursive implementation, decisions, or state-update artifacts in this release range.",
  );
} else {
  linesOut.push(...highlights.map((highlight) => `- ${highlight}`));
}

process.stdout.write(`${linesOut.join("\n").trim()}\n`);
