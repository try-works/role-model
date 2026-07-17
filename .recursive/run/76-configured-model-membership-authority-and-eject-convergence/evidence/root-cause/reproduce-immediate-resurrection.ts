import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createRuntimeBridgeBackend } from "../../../../../role-model-router/apps/runtime-host-bridge/src/index.ts";

process.env.MOONSHOT_API_KEY ??= "run76-placeholder-not-a-real-secret";

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run76-repro-"));
const scopeId = "run76-repro";

const backend = await createRuntimeBridgeBackend({
  repoRoot,
  fixtureRoot: path.join(repoRoot, "role-model-router/apps/runtime-host-bridge/test/fixtures"),
  runtimeStateRoot,
  scopeId,
});

try {
  await backend.upsertProviderAccount({
    providerAccountId: "moonshot.personal.primary",
    providerId: "moonshot",
    providerKind: "provider-openai",
    orgScope: "personal",
    accountScope: "workspace-default",
    credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
    authMode: "api-key-static",
    regionPolicy: { mode: "prefer", regions: ["global"] },
    baseUrlOverride: "https://api.moonshot.ai/v1",
    allowedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.7-code"],
    modelRoleBindings: [
      { modelId: "moonshot/kimi-k2.5", roleIds: ["general.chat"] },
      { modelId: "moonshot/kimi-k2.7-code", roleIds: ["coder"] },
    ],
    deniedModels: [],
    entitlementTags: ["chat"],
    budgetPolicyRef: "budget.default",
    quotaPolicyRef: "quota.default",
    status: "active",
    healthStatus: "healthy",
    rotationState: "stable",
  });

  await backend.activateEndpoint({
    providerAccountId: "moonshot.personal.primary",
    modelId: "moonshot/kimi-k2.5",
    region: "global",
  });

  const before = (await backend.listAccounts()).find(
    (account) => account.providerAccountId === "moonshot.personal.primary",
  );
  const removal = await backend.removeProviderAccountModel(
    "moonshot.personal.primary",
    "moonshot/kimi-k2.5",
  );
  const after = (await backend.listAccounts()).find(
    (account) => account.providerAccountId === "moonshot.personal.primary",
  );
  const endpoints = (await backend.listEndpoints()).filter(
    (endpoint) => endpoint.providerAccountId === "moonshot.personal.primary",
  );
  const manifest = JSON.parse(
    await readFile(path.join(runtimeStateRoot, scopeId, "operator-intent.json"), "utf8"),
  ) as {
    remoteActivations: Array<{ providerAccountId: string; modelId: string }>;
  };

  console.log(
    JSON.stringify(
      {
        before: before?.allowedModels,
        removal,
        after: after?.allowedModels,
        endpointModels: endpoints.map((endpoint) => endpoint.modelId),
        remoteActivations: manifest.remoteActivations.map((activation) => ({
          providerAccountId: activation.providerAccountId,
          modelId: activation.modelId,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await backend.shutdown();
  await rm(runtimeStateRoot, { recursive: true, force: true });
}
