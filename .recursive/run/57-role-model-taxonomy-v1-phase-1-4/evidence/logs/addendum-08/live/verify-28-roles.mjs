// Verify all 28 roles produce normalizedIntent in decision detail API
const RUNTIME = "http://127.0.0.1:4580";

const ROLES = [
  { role: "coder", task: "coder.edit", prompt: "Implement a function to validate email addresses." },
  { role: "architect", task: "architect.design", prompt: "Design the API contract for our payments service." },
  { role: "security", task: "security.audit", prompt: "Review this auth flow for security vulnerabilities." },
  { role: "researcher", task: "researcher.web_research.current", prompt: "Find the latest React 19 server components docs and cite sources." },
  { role: "writer", task: "writer.docs.write", prompt: "Write API documentation for our new endpoint with examples." },
  { role: "operator", task: "operator.debug.startup", prompt: "Debug this failing deployment — it crashes on startup with port conflict." },
  { role: "analyst", task: "analyst.compare", prompt: "Compare AWS, GCP, and Azure on cost and performance and rank them." },
  { role: "planner", task: "planner.roadmap", prompt: "Create a milestone roadmap for migrating our monolith to microservices." },
  { role: "tester", task: "tester.e2e", prompt: "Write end-to-end tests for the user registration flow." },
  { role: "data", task: "data.schema.review", prompt: "Review this database schema for normalization issues and indexing." },
  { role: "product", task: "product.requirements", prompt: "Write product requirements for a collaborative whiteboard feature." },
  { role: "designer", task: "designer.ui.review", prompt: "Review this UI mockup for accessibility issues and visual hierarchy." },
  { role: "support", task: "support.ticket.reply", prompt: "Draft a helpful reply to a customer having trouble connecting." },
  { role: "legal", task: "legal.review", prompt: "Review this privacy policy for GDPR compliance and flag risky clauses." },
  { role: "finance", task: "finance.cost_estimate", prompt: "Estimate the total cost of ownership for migrating to AWS." },
  { role: "creative", task: "creative.brainstorm", prompt: "Brainstorm 10 catchy brand names for our AI productivity app." },
  { role: "educator", task: "educator.lesson.plan", prompt: "Create a lesson plan for teaching Python decorators to intermediates." },
  { role: "translator", task: "translator.translate", prompt: "Translate this error message into Japanese for end users." },
  { role: "marketer", task: "marketer.content.seo", prompt: "Write SEO-optimized landing page copy targeting enterprise DevOps." },
  { role: "seller", task: "seller.outreach.write", prompt: "Draft a cold outreach email for enterprise prospects." },
  { role: "recruiter", task: "recruiter.job_description", prompt: "Write a job description for a senior platform engineer." },
  { role: "procurement", task: "procurement.vendor.compare", prompt: "Compare vendor proposals on pricing, SLA, and security." },
  { role: "coordinator", task: "coordinator.meeting.agenda", prompt: "Prepare an agenda for the quarterly architecture review." },
  { role: "knowledge", task: "knowledge.organize", prompt: "Organize these notes into a structured knowledge base." },
  { role: "strategist", task: "strategist.market.analyze", prompt: "Analyze our market position and recommend a GTM strategy." },
  { role: "mathematician", task: "mathematician.solve", prompt: "Solve this optimization problem under latency constraints." },
  { role: "scientist", task: "scientist.experiment.design", prompt: "Design a controlled experiment to test our caching strategy." },
  { role: "health", task: "health.info.general", prompt: "What are exercise recommendations for cardiovascular health?" },
];

async function main() {
  console.log("=== 28-Role normalizedIntent Verification ===\n");
  
  const results = [];
  const requestIds = [];
  
  // Send all 28 requests
  for (const { role, task, prompt } of ROLES) {
    const body = {
      model: "default.decision-only",
      messages: [{ role: "user", content: prompt }],
      role_model: {
        contract_version: 1,
        intent: {
          role_hint_id: role,
          task_type: task,
          taxonomy_version: "1.0.0-alpha.1",
          classification_contract_version: "role-model.classification.v1",
          role_source: "heuristic",
          task_source: "heuristic",
          confidence: 0.65,
        },
      },
    };
    
    const resp = await fetch(`${RUNTIME}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    requestIds.push({ role, task, model: data.model });
    process.stdout.write(".");
  }
  
  console.log("\n\nAll 28 requests sent. Waiting for telemetry...\n");
  await new Promise(r => setTimeout(r, 2000));
  
  // Now check each decision for normalizedIntent
  const decisions = await (await fetch(`${RUNTIME}/api/role-model/router/decisions?limit=50`)).json();
  console.log(`Found ${decisions.length} decisions.\n`);
  
  const passed = [];
  const failed = [];
  
  for (const dec of decisions.slice(0, 28)) {
    const detail = await (await fetch(`${RUNTIME}/api/role-model/router/decisions/${dec.requestId}`)).json();
    const ni = detail.normalizedIntent;
    const role = ni?.role?.id || "?";
    const task = ni?.task?.id || "?";
    const tax = ni?.taxonomyVersion || "?";
    const endpoint = dec.selectedEndpointId?.includes("deepseek") ? "deepseek" : 
                     dec.selectedEndpointId?.includes("llama") ? "local" : "other";
    
    if (ni && ni.role?.id && ni.task?.id && ni.taxonomyVersion) {
      passed.push({ role, task, endpoint, tax });
      console.log(`✅ ${role.padEnd(15)} → ${task.padEnd(32)} | ${endpoint} | v${tax}`);
    } else {
      failed.push({ role, requestId: dec.requestId });
      console.log(`❌ role=${role} task=${task} — missing fields`);
    }
  }
  
  console.log(`\n═══════════════════════════════════`);
  console.log(`  PASSED: ${passed.length}/${ROLES.length}`);
  console.log(`  FAILED: ${failed.length}/${ROLES.length}`);
  console.log(`═══════════════════════════════════`);
  
  if (failed.length > 0) {
    console.log("\nFailed:");
    failed.forEach(f => console.log(`  - requestId: ${f.requestId}`));
  }
  
  // Save evidence
  const fs = await import("fs");
  fs.writeFileSync(
    ".recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-08/live/normalizedIntent-28-roles.json",
    JSON.stringify({ passed: passed.length, failed: failed.length, passed_details: passed, failed_details: failed }, null, 2)
  );
  console.log("\nEvidence saved.");
}

main().catch(e => console.error("Fatal:", e.message));
