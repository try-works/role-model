/**
 * R37 packaged HTTP probe: start the packaged executable with the selected
 * build/client and assert the served index is the selected shell.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};
const releaseRoot = path.resolve(flag("--release") ?? "");
const shell = flag("--shell");
if (!releaseRoot || !shell) throw new Error("--release <dir> --shell <foldkit|react> required");
const executable = path.join(releaseRoot, JSON.parse(readFileSync(path.join(releaseRoot, "manifest.json"), "utf8")).executable);
const registry = JSON.parse(readFileSync(path.join(releaseRoot, "build/ui-shells.json"), "utf8"));
if (registry.active !== shell) throw new Error(`release active shell is ${registry.active}, expected ${shell}`);
if (!existsSync(executable)) throw new Error(`executable missing: ${executable}`);
const port = await new Promise((resolve) => {
  const server = net.createServer();
  server.once("listening", () => {
    const address = server.address();
    server.close(() => resolve(typeof address === "object" && address !== null ? address.port : 0));
  });
  server.listen(0, "127.0.0.1");
});
const stateRoot = mkdtempSync(path.join(os.tmpdir(), "r37-http-state-"));
const child = spawn(executable, ["--repo-root", releaseRoot, "--runtime-state-root", stateRoot, "--host", "127.0.0.1", "--port", String(port), "--static-root", path.join(releaseRoot, "build/client")], { stdio: "ignore" });
const cleanup = async () => {
  if (!child.killed) child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  rmSync(stateRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
};
try {
  let html = "";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) {
        html = await response.text();
        if (html.length > 0) break;
      }
    } catch {}
  }
  if (html.length === 0) throw new Error("packaged shell did not serve an index");
  const expected = shell === "react" ? "entry.client" : "assets/main.js";
  if (!html.includes(expected)) throw new Error(`served index is not the ${shell} shell (missing ${expected})`);
  console.log(JSON.stringify({ status: "PASS", shell, port, indexMarker: expected, htmlBytes: html.length }, null, 2));
} finally {
  await cleanup();
}
