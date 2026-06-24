// Drive the runtime with Pi-simulated requests across all 28 roles and 5 aliases
// Each request includes role_model.intent as the pi-role-model extension would inject

const RUNTIME = "http://127.0.0.1:3456";

const ALIASES = [
  "default.decision-only",
  "difficulty.remote-only", 
  "baseline.hybrid",
  "controller.decision-only",
  "hybrid.decision-only",
];

// One prompt per role, designed to trigger that role's classifier signals
const ROLE_PROMPTS = [
  { role: "coder", task: "coder.edit", prompt: "Implement a function to validate email addresses and add unit tests." },
  { role: "architect", task: "architect.design", prompt: "Design the API contract and data model for our new payments service." },
  { role: "security", task: "security.audit", prompt: "Review this authentication flow for security vulnerabilities and privilege escalation risks." },
  { role: "researcher", task: "researcher.web_research.current", prompt: "Find the latest documentation on React 19 server components and cite sources." },
  { role: "writer", task: "writer.docs.write", prompt: "Write clear API documentation for our new endpoint with examples." },
  { role: "operator", task: "operator.debug.startup", prompt: "Debug this failing deployment script — it crashes on startup with a port conflict." },
  { role: "analyst", task: "analyst.compare", prompt: "Compare these three cloud providers on cost, performance, and reliability and rank them." },
  { role: "planner", task: "planner.roadmap", prompt: "Create a milestone roadmap for migrating our monolith to microservices with acceptance criteria." },
  { role: "tester", task: "tester.e2e", prompt: "Write end-to-end tests for the user registration flow covering happy path and edge cases." },
  { role: "data", task: "data.schema.review", prompt: "Review this database schema for normalization issues and suggest indexing improvements." },
  { role: "product", task: "product.requirements", prompt: "Write product requirements for a collaborative whiteboard feature with user stories." },
  { role: "designer", task: "designer.ui.review", prompt: "Review this UI mockup for accessibility issues and visual hierarchy problems." },
  { role: "support", task: "support.ticket.reply", prompt: "Draft a helpful reply to this customer who's having trouble connecting their account." },
  { role: "legal", task: "legal.review", prompt: "Review this privacy policy for GDPR compliance and flag any risky clauses." },
  { role: "finance", task: "finance.cost_estimate", prompt: "Estimate the total cost of ownership for migrating to AWS including reserved instances." },
  { role: "creative", task: "creative.brainstorm", prompt: "Brainstorm 10 catchy brand names and taglines for our new AI-powered productivity app." },
  { role: "educator", task: "educator.lesson.plan", prompt: "Create a lesson plan for teaching Python decorators to intermediate developers." },
  { role: "translator", task: "translator.translate", prompt: "Translate this technical error message into Japanese, adapting tone for end users." },
  { role: "marketer", task: "marketer.content.seo", prompt: "Write SEO-optimized landing page copy targeting enterprise DevOps teams." },
  { role: "seller", task: "seller.outreach.write", prompt: "Draft a cold outreach email for enterprise prospects highlighting our security features." },
  { role: "recruiter", task: "recruiter.job_description", prompt: "Write a job description for a senior platform engineer with Kubernetes experience." },
  { role: "procurement", task: "procurement.vendor.compare", prompt: "Compare these vendor proposals on pricing, SLA, and security and build a scorecard." },
  { role: "coordinator", task: "coordinator.meeting.agenda", prompt: "Prepare an agenda and decision log template for the quarterly architecture review." },
  { role: "knowledge", task: "knowledge.organize", prompt: "Organize these meeting notes into a structured knowledge base with cross-references." },
  { role: "strategist", task: "strategist.market.analyze", prompt: "Analyze our market position against competitors and recommend a GTM strategy." },
  { role: "mathematician", task: "mathematician.solve", prompt: "Solve this optimization problem: maximize throughput under latency constraints, show steps." },
  { role: "scientist", task: "scientist.experiment.design", prompt: "Design a controlled experiment to test whether our new caching strategy reduces latency." },
  { role: "health", task: "health.info.general", prompt: "What are the evidence-based exercise recommendations for improving cardiovascular health?" },
];

