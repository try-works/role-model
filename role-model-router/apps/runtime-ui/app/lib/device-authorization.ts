import type { RuntimeDeviceAuthorization } from "./runtime-api";

const DEFAULT_POLL_DELAY_MS = 5_000;

function normalizeUrl(value?: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveVerificationWindowUrl(session: RuntimeDeviceAuthorization): string | null {
  return normalizeUrl(session.verificationUriComplete) ?? normalizeUrl(session.verificationUri);
}

export function shouldAutoPollDeviceAuthorization(session: RuntimeDeviceAuthorization | null): boolean {
  return Boolean(session?.authRequestId) && session?.status === "pending";
}

export function getDeviceAuthorizationPollDelayMs(session: RuntimeDeviceAuthorization): number {
  if (typeof session.intervalSeconds === "number" && Number.isFinite(session.intervalSeconds) && session.intervalSeconds > 0) {
    return session.intervalSeconds * 1_000;
  }

  return DEFAULT_POLL_DELAY_MS;
}

export async function syncConnectedDeviceAuthorizationEndpoints(input: {
  readonly session: RuntimeDeviceAuthorization;
  readonly selectedModels: readonly string[];
  readonly activateEndpoint: (payload: {
    providerAccountId: string;
    modelId: string;
    region: string;
  }) => Promise<unknown>;
  readonly region?: string;
}): Promise<void> {
  if (input.session.status !== "connected") {
    return;
  }

  const providerAccountId = input.session.providerAccountId.trim();
  if (providerAccountId.length === 0) {
    return;
  }

  const selectedModels = [...new Set(input.selectedModels.map((value) => value.trim()).filter((value) => value.length > 0))];
  if (selectedModels.length === 0) {
    return;
  }

  const region = normalizeUrl(input.region) ?? "global";
  await Promise.all(
    selectedModels.map((modelId) =>
      input.activateEndpoint({
        providerAccountId,
        modelId,
        region,
      }),
    ),
  );
}
