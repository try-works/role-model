import type { ProviderAccountRecord } from "@role-model-router/provider-account";

export function looksLikeInlineApiKey(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^\$\{[A-Z0-9_]+\}$/.test(trimmed)) {
    return false;
  }
  return /^sk-[A-Za-z0-9_-]{8,}/.test(trimmed);
}

export function resolveEnvCredentialRef(
  value: string | null,
  fallbackName: string,
): ProviderAccountRecord["credentialRef"] {
  if (!value) {
    return {
      backend: "env",
      ref: fallbackName,
    };
  }
  const trimmed = value.trim();
  const envMatch = /^\$\{([A-Z0-9_]+)\}$/.exec(trimmed);
  if (envMatch?.[1]) {
    return {
      backend: "env",
      ref: envMatch[1],
    };
  }
  if (looksLikeInlineApiKey(trimmed)) {
    return {
      backend: "env",
      ref: fallbackName,
    };
  }
  return {
    backend: "env",
    ref: trimmed,
  };
}
