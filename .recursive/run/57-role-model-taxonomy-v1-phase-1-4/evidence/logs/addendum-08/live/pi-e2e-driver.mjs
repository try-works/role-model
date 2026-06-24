import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const PI = "D:/pi/node_modules/.bin/pi.cmd";
const ENV = { ...process.env, PI_CODING_AGENT_DIR: "D:/pi/agent" };
const RUNTIME = "http://127.0.0.1:3456";

function rpc(command) {
  return new Promise((resolve) => {
    const child = spawn(PI, [
      "--mode", "rpc",
      "--model", "role-model/default.decision-only",
      "--no-tools",
      "-p", JSON.stringify(command),
    ], { env: ENV, shell: true });

    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ code: null, signal: "TIMEOUT", stdout: out, stderr: err });
    }, 30000);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      // Parse RPC response lines
      const lines = out.split("\n").filter(Boolean);
      const parsed = [];
      for (const line of lines) {
        try { parsed.push(JSON.parse(line)); } catch {}
      }
      resolve({ code, signal, stdout: out, stderr: err.replace(/.*DEP0190.*\n/g, "").trim(), parsed });
    });
  });
}

async function main() {
  console.log("=== Pi → Role-Model E2E Verification ===\n");
  
  // Step 1: Configure Pi to use role-model endpoint
  console.log("Step 1: Configure model...");
  const setModel = await rpc({
    id: "set-model",
    type: "request",
    command: "set_model",
    args: {
      id: "default.decision-only",
      name: "default.decision-only",
      api: "openai-completions",
      provider: "role-model",
      baseUrl: `${RUNTIME}/v1`,
    },
  });
  console.log("  Set model result:", setModel.code === 0 ? "OK" : `exit=${setModel.code} signal=${setModel.signal}`);
  if (setModel.parsed.length > 0) {
    const r = setModel.parsed[0];
    console.log("  Model:", r.data?.id, "| Provider:", r.data?.provider, "| Base:", r.data?.baseUrl);
  }

  // Step 2: Send classified prompts across different role families
  const prompts = [
    { prompt: "Review this diff for security risks and likely regressions.", expectedRole: "security" },
    { prompt: "Debug this failing deployment pipeline and fix the startup issue.", expectedRole: "operator" },
    { prompt: "Translate this technical document into Japanese.", expectedRole: "translator" },
    { prompt: "Write a job description for a senior platform engineer.", expectedRole: "recruiter" },
    { prompt: "What are the general exercise recommendations for improving sleep?", expectedRole: "health" },
    { prompt: "Estimate the ROI of migrating to this new infrastructure.", expectedRole: "finance" },
    { prompt: "Design a science experiment to test this hypothesis with controls.", expectedRole: "scientist" },
    { prompt: "Brainstorm catchy brand names and taglines for our new launch.", expectedRole: "creative" },
  ];

  const results = [];
  for (let i = 0; i < prompts.length; i++) {
    const { prompt, expectedRole } = prompts[i];
    console.log(`\nStep 2.${i + 1}: "${prompt.substring(0, 60)}..."`);
    const r = await rpc({
      id: `prompt-${i + 1}`,
      type: "request",
      command: "prompt",
      args: { prompt },
    });
    const status = r.code === 0 ? "OK" : `exit=${r.code} signal=${r.signal}`;
    const respLine = r.parsed.find(l => l.type === "response" && l.command === "prompt");
    console.log(`  Result: ${status} | Success: ${respLine?.success ?? "?"} | Stderr: ${r.stderr.substring(0, 80)}`);
    results.push({ prompt, expectedRole, exit: r.code, signal: r.signal, success: respLine?.success });
  }

  // Step 3: Check routing decisions for taxonomy metadata
  console.log("\n=== Step 3: Routing Decisions ===");
  const decisionsResp = await fetch(`${RUNTIME}/api/role-model/router/decisions?limit=${prompts.length + 2}`);
  const decisions = await decisionsResp.json();
  console.log("Decisions:", decisions.length);
  for (const d of decisions.slice(0, prompts.length + 2)) {
    console.log(`  ${d.requestId?.substring(0, 12)}... | Endpoint: ${d.selectedEndpointId} | Strategy: ${d.strategyLabel}`);
  }

  // Step 4: Get the latest request detail to verify normalized intent
  console.log("\n=== Step 4: Request Detail with Normalized Intent ===");
  const latestReqId = decisions[0]?.requestId;
  if (latestReqId) {
    const detailResp = await fetch(`${RUNTIME}/api/role-model/router/decisions/${latestReqId}`);
    const detail = await detailResp.json();
    if (detail.normalizedIntent) {
      console.log("  Role:", detail.normalizedIntent.role?.id);
      console.log("  Task:", detail.normalizedIntent.task?.id);
      console.log("  Taxonomy version:", detail.normalizedIntent.taxonomyVersion);
      console.log("  Classification contract:", detail.normalizedIntent.classificationContractVersion);
    }
    if (detail.telemetrySnapshot) {
      console.log("  Selected endpoint:", detail.telemetrySnapshot.selectedEndpointId);
      console.log("  Selected model:", detail.telemetrySnapshot.selectedModelId);
      console.log("  Cost savings:", detail.telemetrySnapshot.routingCostSavingsUsd?.toFixed(4));
    }
  }

  // Step 5: Check taxonomy manifest
  console.log("\n=== Step 5: Taxonomy Manifest ===");
  const manifestResp = await fetch(`${RUNTIME}/api/role-model/taxonomy/manifest`);
  const manifest = await manifestResp.json();
  console.log("  Version:", manifest.taxonomyVersion);
  console.log("  Groups:", manifest.entryCounts.groups);
  console.log("  Roles:", manifest.entryCounts.roles);
  console.log("  Task types:", manifest.entryCounts.taskTypes);

  // Save evidence
  writeFileSync(
    ".recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-08/live/pi-e2e-results.json",
    JSON.stringify({ results, decisions: decisions.slice(0, 8), manifest }, null, 2)
  );
  console.log("\n=== Evidence saved ===");
}

main().catch((e) => console.error("Fatal:", e.message));
