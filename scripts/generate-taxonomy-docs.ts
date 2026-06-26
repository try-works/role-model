// Generate taxonomy docs tables from canonical JSON data
// Usage: tsx scripts/generate-taxonomy-docs.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname ?? process.cwd(), "..");
const dataRoot = path.join(repoRoot, "role-model-router/packages/core/data/taxonomy");
const docsPath = path.join(repoRoot, "docs/protocol/taxonomy-v1.md");

interface Group {
  id: string;
  label: string;
  description: string;
  primaryRoleIds: string[];
  secondaryRoleIds: string[];
}

interface Role {
  id: string;
  label: string;
  description: string;
  primaryGroupId: string;
  secondaryGroupIds: string[];
  typicalTaskIds?: string[];
  classification?: {
    summary: string;
    positiveSignals: string[];
    negativeSignals: string[];
  };
}

interface TaskType {
  id: string;
  label: string;
  description: string;
  primaryRole: string;
  compatibleRoles: string[];
  requiredCapabilities: string[];
  preferredCapabilities: string[];
  requiredModalities?: string[];
  toolClasses?: string[];
  classifier?: {
    useWhen: string;
    doNotUseWhen: string;
  };
}

interface Capability {
  id: string;
  label: string;
  description: string;
}

interface Modality {
  id: string;
  label: string;
  description: string;
}

interface ToolClass {
  id: string;
  label: string;
  description: string;
}

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(path.join(dataRoot, filename), "utf8"));
}

function escapeMd(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function generate() {
  const groups = loadJson<Group[]>("groups.json");
  const roles = loadJson<Role[]>("roles.json");
  const tasks = loadJson<TaskType[]>("task-types.json");
  const capabilities = loadJson<Capability[]>("capabilities.json");
  const modalities = loadJson<Modality[]>("modalities.json");
  const toolClasses = loadJson<ToolClass[]>("tool-classes.json");

  const lines: string[] = [];

  // ── Groups ──
  lines.push("### Groups");
  lines.push("");
  lines.push("| ID | Label | Description | Primary Roles | Secondary Roles |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const g of groups.sort((a, b) => a.id.localeCompare(b.id))) {
    const primary = g.primaryRoleIds.join(", ");
    const secondary = g.secondaryRoleIds.join(", ") || "—";
    lines.push(
      `| \`${g.id}\` | ${g.label} | ${escapeMd(g.description)} | ${primary} | ${secondary} |`,
    );
  }
  lines.push("");

  // ── Roles ──
  lines.push("### Roles");
  lines.push("");
  lines.push(
    "| ID | Label | Primary Group | Secondary Groups | Description | Typical Tasks | Classification |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of roles.sort((a, b) => a.id.localeCompare(b.id))) {
    const secondary = r.secondaryGroupIds.join(", ") || "—";
    const typical =
      (r.typicalTaskIds ?? [])
        .slice(0, 3)
        .map((t) => `\`${t}\``)
        .join(", ") || "—";
    const classif = r.classification
      ? `${escapeMd(r.classification.summary).substring(0, 80)}…`
      : "—";
    lines.push(
      `| \`${r.id}\` | ${r.label} | \`${r.primaryGroupId}\` | ${secondary} | ${escapeMd(r.description)} | ${typical} | ${classif} |`,
    );
  }
  lines.push("");

  // ── Task Types (compact — full details generated on demand) ──
  lines.push("### Task Types");
  lines.push("");
  lines.push(
    `V1 ships with ${tasks.length} canonical task types across ${roles.length} role families. The table below shows a representative sample. Full task details including classifier guidance (use-when, do-not-use-when), compatible roles, required/preferred capabilities, modalities, and tool classes are available through the runtime taxonomy API at \`/api/role-model/taxonomy/task-types/{taskType}\`.`,
  );
  lines.push("");
  lines.push(
    "| Task Type ID | Label | Primary Role | Compatible Roles | Required Capabilities | Preferred Capabilities | Use When |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");

  // Show one task per role family as representative
  const sampledTasks = new Map<string, TaskType>();
  for (const t of tasks) {
    const family = t.id.split(".")[0];
    if (!sampledTasks.has(family)) {
      sampledTasks.set(family, t);
    }
  }
  for (const t of [...sampledTasks.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const compatible = t.compatibleRoles.join(", ");
    const required = t.requiredCapabilities.map((c) => `\`${c}\``).join(", ") || "—";
    const preferred = t.preferredCapabilities.map((c) => `\`${c}\``).join(", ") || "—";
    const useWhen = t.classifier?.useWhen ? escapeMd(t.classifier.useWhen).substring(0, 100) : "—";
    lines.push(
      `| \`${t.id}\` | ${t.label} | \`${t.primaryRole}\` | ${compatible} | ${required} | ${preferred} | ${useWhen} |`,
    );
  }
  lines.push("");

  // ── Capabilities ──
  lines.push("### Capabilities");
  lines.push("");
  lines.push(`V1 ships with ${capabilities.length} canonical capabilities.`);
  lines.push("");
  lines.push("| ID | Label | Description |");
  lines.push("| --- | --- | --- |");
  for (const c of capabilities.sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`| \`${c.id}\` | ${c.label} | ${escapeMd(c.description)} |`);
  }
  lines.push("");

  // ── Modalities ──
  lines.push("### Modalities");
  lines.push("");
  lines.push(`V1 ships with ${modalities.length} canonical modalities.`);
  lines.push("");
  lines.push("| ID | Label | Description |");
  lines.push("| --- | --- | --- |");
  for (const m of modalities.sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`| \`${m.id}\` | ${m.label} | ${escapeMd(m.description)} |`);
  }
  lines.push("");

  // ── Tool Classes ──
  lines.push("### Tool Classes");
  lines.push("");
  lines.push(`V1 ships with ${toolClasses.length} canonical tool classes.`);
  lines.push("");
  lines.push("| ID | Label | Description |");
  lines.push("| --- | --- | --- |");
  for (const t of toolClasses.sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`| \`${t.id}\` | ${t.label} | ${escapeMd(t.description)} |`);
  }
  lines.push("");

  // ── Update docs file ──
  const docContent = readFileSync(docsPath, "utf8");
  const startMarker = "<!-- AUTO-GENERATED-TAXONOMY-TABLES-START -->";
  const endMarker = "<!-- AUTO-GENERATED-TAXONOMY-TABLES-END -->";

  let updated: string;
  if (docContent.includes(startMarker) && docContent.includes(endMarker)) {
    const before = docContent.substring(0, docContent.indexOf(startMarker) + startMarker.length);
    const after = docContent.substring(docContent.indexOf(endMarker));
    updated = `${before}\n\n${lines.join("\n")}\n\n${after}`;
  } else {
    // First run: inject markers around the manually-maintained tables section
    // Find "### Groups" and the last "### Tool Classes" section end
    updated = `${docContent}\n\n${startMarker}\n${lines.join("\n")}\n${endMarker}\n`;
  }

  writeFileSync(docsPath, updated);
  console.log(
    `Generated taxonomy docs tables for ${groups.length} groups, ${roles.length} roles, ${tasks.length} task types, ${capabilities.length} capabilities, ${modalities.length} modalities, ${toolClasses.length} tool classes.`,
  );
  console.log(`Updated: ${docsPath}`);
}

generate();
