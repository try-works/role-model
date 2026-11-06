/**
 * Run 115 R37 (S650 wave 7): packaged UI cutover/rollback.
 *
 * A release carries BOTH shells for one release: the Foldkit shell at
 * build/shells/foldkit and the matched old React shell at build/shells/react.
 * build/client is a materialized selection of exactly one shell, so switching is
 * reversible by re-running selectShell and does not touch state.json or the
 * runtime database.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const REGISTRY = "build/ui-shells.json";
const SHELLS = { foldkit: "build/shells/foldkit", react: "build/shells/react" };
const DOCS_SITE = "fumadocs-react-retained-exception";

const writeRegistry = (releaseDir, registry) => {
  mkdirSync(path.join(releaseDir, "build"), { recursive: true });
  const target = path.join(releaseDir, REGISTRY);
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  renameSync(temporary, target);
};

export function assertShellRegistry(registry) {
  if (registry?.schemaVersion !== "role-model.ui-shells.v1") {
    throw new Error("UI shell registry schemaVersion is missing or unsupported");
  }
  if (registry.active !== "foldkit" && registry.active !== "react") {
    throw new Error(`UI shell registry active shell is invalid: ${String(registry.active)}`);
  }
  for (const key of Object.keys(SHELLS)) {
    if (registry.shells?.[key] !== SHELLS[key]) {
      throw new Error(`UI shell registry is missing the ${key} shell path`);
    }
  }
  if (typeof registry.retainedReactRelease !== "string" || registry.retainedReactRelease.length === 0) {
    throw new Error("UI shell registry must retain the matched React release for one release");
  }
  if (typeof registry.stateSchemaVersion !== "string" || registry.stateSchemaVersion.length === 0) {
    throw new Error("UI shell registry must record the persisted-state schema version");
  }
  if (registry.docsSite !== DOCS_SITE) {
    throw new Error("UI shell registry must record the Fumadocs/React docs-site exception");
  }
  return registry;
}

export function selectShell({ releaseDir, shell }) {
  const registryPath = path.join(releaseDir, REGISTRY);
  if (!existsSync(registryPath)) throw new Error("UI shell registry is missing");
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const shellPath = registry.shells?.[shell];
  if (shellPath === undefined) throw new Error(`unknown UI shell "${String(shell)}"`);
  const source = path.join(releaseDir, shellPath);
  if (!existsSync(source)) throw new Error(`UI shell artifact is missing: ${source}`);
  const client = path.join(releaseDir, "build", "client");
  const temporary = path.join(releaseDir, "build", `.client-${process.pid}.tmp`);
  const previous = path.join(releaseDir, "build", ".client-previous");
  rmSync(temporary, { recursive: true, force: true });
  cpSync(source, temporary, { recursive: true });
  if (existsSync(client)) {
    rmSync(previous, { recursive: true, force: true });
    renameSync(client, previous);
  }
  renameSync(temporary, client);
  const next = { ...registry, active: shell };
  writeRegistry(releaseDir, next);
  rmSync(previous, { recursive: true, force: true });
  return next;
}

export function stageShells({
  releaseDir,
  foldkitRoot,
  reactRoot,
  releaseId,
  stateSchemaVersion,
}) {
  for (const [name, source] of [["foldkit", foldkitRoot], ["react", reactRoot]]) {
    if (!existsSync(source)) throw new Error(`${name} UI shell source is missing: ${source}`);
    const destination = path.join(releaseDir, SHELLS[name]);
    rmSync(destination, { recursive: true, force: true });
    cpSync(source, destination, { recursive: true });
  }
  const registry = {
    schemaVersion: "role-model.ui-shells.v1",
    releaseId,
    active: "foldkit",
    shells: { ...SHELLS },
    retainedReactRelease: releaseId,
    stateSchemaVersion,
    docsSite: DOCS_SITE,
    docsSiteArtifact:
      "not-staged-in-runtime-release; Fumadocs/React docs remain a separate deployment (explicit exception)",
    rollback: 'selectShell({ releaseDir, shell: "react" }) then restart the candidate; state.json and the runtime database are untouched.',
  };
  assertShellRegistry(registry);
  writeRegistry(releaseDir, registry);
  selectShell({ releaseDir, shell: "foldkit" });
  return registry;
}

const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const releaseDir = path.resolve(flag("--release") ?? "");
  const shell = flag("--select");
  if (shell) {
    if (!flag("--release")) throw new Error("--release <dir> is required");
    console.log(JSON.stringify({ status: "PASS", registry: selectShell({ releaseDir, shell }) }, null, 2));
  } else {
    throw new Error("usage: package-ui-shell.mjs --release <dir> --select <foldkit|react>");
  }
}
