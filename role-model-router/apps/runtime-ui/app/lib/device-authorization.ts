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
