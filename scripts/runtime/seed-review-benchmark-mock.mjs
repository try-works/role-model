#!/usr/bin/env node
/**
 * Seed the four mock benchmark accounts/endpoints through the live host API.
 * The host must be started with MOCK_API_KEY set (non-secret fixture credential).
 */
const args = process.argv.slice(2);
const value = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const baseUrl = value("--url", "http://127.0.0.1:3480").replace(/\/$/u, "");
const healthy = value("--healthy", "http://127.0.0.1:3490/v1");
const failing = value("--failing", "http://127.0.0.1:3491/v1");

export const MOCK_ACCOUNTS = [
  { id: "mock.subject.alpha", base: healthy },
  { id: "mock.subject.beta", base: healthy },
  { id: "mock.judge", base: healthy },
  { id: "mock.fail", base: failing },
];

const accountBody = (entry) => ({
  providerAccountId: entry.id,
  providerId: "openai",
  providerKind: "provider-openai",
  orgScope: "personal",
  accountScope: "workspace-default",
  credentialRef: { backend: "env", ref: "MOCK_API_KEY" },
  authMode: "api-key-static",
  regionPolicy: { mode: "prefer", regions: ["us-east-1"] },
  baseUrlOverride: entry.base,
  allowedModels: ["openai/gpt-4.1-mini-fast"],
  modelRoleBindings: [],
  deniedModels: [],
  entitlementTags: ["chat"],
  budgetPolicyRef: "budget.default",
  quotaPolicyRef: "quota.default",
  status: "active",
  healthStatus: "healthy",
  rotationState: "stable",
});

const post = async (path, body) => {
  const response = await fetch(baseUrl + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text.length > 0 ? JSON.parse(text) : null };
};

const results = [];
for (const account of MOCK_ACCOUNTS) results.push({ kind: "account", id: account.id, ...(await post("/api/role-model/accounts", accountBody(account))) });
for (const account of MOCK_ACCOUNTS) results.push({ kind: "endpoint", id: account.id, ...(await post("/api/role-model/endpoints", { providerAccountId: account.id, modelId: "openai/gpt-4.1-mini-fast", region: "us-east-1" })) });
const endpoints = await (await fetch(baseUrl + "/api/role-model/endpoints")).json();
const mock = endpoints.filter((entry) => String(entry.endpointId ?? "").startsWith("mock."));
if (mock.length < 4) throw new Error("expected 4 mock endpoints, got " + mock.length);
if (mock.some((entry) => entry.healthStatus !== "healthy" || entry.benchmarkEligible !== true)) throw new Error("mock endpoints are not all healthy/benchmark-eligible");
console.log(JSON.stringify({ baseUrl, accounts: MOCK_ACCOUNTS.map((entry) => entry.id), endpoints: mock.map((entry) => ({ endpointId: entry.endpointId, modelId: entry.modelId, healthStatus: entry.healthStatus, benchmarkEligible: entry.benchmarkEligible })), results }, null, 2));