async function sendRequest(alias, { role, task, prompt }) {
  const body = {
    model: alias,
    messages: [{ role: "user", content: prompt }],
    role_model: {
      contract_version: 1,
      intent: {
        role_hint_id: role,
        task_type: task,
        task_action: task.split(".").slice(1).join("."),
        role_source: "heuristic",
        task_source: "heuristic",
        confidence: 0.65,
        taxonomy_version: "1.0.0-alpha.1",
        content_revision: "taxonomy-v1-alpha.1",
        classification_contract_version: "role-model.classification.v1",
        evidence: [`Pi classified prompt as ${role}/${task} using group-first progressive disclosure.`],
      },
    },
  };

  const start = Date.now();
  const resp = await fetch(`${RUNTIME}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return {
    alias,
    role,
    task,
    prompt: prompt.substring(0, 50),
    model: data.model,
    content: data.choices?.[0]?.message?.content?.substring(0, 60) || "(empty)",
    tokens: data.usage?.total_tokens || 0,
    latencyMs: Date.now() - start,
    status: resp.status,
  };
}

async function getTelemetry(limit = 50) {
  const resp = await fetch(`${RUNTIME}/api/role-model/router/decisions?limit=${limit}`);
  return resp.json();
}

async function getSummary() {
  const resp = await fetch(`${RUNTIME}/api/role-model/router/summary`);
  return resp.json();
}

async function main() {
  console.log("=== Role-Model Taxonomy E2E: 28 Roles × 5 Aliases ===\n");
  
  const allResults = [];
  
  for (const alias of ALIASES) {
    console.log(`\n--- Alias: ${alias} ---`);
    const aliasResults = [];
    for (const rp of ROLE_PROMPTS) {
      const result = await sendRequest(alias, rp);
      aliasResults.push(result);
      const icon = result.status === 200 ? "✓" : "✗";
      console.log(`  ${icon} ${rp.role.padEnd(14)} → ${result.model?.substring(0,25).padEnd(25)} | ${result.tokens}t | ${result.content.substring(0,40)}`);
    }
    allResults.push({ alias, results: aliasResults });
    // Brief pause between aliases
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Telemetry summary
  console.log("\n\n=== TELEMETRY SUMMARY ===");
  const summary = await getSummary();
  console.log(`Strategy: ${summary.strategy} | Mode: ${summary.executionMode}`);
  console.log(`Total decisions: ${summary.recentDecisionCount}`);
  
  const decisions = await getTelemetry(150);
  console.log(`\nDecision rows: ${decisions.length}`);
  
  // Group by alias
  const byAlias = {};
  const byEndpoint = {};
  const byRole = {};
  for (const d of decisions) {
    const alias = d.requestedModelId || "unknown";
    const ep = d.selectedEndpointId || "unknown";
    byAlias[alias] = (byAlias[alias] || 0) + 1;
    byEndpoint[ep] = (byEndpoint[ep] || 0) + 1;
  }
  
  console.log("\n--- Requests by alias ---");
  for (const [alias, count] of Object.entries(byAlias).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${alias}: ${count}`);
  }
  
  console.log("\n--- Requests by endpoint ---");
  for (const [ep, count] of Object.entries(byEndpoint).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${ep}: ${count}`);
  }
  
  // Per-role summary from our results
  console.log("\n--- Per-role response summary ---");
  for (const r of allResults[0].results) {
    const allModels = [...new Set(allResults.flatMap(a => a.results.filter(x => x.role === r.role).map(x => x.model)))];
    console.log(`  ${r.role.padEnd(14)} models: ${allModels.join(", ")}`);
  }
  
  // Cost estimate
  const totalTokens = allResults.flatMap(a => a.results).reduce((s, r) => s + r.tokens, 0);
  console.log(`\nTotal tokens across all requests: ${totalTokens}`);
  console.log(`Total requests: ${allResults.flatMap(a => a.results).length}`);
  
  // Save evidence
  const fs = await import("fs");
  const outPath = ".recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-08/live/pi-full-taxonomy-results.json";
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    aliases: ALIASES,
    roleCount: ROLE_PROMPTS.length,
    totalRequests: allResults.flatMap(a => a.results).length,
    totalTokens,
    aliasDistribution: byAlias,
    endpointDistribution: byEndpoint,
    results: allResults,
    decisionCount: decisions.length,
  }, null, 2));
  console.log(`\nEvidence saved to ${outPath}`);
}

main().catch(e => console.error("Fatal:", e.message));
