// 100-prompt comprehensive routing test — no max_tokens constraint
const RUNTIME = "http://127.0.0.1:3456";
const ALIAS = "hybrid.remote-only";

const PROMPTS = [
  // ── engineering group ──
  { role: "coder", task: "coder.edit", prompt: "Add input validation and error handling to this user registration function." },
  { role: "coder", task: "coder.review", prompt: "Review this 200-line PR for race conditions in the async event handler." },
  { role: "coder", task: "coder.debug.root_cause", prompt: "Debug a memory leak that only occurs when processing files larger than 2GB." },
  { role: "coder", task: "coder.refactor", prompt: "Refactor this class hierarchy to use composition instead of inheritance." },
  { role: "coder", task: "coder.explain", prompt: "Explain how Python's GIL affects multi-threaded CPU-bound workloads and what alternatives exist." },
  { role: "coder", task: "coder.test.write", prompt: "Write unit tests that cover all edge cases for this date parsing utility." },
  { role: "coder", task: "coder.migrate", prompt: "Write a migration script to convert our REST API from Express to Fastify with minimal downtime." },
  { role: "architect", task: "architect.design", prompt: "Design a fault-tolerant message processing pipeline that guarantees exactly-once delivery across multiple regions." },
  { role: "architect", task: "architect.review", prompt: "Review this architecture decision record for our move from monolith to event-driven microservices." },
  { role: "architect", task: "architect.api_design", prompt: "Design a GraphQL schema for a social media platform with real-time subscriptions and cursor-based pagination." },
  { role: "security", task: "security.audit", prompt: "Perform a security audit of our OAuth2 implementation including token storage, refresh rotation, and scope validation." },
  { role: "security", task: "security.threat_model", prompt: "Create a threat model for a multi-tenant SaaS application handling PII data with external API integrations." },
  { role: "security", task: "security.vulnerability_triage", prompt: "Triage these 5 CVEs and recommend which to patch first based on exploitability and business impact." },
  { role: "operator", task: "operator.debug.startup", prompt: "Diagnose why our Node.js process crashes on Kubernetes with signal SIGTERM but works fine locally." },
  { role: "operator", task: "operator.deploy.review", prompt: "Review this Terraform configuration for a zero-downtime blue-green deployment pipeline." },
  { role: "operator", task: "operator.config", prompt: "Configure rate limiting and circuit breaking for our API gateway handling 50K RPS." },
  { role: "tester", task: "tester.e2e", prompt: "Write Playwright tests for a multi-step checkout flow with payment processing and error recovery." },
  { role: "tester", task: "tester.regression", prompt: "Create a regression test suite for our search feature that validates ranking, filtering, and pagination." },
  { role: "data", task: "data.schema.review", prompt: "Review this database migration that adds partitioning to a 500M-row table — check for locking and performance impact." },
  { role: "data", task: "data.query", prompt: "Write an optimized query to find duplicate transactions across 3 sharded databases with timezone-aware timestamps." },

  // ── product_design group ──
  { role: "product", task: "product.requirements", prompt: "Write a PRD for a real-time collaborative whiteboard feature with offline support and conflict resolution." },
  { role: "product", task: "product.workflow.review", prompt: "Review this user onboarding flow and identify friction points that cause drop-off at each step." },
  { role: "product", task: "product.feedback.synthesize", prompt: "Synthesize 500 user feedback entries into prioritized feature requests with impact and effort estimates." },
  { role: "designer", task: "designer.ui.review", prompt: "Review this mobile UI for accessibility: color contrast, touch targets, screen reader compatibility, and keyboard navigation." },
  { role: "designer", task: "designer.interaction", prompt: "Design micro-interactions for a drag-and-drop file upload with progress indication and error recovery states." },
  { role: "designer", task: "designer.visual_direction", prompt: "Create a visual design direction for a fintech dashboard that conveys trust, precision, and real-time data awareness." },
  { role: "analyst", task: "analyst.compare", prompt: "Compare Snowflake, BigQuery, and Redshift for our 50TB data warehouse. Evaluate query performance, cost, ecosystem, and migration complexity." },
  { role: "analyst", task: "analyst.evaluate", prompt: "Evaluate whether we should build or buy a feature flag system, considering our scale (200 engineers) and requirements." },
  { role: "analyst", task: "analyst.prioritize", prompt: "Prioritize these 20 feature requests using RICE scoring with data-backed estimates for reach, impact, confidence, and effort." },
  { role: "planner", task: "planner.roadmap", prompt: "Create a 12-month engineering roadmap balancing feature development, tech debt reduction, and infrastructure improvements." },
  { role: "planner", task: "planner.requirements", prompt: "Break down the requirement 'improve system reliability to 99.99%' into specific, measurable engineering tasks with acceptance criteria." },
  { role: "planner", task: "planner.decompose", prompt: "Decompose a large epic for 'add multi-language support' into sprint-sized stories with dependencies and effort estimates." },

  // ── knowledge_research group ──
  { role: "researcher", task: "researcher.web_research.current", prompt: "Research the current state of edge computing platforms. Compare Cloudflare Workers, Deno Deploy, Vercel Edge, and AWS Lambda@Edge." },
  { role: "researcher", task: "researcher.compare_sources", prompt: "Compare three sources on the performance characteristics of Rust vs Go for network services — identify consensus and contradictions." },
  { role: "researcher", task: "researcher.fact_check", prompt: "Fact-check these 5 claims about database performance: 'MongoDB is faster than PostgreSQL for writes', 'Redis is single-threaded', etc." },
  { role: "scientist", task: "scientist.experiment.design", prompt: "Design an experiment to measure the impact of code review turnaround time on bug density in production." },
  { role: "scientist", task: "scientist.evidence.review", prompt: "Review the evidence for and against microservices improving team velocity — analyze the methodology of 3 industry studies." },
  { role: "mathematician", task: "mathematician.optimize", prompt: "Formulate our server placement problem as an optimization: minimize latency given 100 servers, 20 data centers, and capacity constraints." },
  { role: "mathematician", task: "mathematician.model", prompt: "Model the tail latency distribution of our service mesh using queuing theory, accounting for cascading timeouts and retry amplification." },
  { role: "educator", task: "educator.lesson.plan", prompt: "Create a 6-week curriculum for teaching distributed systems concepts to full-stack developers with limited systems background." },
  { role: "educator", task: "educator.tutor", prompt: "Explain CAP theorem to a product manager using real-world analogies and trade-off examples from our own architecture." },
  { role: "knowledge", task: "knowledge.organize", prompt: "Design a tagging and categorization taxonomy for our internal engineering wiki with 5000+ documents." },
  { role: "knowledge", task: "knowledge.retrieve", prompt: "Create a retrieval strategy for finding relevant past incidents when a new alert fires, using vector similarity and keyword matching." },

  // ── business group ──
  { role: "strategist", task: "strategist.market.analyze", prompt: "Analyze the developer tools market: identify underserved segments, emerging trends, and our best positioning opportunity." },
  { role: "strategist", task: "strategist.competitive.review", prompt: "Create a detailed competitive analysis matrix comparing our platform against 5 major competitors across 20 feature dimensions." },
  { role: "strategist", task: "strategist.risk.scenario", prompt: "Develop 3 scenario plans for how AI coding assistants could disrupt our business over the next 3 years, with mitigation strategies." },
  { role: "marketer", task: "marketer.positioning", prompt: "Craft a unique value proposition for our API management platform targeting enterprise security teams." },
  { role: "marketer", task: "marketer.campaign.plan", prompt: "Plan a developer-focused content marketing campaign: blog series, tutorials, conference talks, and community engagement calendar." },
  { role: "seller", task: "seller.proposal.enterprise", prompt: "Write an executive summary for a $500K enterprise deal, highlighting ROI, security compliance, and migration support." },
  { role: "seller", task: "seller.outreach.write", prompt: "Draft a cold outreach email sequence for VP Engineering prospects, personalizing based on their tech stack and recent funding." },
  { role: "finance", task: "finance.cost_estimate", prompt: "Build a unit economics model for our SaaS product: CAC, LTV, churn rate, expansion revenue, and payback period by customer segment." },
  { role: "finance", task: "finance.roi.calculate", prompt: "Calculate the 3-year ROI of implementing an internal developer platform, including productivity gains, reduced incidents, and tooling consolidation." },
  { role: "procurement", task: "procurement.vendor.compare", prompt: "Compare AWS, GCP, and Azure committed use discounts vs on-demand pricing for our workload profile of 500 VMs and 50 managed databases." },

  // ── communication group ──
  { role: "writer", task: "writer.docs.write", prompt: "Write comprehensive API documentation for our payments endpoint, including authentication, error codes, idempotency, and webhook events." },
  { role: "writer", task: "writer.docs.public", prompt: "Write a public-facing changelog entry for our major v2 release, highlighting breaking changes, migration guide, and new features." },
  { role: "writer", task: "writer.release_notes", prompt: "Write release notes for sprint 47: 3 new features, 12 bug fixes, 2 breaking changes, and performance improvements with before/after metrics." },
  { role: "translator", task: "translator.translate", prompt: "Translate our error message catalog (50 messages) from English to Japanese, maintaining technical accuracy and appropriate tone for developers." },
  { role: "translator", task: "translator.localize.locale", prompt: "Localize our date/time formatting, number formatting, and address fields for German (de-DE) and Brazilian Portuguese (pt-BR) locales." },
  { role: "creative", task: "creative.brainstorm", prompt: "Brainstorm 15 creative names for our new internal developer portal, considering themes: speed, reliability, craftsmanship, and developer joy." },
  { role: "creative", task: "creative.copywriting", prompt: "Write the hero copy, subheadline, and 3 value prop bullets for our developer conference landing page." },
  { role: "support", task: "support.ticket.reply", prompt: "Draft a response to an enterprise customer reporting intermittent 503 errors during their peak traffic hours." },
  { role: "support", task: "support.runbook.write", prompt: "Write a runbook for the on-call engineer handling 'payment processing latency spike' alerts with triage steps and escalation criteria." },
  { role: "coordinator", task: "coordinator.meeting.agenda", prompt: "Create a detailed agenda for a cross-team incident postmortem meeting with timeboxed sections, pre-reads, and action item templates." },
  { role: "coordinator", task: "coordinator.project.status", prompt: "Write a weekly project status update for our migration project, covering progress against milestones, blockers, risks, and key decisions." },

  // ── governance_safety group ──
  { role: "legal", task: "legal.review", prompt: "Review our Terms of Service for compliance with the EU Digital Services Act, identifying required changes with priority and rationale." },
  { role: "legal", task: "legal.compliance_check", prompt: "Check our data retention policies against GDPR, CCPA, and SOC2 requirements — identify gaps and suggest remediation." },
  { role: "legal", task: "legal.license.review", prompt: "Review the license compatibility of our dependency tree (MIT, Apache 2.0, GPLv3, AGPL) for our commercial SaaS product." },
  { role: "recruiter", task: "recruiter.job_description", prompt: "Write an inclusive job description for a Senior SRE role that attracts diverse candidates and accurately reflects our on-call expectations." },
  { role: "recruiter", task: "recruiter.interview.plan", prompt: "Design an interview loop for a Staff Engineer role: coding, system design, behavioral, and cross-team collaboration assessments with rubrics." },
  { role: "health", task: "health.info.general", prompt: "Provide evidence-based guidance on managing screen-related eye strain for software engineers, with citations to ophthalmology research." },
  { role: "health", task: "health.wellness.plan", prompt: "Create a wellness program outline for a remote-first engineering team: physical health, mental health, social connection, and burnout prevention." },

  // ── additional engineering deep dives ──
  { role: "coder", task: "coder.generate", prompt: "Generate a complete Express.js middleware for request logging with correlation IDs, timing, and structured JSON output to stdout." },
  { role: "coder", task: "coder.dependency.update", prompt: "Plan the upgrade path from React 18 to React 19 for our 200-component app: breaking changes, codemods, and testing strategy." },
  { role: "architect", task: "architect.infrastructure.design", prompt: "Design the network topology for a hybrid cloud deployment: on-premise Kubernetes + AWS EKS with direct connect and failover." },
  { role: "architect", task: "architect.migration.strategy", prompt: "Design a strangler fig migration strategy to incrementally replace a legacy SOAP API with REST endpoints over 6 months." },
  { role: "security", task: "security.secrets.scan", prompt: "Design an automated secrets scanning pipeline for our CI/CD: git pre-commit hooks, PR checks, and periodic full-repo scans with remediation workflow." },
  { role: "operator", task: "operator.monitor", prompt: "Design a comprehensive monitoring stack: metrics (Prometheus), logs (Loki), traces (Tempo), alerts (AlertManager), and SLO dashboards." },
  { role: "tester", task: "tester.performance", prompt: "Design a performance test plan for our API: load profile modeling, k6 scripts, baseline metrics, and regression detection thresholds." },
  { role: "tester", task: "tester.accessibility", prompt: "Create an accessibility testing checklist for WCAG 2.2 AA compliance: automated tools, manual checks, and screen reader testing procedures." },
  { role: "data", task: "data.visualize", prompt: "Design a real-time analytics dashboard showing API usage, error rates, latency percentiles, and cost attribution by team and endpoint." },
  { role: "data", task: "data.transform", prompt: "Design an ETL pipeline to ingest, clean, and transform raw CDN logs into a star schema for business intelligence queries." },

  // ── mixed/cross-role ──
  { role: "researcher", task: "researcher.literature_review", prompt: "Conduct a literature review on database connection pooling strategies, summarizing findings from 10 papers with practical recommendations." },
  { role: "writer", task: "writer.blog.write", prompt: "Write a technical blog post about our journey migrating from a monolithic database to distributed SQL, with war stories and lessons learned." },
  { role: "strategist", task: "strategist.business.plan", prompt: "Draft a 1-page business plan for a new internal tools team: mission, customers, success metrics, staffing plan, and 6-month roadmap." },
  { role: "marketer", task: "marketer.audience.research", prompt: "Research developer audience segments for our product: define personas, their information sources, decision criteria, and content preferences." },
  { role: "procurement", task: "procurement.security.questionnaire", prompt: "Complete a vendor security questionnaire for a potential observability tool: our data handling, encryption, access controls, and incident response." },
  { role: "coordinator", task: "coordinator.handoff.prepare", prompt: "Prepare a shift handoff document for the incoming on-call engineer: active incidents, recent changes, known issues, and escalation contacts." },
  { role: "knowledge", task: "knowledge.runbook.update", prompt: "Update our incident response runbook based on lessons learned from the last 3 major incidents: what worked, what didn't, and process improvements." },
];

