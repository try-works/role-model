#!/usr/bin/env node
/**
 * Seed the review benchmark provider accounts and endpoints through the live host API.
 *
 * The host owns endpoint activation: writing telemetry rows or runtime_endpoints directly is
 * not enough because a config mutation reconciles those tables. This companion posts three
 * non-secret provider accounts (oauth2-device-code so admission does not probe a credential)
 * and activates one endpoint per account, then asserts GET /api/role-model/endpoints.
 *
 * Usage:
 *   node scripts/runtime/dev/seed-review-benchmark-endpoints.mjs --url http://127.0.0.1:3480
 */

export const REVIEW_ACCOUNTS = [
  { providerAccountId: "review.subject.alpha", allowedModels: ["chatgpt/gpt-5.4"] },
  { providerAccountId: "review.subject.beta", allowedModels: ["chatgpt/gpt-5.4-mini"] },
  { providerAccountId: "review.judge", allowedModels: ["chatgpt/gpt-5.5"] },
];

export const REVIEW_ENDPOINT_REQUESTS = [
  { providerAccountId: "review.subject.alpha", modelId: "chatgpt/gpt-5.4", region: "us-east-1" },
  {
    providerAccountId: "review.subject.beta",
    modelId: "chatgpt/gpt-5.4-mini",
    region: "us-east-1",
  },
  { providerAccountId: "review.judge", modelId: "chatgpt/gpt-5.5", region: "us-east-1" },
];

const accountBody = (account) => ({
  providerAccountId: account.providerAccountId,
  providerId: "openai",
  providerKind: "provider-openai",
  orgScope: "personal",
  accountScope: "workspace-default",
  credentialRef: { backend: "local-file", ref: `review/openai/${account.providerAccountId}` },
  authMode: "oauth2-device-code",
  regionPolicy: { mode: "prefer", regions: ["us-east-1"] },
  baseUrlOverride: null,
  allowedModels: account.allowedModels,
  modelRoleBindings: [],
  deniedModels: [],
  entitlementTags: ["chat"],
  budgetPolicyRef: "budget.default",
  quotaPolicyRef: "quota.default",
  status: "active",
  healthStatus: "healthy",
  rotationState: "stable",
});

const post = async (url, body) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
};

export async function seedReviewEndpoints(baseUrl) {
  const results = [];
  for (const account of REVIEW_ACCOUNTS) {
    results.push({
      kind: "account",
      id: account.providerAccountId,
      ...(await post(`${baseUrl}/api/role-model/accounts`, accountBody(account))),
    });
  }
  for (const request of REVIEW_ENDPOINT_REQUESTS) {
    results.push({
      kind: "endpoint",
      id: request.providerAccountId,
      ...(await post(`${baseUrl}/api/role-model/endpoints`, request)),
    });
  }
  const response = await fetch(`${baseUrl}/api/role-model/endpoints`);
  const endpoints = await response.json();
  if (!Array.isArray(endpoints))
    throw new Error("GET /api/role-model/endpoints did not return an array");
  const review = endpoints.filter((entry) => String(entry.endpointId ?? "").startsWith("review."));
  const judge = review.find((entry) => entry.endpointId.startsWith("review.judge"));
  const subjects = review.filter((entry) => entry.endpointId.startsWith("review.subject"));
  if (review.length < 3)
    throw new Error(`expected at least 3 review endpoints, got ${review.length}`);
  if (judge === undefined) throw new Error("dedicated judge endpoint is missing");
  if (subjects.some((entry) => entry.endpointId === judge.endpointId))
    throw new Error("judge endpoint overlaps a subject");
  if (
    review.some((entry) => entry.benchmarkEligible !== true || entry.healthStatus !== "healthy")
  ) {
    throw new Error("review endpoints must be healthy and benchmark-eligible");
  }
  return {
    liveCount: endpoints.length,
    reviewCount: review.length,
    reviewEndpointIds: review.map((entry) => entry.endpointId),
    results,
  };
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
if (isMain) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--url");
  const baseUrl = (at < 0 ? "http://127.0.0.1:3480" : args[at + 1]).replace(/\/$/u, "");
  const result = await seedReviewEndpoints(baseUrl);
  console.log(JSON.stringify({ baseUrl, ...result }, null, 2));
}
