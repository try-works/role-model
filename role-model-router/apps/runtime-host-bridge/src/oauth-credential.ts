import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface OauthCredentialLocation {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface ResolvedOauthCredentialRef {
  readonly backend: "local-file";
  readonly ref: string;
}

function sanitizeSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureNonEmptyString(value: string, label: string): string {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export function resolveOauthCredentialFilePath(
  location: OauthCredentialLocation,
  credentialRef: string,
): string {
  const runtimeStateRoot = ensureNonEmptyString(location.runtimeStateRoot, "runtimeStateRoot");
  const scopeId = ensureNonEmptyString(location.scopeId, "scopeId");
  const safeSegments = credentialRef
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .map(sanitizeSegment);
  return `${path.join(runtimeStateRoot, scopeId, "credentials", ...safeSegments)}.json`;
}

export function credentialRefFileExists(
  location: OauthCredentialLocation,
  credentialRef: string,
): boolean {
  return existsSync(resolveOauthCredentialFilePath(location, credentialRef));
}

function readStoredAccessToken(payload: Record<string, unknown> | null): string {
  return typeof payload?.access_token === "string" ? payload.access_token.trim() : "";
}

function readStoredRefreshToken(payload: Record<string, unknown> | null): string {
  return typeof payload?.refresh_token === "string" ? payload.refresh_token.trim() : "";
}

function credentialRefHasToken(
  location: OauthCredentialLocation,
  credentialRef: string,
): boolean {
  if (!credentialRefFileExists(location, credentialRef)) {
    return false;
  }
  try {
    const payload = JSON.parse(
      readFileSync(resolveOauthCredentialFilePath(location, credentialRef), "utf8"),
    ) as Record<string, unknown>;
    return (
      readStoredAccessToken(payload).length > 0 || readStoredRefreshToken(payload).length > 0
    );
  } catch {
    return false;
  }
}

export function resolveOauthCredentialRef(
  location: OauthCredentialLocation,
  providerId: string,
  providerAccountId: string,
  existingCredentialRef?: { readonly backend: string; readonly ref: string },
): ResolvedOauthCredentialRef | null {
  const candidates: string[] = [];
  if (
    existingCredentialRef &&
    (existingCredentialRef.backend === "local-file" ||
      existingCredentialRef.backend === "local-encrypted-file")
  ) {
    candidates.push(existingCredentialRef.ref);
  }
  candidates.push(
    `oauth/${sanitizeSegment(providerId)}/${sanitizeSegment(providerAccountId)}`,
    `oauth/${sanitizeSegment(providerId)}/${sanitizeSegment(providerId)}.litellm`,
  );

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    if (credentialRefHasToken(location, candidate)) {
      return {
        backend: "local-file",
        ref: candidate,
      };
    }
  }

  return null;
}
