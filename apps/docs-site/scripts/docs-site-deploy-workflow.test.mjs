import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "docs-site-deploy.yml");

test("docs deploy workflow skips gracefully when Cloudflare secrets are absent", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /Skipping docs deploy because Cloudflare secrets are not configured\./);
  assert.doesNotMatch(workflow, /exit 1/);
  assert.match(workflow, /if:\s*steps\.cloudflare_ready\.outputs\.ready == 'true'/);
});

test("docs deploy is a single main-only deployment even for manual runs", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /if:\s*github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /--project-name role-model-dev/);
  assert.match(workflow, /--branch main/);
  assert.match(workflow, /Verify docs deployment/);
  assert.match(workflow, /https:\/\/role-model\.dev\//);
  assert.doesNotMatch(workflow, /role-model-stage/);
  assert.doesNotMatch(workflow, /PAGES_BRANCH=\$\{\{ github\.ref_name \}\}/);
});