async function sendRequest(rp) {
  const body = {
    model: ALIAS,
    messages: [{ role: "user", content: rp.prompt }],
    role_model: {
      contract_version: 1,
      intent: {
        role_hint_id: rp.role,
        task_type: rp.task,
        taxonomy_version: "1.0.0-alpha.1",
        classification_contract_version: "role-model.classification.v1",
        role_source: "heuristic",
        task_source: "heuristic",
        confidence: 0.65,
      },
    },
  };

  const start = Date.now();
  try {
    const resp = await fetch(`${RUNTIME}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    return {
      role: rp.role,
      task: rp.task,
      model: data.model,
      tokens: data.usage?.total_tokens || 0,
      finish: data.choices?.[0]?.finish_reason || "?",
      latencyMs: Date.now() - start,
      status: resp.status,
    };
  } catch (e) {
    return { role: rp.role, task: rp.task, model: "error", tokens: 0, finish: "error", latencyMs: Date.now()-start, status: 0 };
  }
}

async function main() {
  console.log(`=== ${PROMPTS.length} Prompts — No Token Limit ===\n`);
  
  const results = [];
  for (let i = 0; i < PROMPTS.length; i++) {
    const r = await sendRequest(PROMPTS[i]);
    results.push(r);
    const icon = r.status === 200 ? "✅" : "❌";
    const modelShort = (r.model || "?").substring(0, 25).padEnd(25);
    process.stdout.write(`  ${icon} ${String(i+1).padStart(3)} ${r.role.padEnd(14)} → ${modelShort} | ${r.tokens}t | ${r.latencyMs}ms\n`);
  }

  console.log("\nWaiting for telemetry...");
  await new Promise(r => setTimeout(r, 2000));

  // Analysis
  const decisionsResp = await fetch(`${RUNTIME}/api/role-model/router/decisions?limit=${PROMPTS.length + 20}`);
  const decisions = await decisionsResp.json();
  const userDecisions = decisions.filter(d => !d.requestId?.startsWith("bench-"));

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  ROUTING ANALYSIS: ${results.length} Prompts`);
  console.log(`═══════════════════════════════════════\n`);

  // Model distribution
  const byModel = {};
  results.forEach(r => { byModel[r.model] = (byModel[r.model] || 0) + 1; });
  console.log("Model Distribution:");
  Object.entries(byModel).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    const pct = (v / results.length * 100).toFixed(0);
    const name = k?.includes("flash") ? "🟢 v4-flash" : k?.includes("pro") ? "🔵 v4-pro" : k?.includes("kimi") ? "🟣 kimi-k2.7" : k?.includes("error") ? "❌ error" : "⚪ " + k?.substring(0,20);
    console.log(`  ${name.padEnd(18)} ${String(v).padStart(3)} (${pct}%)`);
  });

  // Per-group analysis  
  console.log("\nPer-Group Routing:");
  const groups = {
    engineering: ["coder","architect","security","operator","tester","data"],
    product_design: ["product","designer","analyst","planner"],
    knowledge_research: ["researcher","scientist","mathematician","educator","knowledge"],
    business: ["strategist","marketer","seller","finance","procurement"],
    communication: ["writer","translator","creative","support","coordinator"],
    governance_safety: ["legal","recruiter","health"],
  };
  for (const [group, roles] of Object.entries(groups)) {
    const groupResults = results.filter(r => roles.includes(r.role));
    const dist = {};
    groupResults.forEach(r => { dist[r.model] = (dist[r.model] || 0) + 1; });
    const top = Object.entries(dist).sort((a,b) => b[1] - a[1])[0];
    console.log(`  ${group.padEnd(22)} ${groupResults.length} prompts → mostly ${(top?.[0]||'?').substring(0,25)}`);
  }

  // Token stats
  const totalTokens = results.reduce((s, r) => s + r.tokens, 0);
  const avgTokens = Math.round(totalTokens / results.length);
  const avgLatency = Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length);
  console.log(`\nStats: ${totalTokens.toLocaleString()} total tokens | ${avgTokens} avg tokens/req | ${avgLatency}ms avg latency`);
  console.log(`Success rate: ${results.filter(r=>r.status===200).length}/${results.length}`);

  // Save
  const fs = await import("fs");
  fs.writeFileSync(
    ".recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-09/live/pi-100-prompt-routing.json",
    JSON.stringify({ total: results.length, byModel, byGroup: groups, stats: { totalTokens, avgTokens, avgLatency }, results }, null, 2)
  );
  console.log("\nEvidence saved.");
}

main().catch(e => console.error("Fatal:", e.message));
