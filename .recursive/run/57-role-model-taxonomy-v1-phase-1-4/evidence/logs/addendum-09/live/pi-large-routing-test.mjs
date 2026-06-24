// Large-scale Pi→Role-Model routing test with varied prompts
const RUNTIME = "http://127.0.0.1:3456";
const ALIAS = "hybrid.remote-only";

const PROMPTS = [
  // === Simple / easy prompts (should route to fast models) ===
  { role: "coder", task: "coder.edit", prompt: "Add a comment to this function." },
  { role: "analyst", task: "analyst.evaluate", prompt: "What is 15 plus 27?" },
  { role: "support", task: "support.explain", prompt: "How do I reset my password?" },
  { role: "writer", task: "writer.summarize", prompt: "Summarize: The cat sat on the mat." },
  { role: "translator", task: "translator.translate", prompt: "Translate 'hello' to Spanish." },
  
  // === Medium complexity ===
  { role: "coder", task: "coder.edit", prompt: "Implement a function that validates email addresses with regex and returns detailed error messages for invalid formats." },
  { role: "coder", task: "coder.review", prompt: "Review this pull request for potential race conditions, memory leaks, and SQL injection vulnerabilities. The diff changes the authentication middleware and database access layer." },
  { role: "architect", task: "architect.design", prompt: "Design a complete API contract for a multi-tenant SaaS platform with rate limiting, authentication, audit logging, and versioning. Include endpoint paths, request/response schemas, and error codes." },
  { role: "security", task: "security.audit", prompt: "Perform a thorough security audit of this JWT authentication flow. Check for token expiration handling, refresh token rotation, CSRF protection, and signature algorithm vulnerabilities." },
  { role: "data", task: "data.schema.review", prompt: "Review this database schema with 15 interconnected tables for normalization issues. Check foreign key constraints, index coverage for common queries, and suggest denormalization where appropriate for performance." },
  
  // === Hard / complex ===
  { role: "architect", task: "architect.design", prompt: "Design a distributed event-sourcing system with CQRS pattern that handles 100K events/second. Include schema for event store, read model projections, snapshot strategy, and exactly-once processing guarantees across multiple availability zones." },
  { role: "security", task: "security.threat_model", prompt: "Create a comprehensive threat model for a zero-trust microservices architecture with service mesh, mTLS, OAuth2/OIDC, and API gateway. Identify attack vectors, mitigation strategies, and detection mechanisms for each layer." },
  { role: "coder", task: "coder.refactor", prompt: "Refactor this 5000-line monolithic service into clean architecture with domain-driven design. Separate into domain, application, infrastructure, and presentation layers. Identify bounded contexts and design aggregate roots." },
  { role: "data", task: "data.query", prompt: "Write an optimized SQL query that performs a recursive CTE through an organizational hierarchy, joins with 5 fact tables, applies window functions for running totals and percentiles, and includes query hints for the execution plan." },
  { role: "planner", task: "planner.roadmap", prompt: "Create a detailed 18-month technical roadmap for migrating a legacy monolith with 2M LOC to microservices. Include risk assessment, rollback strategies, team capacity planning, and measurable success criteria for each milestone." },
  
  // === Cross-role / ambiguous ===
  { role: "architect", task: "architect.review", prompt: "Evaluate three different message queue systems (Kafka, RabbitMQ, NATS) for our real-time analytics pipeline. Consider throughput, latency, durability guarantees, operational complexity, and cost. Recommend one with justification." },
  { role: "security", task: "security.policy_review", prompt: "Draft a comprehensive security policy document covering data classification, access control models, encryption standards, incident response procedures, third-party risk assessment, and compliance requirements for SOC2 and HIPAA." },
  { role: "product", task: "product.requirements", prompt: "Write a detailed PRD for an AI-powered code review assistant that integrates with GitHub, GitLab, and Bitbucket. Include user personas, functional requirements, non-functional requirements, success metrics, and a phased rollout plan." },
  
  // === Multi-step conversation 1: Debugging session ===
  { role: "operator", task: "operator.debug.startup", prompt: "Our production Kubernetes cluster is experiencing intermittent 503 errors. The ingress controller logs show upstream connection timeouts. Walk me through your systematic debugging approach." },
  { role: "operator", task: "operator.debug.startup", prompt: "I checked the ingress logs as you suggested and found that the timeouts correlate with pod restarts in the backend service. The pods are crashing with OOMKilled. What should I investigate next?" },
  { role: "operator", task: "operator.incident_triage", prompt: "I increased the memory limits from 512Mi to 2Gi and the OOM kills stopped, but now latency increased from 50ms to 800ms p99. The heap dumps show a memory leak in the connection pool. How do I diagnose the root cause?" },
  { role: "operator", task: "operator.config", prompt: "I found the leak: the HTTP client isn't closing response bodies. Can you write the fix and also suggest monitoring alerts to catch this kind of regression in the future?" },
  
  // === Multi-step conversation 2: Architecture review ===
  { role: "architect", task: "architect.review", prompt: "We're building a real-time collaboration platform. Currently we use WebSockets with a single server, but need to scale horizontally. What architecture patterns would you recommend for scaling WebSocket connections across multiple nodes?" },
  { role: "architect", task: "architect.design", prompt: "We decided on Redis PubSub for the message backbone as you suggested. Now we need to handle message ordering when users reconnect to different nodes. Design the session management and message deduplication strategy." },
  { role: "architect", task: "architect.data_model", prompt: "For the CRDT-based conflict resolution you mentioned, design the data model for a collaborative text editor that supports offline edits, merging, and cursor presence. Include the conflict resolution algorithm pseudocode." },
  
  // === Multi-step conversation 3: Data engineering ===
  { role: "data", task: "data.query", prompt: "We have a 10TB PostgreSQL database and queries are slowing down. The pg_stat_statements show the top 5 slowest queries are all doing full table scans on our events table. What indexing and partitioning strategy would you recommend?" },
  { role: "data", task: "data.transform", prompt: "We partitioned by month as you suggested and added partial indexes. Now we need to backfill 2 years of historical data into the new partitions. Write the migration script that moves data without downtime." },
  { role: "data", task: "data.analyze", prompt: "The migration completed but the query planner is still choosing sequential scans for some partitioned queries. Analyze the EXPLAIN ANALYZE output and suggest statistics tuning and query rewrites." },
  
  // === Diverse role families ===
  { role: "researcher", task: "researcher.web_research.current", prompt: "Research the current state of WebAssembly outside the browser. Compare WASI preview2 with preview1, evaluate runtimes (Wasmtime, Wasmer, WasmEdge), and assess production readiness for serverless computing use cases." },
  { role: "researcher", task: "researcher.compare_sources", prompt: "Compare the three leading vector database solutions (Pinecone, Weaviate, Milvus) for a semantic search application with 50M embeddings. Evaluate on indexing speed, query latency, filtering capabilities, cost at scale, and cloud vs self-hosted tradeoffs." },
  { role: "scientist", task: "scientist.experiment.design", prompt: "Design an A/B test to measure the impact of our new recommendation algorithm on user engagement. Define metrics, sample size calculation, duration, statistical tests, and how to control for confounding variables like seasonality and user cohorts." },
  { role: "mathematician", task: "mathematician.optimize", prompt: "Optimize our supply chain routing to minimize total delivery cost given 50 warehouses and 5000 delivery points with time windows, vehicle capacity constraints, and varying fuel costs. Formulate as a mixed-integer linear program and suggest a solution approach." },
  { role: "strategist", task: "strategist.competitive.review", prompt: "Analyze our competitive position in the cloud cost management market. Map competitors on features, pricing, target segments, and GTM strategy. Identify our sustainable differentiators and recommend strategic positioning for the next fiscal year." },
  { role: "finance", task: "finance.cost_estimate", prompt: "Build a detailed 3-year TCO model comparing our current on-premise infrastructure with a full migration to AWS. Include compute, storage, networking, database, licensing, personnel, and training costs. Model optimistic, realistic, and pessimistic scenarios." },
  { role: "finance", task: "finance.roi.calculate", prompt: "Calculate the ROI and payback period for our proposed AI-powered customer support chatbot. Include development costs, training data acquisition, inference costs, expected deflection rate, CSAT improvement, and agent time savings." },
  { role: "marketer", task: "marketer.positioning", prompt: "Develop a comprehensive positioning strategy for our developer tools platform. Define the core value proposition, key messaging pillars, competitive differentiation, target developer personas, and a multi-channel content marketing plan." },
  { role: "seller", task: "seller.proposal.enterprise", prompt: "Draft an enterprise proposal for a Fortune 500 company evaluating our platform. Include executive summary, technical architecture overview, security and compliance coverage, implementation timeline, pricing structure, SLA commitments, and competitive differentiators." },
  { role: "legal", task: "legal.compliance_check", prompt: "Review our data processing agreements for GDPR, CCPA, and the upcoming EU AI Act compliance. Identify gaps in our current contracts, suggest required amendments, and outline a compliance roadmap with prioritized action items." },
  { role: "recruiter", task: "recruiter.job_description", prompt: "Write a compelling job description for a Staff Platform Engineer role. Include technical requirements (Kubernetes, Terraform, Go, distributed systems), leadership expectations (mentoring, architecture decisions, cross-team collaboration), and our engineering culture and benefits." },
  { role: "educator", task: "educator.lesson.plan", prompt: "Design a 12-week curriculum for teaching systems programming in Rust to experienced C++ developers. Include learning objectives, weekly topics, hands-on projects, assessment criteria, and how to leverage their existing mental models while introducing Rust's ownership concepts." },
  { role: "health", task: "health.info.general", prompt: "Provide evidence-based recommendations for optimizing sleep quality for software engineers who work irregular hours. Cover sleep hygiene, circadian rhythm management, caffeine timing, screen exposure, exercise timing, and environmental factors with citations to peer-reviewed research." },
  { role: "creative", task: "creative.brainstorm", prompt: "Generate 20 innovative product concepts at the intersection of AI and sustainable energy. For each concept, provide a name, one-line pitch, target market, key technical challenge, and potential business model. Rank by feasibility and potential impact." },
  { role: "coordinator", task: "coordinator.meeting.agenda", prompt: "Create a detailed agenda and facilitation plan for a 2-day executive offsite focused on our AI strategy. Include session topics, time allocations, pre-reads, facilitation techniques, decision frameworks, and post-offsite action items with ownership and deadlines." },
  { role: "knowledge", task: "knowledge.organize", prompt: "Design a knowledge management system for our engineering organization of 500 people. Include taxonomy design, information architecture, search and discovery features, contribution workflows, stale content detection, and integration with our existing tools (Slack, Jira, GitHub)." },
  
  // === Edge cases ===
  { role: "coder", task: "coder.debug.root_cause", prompt: "Debug this heisenbug that only occurs in production under load. Symptoms: random null pointer exceptions in the payment processing pipeline, never reproducible in staging. System processes 500 TPS across 20 nodes with a shared Redis cache." },
  { role: "security", task: "security.audit.supply_chain", prompt: "Audit our npm dependency tree (2000+ packages) for supply chain risks. Check for typosquatting, abandoned packages, known CVE vulnerabilities, unexpected binary downloads, and suspicious post-install scripts. Recommend a toolchain and process for ongoing monitoring." },
  { role: "tester", task: "tester.plan", prompt: "Design a comprehensive chaos engineering test plan for our distributed system. Include network partitions, DNS failures, certificate expiry, clock skew, cascading failure scenarios, and resource exhaustion tests. Define blast radius controls and automatic rollback criteria." },
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
    max_tokens: 30,
  };

  const start = Date.now();
  try {
    const resp = await fetch(`${RUNTIME}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return {
      role: rp.role,
      task: rp.task,
      prompt: rp.prompt.substring(0, 50),
      model: data.model,
      latencyMs: Date.now() - start,
      status: resp.status,
    };
  } catch (e) {
    return { role: rp.role, task: rp.task, prompt: rp.prompt.substring(0,50), model: "error", latencyMs: Date.now()-start, status: 0 };
  }
}

async function main() {
  console.log(`=== Sending ${PROMPTS.length} prompts through ${ALIAS} ===\n`);
  
  const results = [];
  for (let i = 0; i < PROMPTS.length; i++) {
    const r = await sendRequest(PROMPTS[i]);
    results.push(r);
    const icon = r.status === 200 ? "✅" : "❌";
    const modelShort = (r.model || "?").substring(0, 25).padEnd(25);
    process.stdout.write(`  ${icon} ${String(i+1).padStart(2)} ${r.role.padEnd(14)} → ${modelShort} | ${r.latencyMs}ms\n`);
  }

  // Wait for telemetry
  console.log("\nWaiting for telemetry...");
  await new Promise(r => setTimeout(r, 2000));

  // Get routing decisions
  const decisionsResp = await fetch(`${RUNTIME}/api/role-model/router/decisions?limit=${PROMPTS.length + 10}`);
  const decisions = await decisionsResp.json();
  const userDecisions = decisions.filter(d => !d.requestId?.startsWith("bench-"));

  console.log(`\n=== Routing Analysis: ${userDecisions.length} decisions ===`);
  
  const byModel = {};
  const byStrat = {};
  const modelLatency = {};
  userDecisions.forEach(d => {
    byModel[d.selectedModelId] = (byModel[d.selectedModelId] || 0) + 1;
    byStrat[d.strategyLabel] = (byStrat[d.strategyLabel] || 0) + 1;
  });

  // Map results to models
  const modelToResults = {};
  results.forEach(r => {
    if (!modelToResults[r.model]) modelToResults[r.model] = [];
    modelToResults[r.model].push(r);
  });

  console.log("\nModel distribution:");
  Object.entries(byModel).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    const pct = (v / userDecisions.length * 100).toFixed(0);
    const avgLat = modelToResults[k] ? Math.round(modelToResults[k].reduce((s,r)=>s+r.latencyMs,0) / modelToResults[k].length) : 0;
    const name = k?.includes("flash") ? "v4-flash" : k?.includes("pro") ? "v4-pro" : k?.includes("kimi") ? "kimi-k2.7" : k?.includes("llama") ? "llama-local" : k?.substring(0,25);
    console.log(`  ${name.padEnd(15)} ${String(v).padStart(3)} (${pct}%) avg ${avgLat}ms`);
  });

  console.log("\nStrategy distribution:");
  Object.entries(byStrat).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // Per-role model assignment
  console.log("\nPer-role routing:");
  const roleRoutes = {};
  results.forEach(r => {
    if (!roleRoutes[r.role]) roleRoutes[r.role] = {};
    roleRoutes[r.role][r.model] = (roleRoutes[r.role][r.model] || 0) + 1;
  });
  for (const [role, models] of Object.entries(roleRoutes).sort()) {
    const summary = Object.entries(models).map(([m,c]) => {
      const short = m?.includes("flash") ? "flash" : m?.includes("pro") ? "pro" : m?.includes("kimi") ? "kimi" : m?.includes("llama") ? "local" : "?";
      return `${short}:${c}`;
    }).join(" ");
    console.log(`  ${role.padEnd(14)} ${summary}`);
  }

  // Save evidence
  const fs = await import("fs");
  fs.writeFileSync(
    ".recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-09/live/pi-large-routing-test.json",
    JSON.stringify({ total: PROMPTS.length, results, modelDist: byModel, strategyDist: byStrat, roleRoutes }, null, 2)
  );
  console.log("\nEvidence saved.");
}

main().catch(e => console.error("Fatal:", e.message));
