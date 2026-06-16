import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  credentialRefFileExists,
  resolveOauthCredentialFilePath,
  resolveOauthCredentialRef,
} from "./oauth-credential.js";

describe("oauth-credential", () => {
  it("resolves unified litellm token path when account-specific file is absent", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "oauth-credential-"));
    const scopeId = "scope-a";
    const location = { runtimeStateRoot, scopeId };

    try {
      const unifiedRef = "oauth/moonshot/moonshot.litellm";
      const unifiedPath = resolveOauthCredentialFilePath(location, unifiedRef);
      mkdirSync(path.dirname(unifiedPath), { recursive: true });
      writeFileSync(
        unifiedPath,
        JSON.stringify({ access_token: "token-value", saved_at_ms: Date.now() }),
      );

      const resolved = resolveOauthCredentialRef(
        location,
        "moonshot",
        "moonshot.personal.kimi-code",
      );
      expect(resolved).toEqual({
        backend: "local-file",
        ref: unifiedRef,
      });
      expect(credentialRefFileExists(location, unifiedRef)).toBe(true);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  it("prefers existing credentialRef when its file exists", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "oauth-credential-pref-"));
    const scopeId = "scope-b";
    const location = { runtimeStateRoot, scopeId };
    const preferredRef = "oauth/moonshot/moonshot.personal.kimi-code";

    try {
      const preferredPath = resolveOauthCredentialFilePath(location, preferredRef);
      mkdirSync(path.dirname(preferredPath), { recursive: true });
      writeFileSync(
        preferredPath,
        JSON.stringify({ access_token: "account-token", saved_at_ms: Date.now() }),
      );

      const resolved = resolveOauthCredentialRef(
        location,
        "moonshot",
        "moonshot.personal.kimi-code",
        {
          backend: "local-file",
          ref: preferredRef,
        },
      );
      expect(resolved?.ref).toBe(preferredRef);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
