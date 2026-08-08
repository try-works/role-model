const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._-]+\b/g,
  /\bROLE_MODEL_CODEX_API_KEY\s*=\s*\S+/g,
  /\bsk-[A-Za-z0-9]{8,}\b/g,
] as const;

export function redactSecrets(text: string): string {
  let next = text;
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next;
}

export function containsRawSecret(text: string, secret: string): boolean {
  if (!secret || secret.length < 4) return false;
  return text.includes(secret);
}

export function assertNoSecretLeak(text: string, secrets: readonly string[]): void {
  for (const secret of secrets) {
    if (containsRawSecret(text, secret)) {
      throw new Error("Secret material would be printed to output.");
    }
  }
}

export function sanitizeDiagnosticLines(
  lines: readonly string[],
  secrets: readonly string[],
): string[] {
  return lines.map((line) => {
    assertNoSecretLeak(line, secrets);
    return redactSecrets(line);
  });
}
