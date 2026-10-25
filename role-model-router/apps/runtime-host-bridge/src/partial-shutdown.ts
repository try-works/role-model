/**
 * Run 115 S117 (R27): partial shutdown.
 *
 * R27 requires a failed start to release everything already started, in reverse start order, and
 * to report the failure. The runtime must not leak a half-started host because one acquisition
 * threw, and a release that itself fails must not stop the remaining releases.
 *
 * This is the DAG-level behaviour twin of releaseHostResources: that module owns the ORDER of a
 * complete host release; this owns rollback of a partial start.
 */

export interface ShutdownOwner<T = unknown> {
  readonly kind: string;
  readonly acquire: () => Promise<T>;
  readonly release: (resource: T) => Promise<void>;
}

export interface RollbackError {
  readonly error: Error;
  readonly kind: string;
}

export interface PartialShutdownSuccess<T = unknown> {
  readonly ok: true;
  readonly release: () => Promise<{ errors: readonly RollbackError[]; released: readonly string[] }>;
  readonly resources: readonly { kind: string; resource: T }[];
}

export interface PartialShutdownFailure {
  readonly error: Error;
  readonly failedAt: string;
  readonly ok: false;
  readonly released: readonly string[];
  readonly rollbackErrors: readonly RollbackError[];
}

const asError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

export const acquireWithPartialShutdown = async <T = unknown>(
  owners: readonly ShutdownOwner<T>[],
): Promise<PartialShutdownSuccess<T> | PartialShutdownFailure> => {
  const acquired: { kind: string; release: (resource: T) => Promise<void>; resource: T }[] = [];

  const rollback = async (): Promise<{ errors: RollbackError[]; released: string[] }> => {
    const errors: RollbackError[] = [];
    const released: string[] = [];
    // Reverse start order: the newest owner is torn down first.
    for (const entry of [...acquired].reverse()) {
      try {
        await entry.release(entry.resource);
        released.push(entry.kind);
      } catch (error) {
        errors.push({ error: asError(error), kind: entry.kind });
      }
    }
    acquired.length = 0;
    return { errors, released };
  };

  for (const owner of owners) {
    try {
      const resource = await owner.acquire();
      acquired.push({ kind: owner.kind, release: owner.release, resource });
    } catch (error) {
      const rolled = await rollback();
      return {
        error: asError(error),
        failedAt: owner.kind,
        ok: false,
        released: rolled.released,
        rollbackErrors: rolled.errors,
      };
    }
  }

  return {
    ok: true,
    release: rollback,
    resources: acquired.map((entry) => ({ kind: entry.kind, resource: entry.resource })),
  };
};
