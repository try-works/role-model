import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveAdapterStateDir } from "./codex-paths.js";

export interface AdapterState {
  pid: number;
  host: string;
  port: number;
  startedAt: string;
}

export function adapterLockPath(stateDir: string): string {
  return join(stateDir, "adapter.lock.json");
}

export function adapterPidPath(stateDir: string): string {
  return join(stateDir, "adapter.pid");
}

export async function writeAdapterState(stateDir: string, state: AdapterState): Promise<void> {
  await mkdir(stateDir, { recursive: true });
  await writeFile(adapterLockPath(stateDir), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await writeFile(adapterPidPath(stateDir), `${state.pid}\n`, "utf8");
}

export async function readAdapterState(stateDir: string): Promise<AdapterState | null> {
  try {
    const raw = await readFile(adapterLockPath(stateDir), "utf8");
    return JSON.parse(raw) as AdapterState;
  } catch {
    return null;
  }
}

export async function clearAdapterState(stateDir: string): Promise<void> {
  await rm(adapterLockPath(stateDir), { force: true });
  await rm(adapterPidPath(stateDir), { force: true });
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
