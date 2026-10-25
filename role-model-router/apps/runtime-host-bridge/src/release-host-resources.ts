/**
 * s87a: ONE release order for the CLI host resources. This is deliberately not acquisition
 * restructuring and not a Layer: callers still own acquisition; this only makes release ordered,
 * total (every attempt runs), observable (errors are collected), and idempotent per release function.
 */
export interface HostReleaseResources {
  readonly server?: () => Promise<void>;
  readonly packagedRuntime?: () => Promise<void>;
  readonly backend?: () => Promise<void>;
  readonly extensionRuntimeOwner?: () => Promise<void>;
  readonly extensionRuntime?: () => Promise<void>;
}

export interface HostReleaseError {
  readonly error: unknown;
  readonly step: string;
}

export interface HostReleaseResult {
  readonly errors: readonly HostReleaseError[];
  readonly released: readonly string[];
}

const alreadyReleased = new WeakSet<() => Promise<void>>();

const releaseStep = async (
  step: string,
  release: (() => Promise<void>) | undefined,
  result: { errors: HostReleaseError[]; released: string[] },
): Promise<void> => {
  if (release === undefined || alreadyReleased.has(release)) return;
  alreadyReleased.add(release);
  try {
    await release();
    result.released.push(step);
  } catch (error) {
    result.errors.push({ error, step });
  }
};

export const releaseHostResources = async (
  resources: HostReleaseResources,
  onError?: (failure: HostReleaseError) => void,
): Promise<HostReleaseResult> => {
  const result: { errors: HostReleaseError[]; released: string[] } = { errors: [], released: [] };
  const attempt = async (step: string, release: (() => Promise<void>) | undefined): Promise<void> => {
    const before = result.errors.length;
    await releaseStep(step, release, result);
    if (result.errors.length > before) onError?.(result.errors[result.errors.length - 1] as HostReleaseError);
  };
  await attempt("server", resources.server);
  if (resources.packagedRuntime !== undefined) await attempt("packaged", resources.packagedRuntime);
  else await attempt("backend", resources.backend);
  if (resources.extensionRuntimeOwner !== undefined) await attempt("extensionRuntimeOwner", resources.extensionRuntimeOwner);
  else await attempt("extension", resources.extensionRuntime);
  return result;
};
