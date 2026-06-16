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
  const shortSha = git(["rev-parse", "--short", commit]);
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

  const runIds = new Set(
    [
      ...implementationArtifacts.map((entry) => entry.runId),
      ...decisionsArtifacts.map((entry) => entry.runId),
      ...stateArtifacts.map((entry) => entry.runId),
    ].filter(Boolean),
  );

  const output = [`### ${subject} (${shortSha})`];
  if (runIds.size > 0) {
    output.push(`- Runs: ${[...runIds].map((runId) => `\`${runId}\``).join(", ")}`);
  }

  for (const artifact of implementationArtifacts) {
    if (artifact.scopeNote) {
      output.push(`- Implementation scope: ${artifact.scopeNote}`);
    }
    for (const bullet of artifact.bullets.slice(0, 4)) {
      output.push(`- Implementation: ${bullet}`);
    }
  }

  for (const artifact of decisionsArtifacts) {
    for (const bullet of artifact.bullets.slice(0, 4)) {
      output.push(`- Decisions: ${bullet}`);
    }
  }

  for (const artifact of stateArtifacts) {
    for (const bullet of artifact.bullets.slice(0, 4)) {
      output.push(`- State: ${bullet}`);
    }
  }

  for (const bullet of directDecisionBullets.slice(0, 4)) {
    output.push(`- Decisions: ${bullet}`);
  }

  for (const bullet of directStateBullets.slice(0, 4)) {
    output.push(`- State: ${bullet}`);
  }

  return output.join("\n");
}

const toRef = process.argv[2];
const explicitFromRef = process.argv[3];

if (!toRef) {
  console.error("Usage: node scripts/generate-recursive-release-changelog.mjs <to-ref> [from-ref]");
  process.exit(1);
}

const { fromRef, commits } = determineRange(toRef, explicitFromRef);
const entries = commits.map((commit) => buildCommitEntry(commit)).filter(Boolean);

const linesOut = [
  "## Recursive Change Log",
  "",
  fromRef
    ? `Source range: \`${fromRef}..${toRef}\``
    : `Source range: initial history through \`${toRef}\``,
  "",
];

if (entries.length === 0) {
  linesOut.push(
    "No structured recursive implementation, decisions, or state-update artifacts were found in this release range.",
  );
} else {
  linesOut.push(...entries.flatMap((entry) => [entry, ""]));
}

process.stdout.write(`${linesOut.join("\n").trim()}\n`);
