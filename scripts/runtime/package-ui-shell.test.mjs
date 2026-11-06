/**
 * Run 115 R37 (S650 wave 7): packaged UI cutover/rollback.
 *
 * RED at HEAD: there is no selector, no retained React shell, and no state-compatibility
 * registry. The packaged release serves exactly one build/client.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertShellRegistry,
  selectShell,
  stageShells,
} from "./package-ui-shell.mjs";

test("stageShells retains both shells and marks the old React artifact for one release", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "r37-shells-"));
  try {
    const foldkit = path.join(root, "foldkit");
    const react = path.join(root, "react");
    cpSync(path.join(process.cwd(), "testdata", "router-runtime", "fixtures"), foldkit, { recursive: true });
    cpSync(path.join(process.cwd(), "testdata", "router-runtime", "fixtures"), react, { recursive: true });
    writeFileSync(path.join(foldkit, "index.html"), "<html>foldkit</html>");
    writeFileSync(path.join(react, "index.html"), "<html>react</html>");
    const release = path.join(root, "release");
    const registry = stageShells({
      releaseDir: release,
      foldkitRoot: foldkit,
      reactRoot: react,
      releaseId: "0.0.20-test",
      stateSchemaVersion: "role-model.runtime-state.v1",
    });
    assert.equal(registry.active, "foldkit");
    assert.equal(registry.shells.foldkit, "build/shells/foldkit");
    assert.equal(registry.shells.react, "build/shells/react");
    assert.equal(registry.retainedReactRelease, "0.0.20-test");
    assert.equal(registry.docsSite, "fumadocs-react-retained-exception");
    assert.equal(readFileSync(path.join(release, "build/client/index.html"), "utf8"), "<html>foldkit</html>");
    assertShellRegistry(registry);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("selecting React and back is reversible and preserves non-UI state", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "r37-select-"));
  try {
    const foldkit = path.join(root, "foldkit");
    const react = path.join(root, "react");
    cpSync(path.join(process.cwd(), "testdata", "router-runtime", "fixtures"), foldkit, { recursive: true });
    cpSync(path.join(process.cwd(), "testdata", "router-runtime", "fixtures"), react, { recursive: true });
    writeFileSync(path.join(foldkit, "index.html"), "<html>foldkit</html>");
    writeFileSync(path.join(react, "index.html"), "<html>react</html>");
    const release = path.join(root, "release");
    stageShells({
      releaseDir: release,
      foldkitRoot: foldkit,
      reactRoot: react,
      releaseId: "0.0.20-test",
      stateSchemaVersion: "role-model.runtime-state.v1",
    });
    writeFileSync(path.join(release, "state.json"), '{"pending":1}');
    selectShell({ releaseDir: release, shell: "react" });
    assert.equal(readFileSync(path.join(release, "build/client/index.html"), "utf8"), "<html>react</html>");
    assert.equal(JSON.parse(readFileSync(path.join(release, "build/ui-shells.json"), "utf8")).active, "react");
    assert.equal(readFileSync(path.join(release, "state.json"), "utf8"), '{"pending":1}');
    selectShell({ releaseDir: release, shell: "foldkit" });
    assert.equal(readFileSync(path.join(release, "build/client/index.html"), "utf8"), "<html>foldkit</html>");
    assert.equal(JSON.parse(readFileSync(path.join(release, "build/ui-shells.json"), "utf8")).active, "foldkit");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unknown shell is rejected instead of silently serving the old build", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "r37-unknown-"));
  try {
    const release = path.join(root, "release");
    cpSync(path.join(process.cwd(), "testdata", "router-runtime", "fixtures"), path.join(root, "shell"), { recursive: true });
    writeFileSync(path.join(root, "shell/index.html"), "<html>x</html>");
    stageShells({
      releaseDir: release,
      foldkitRoot: path.join(root, "shell"),
      reactRoot: path.join(root, "shell"),
      releaseId: "0.0.20-test",
      stateSchemaVersion: "role-model.runtime-state.v1",
    });
    assert.throws(() => selectShell({ releaseDir: release, shell: "svelte" }), /unknown UI shell/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

