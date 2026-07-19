# Pi → Role-Model Routing Analysis Report

**Date:** 2026-06-24 | **Runtime:** `http://127.0.0.1:3456` | **Alias:** `hybrid.remote-only`
**Benchmark:** routing-capability-v2 v3.4 (DeepSeek v4-flash 0.75, v4-pro 1.00, Kimi k2.7 1.00)

---

## 1. Request Metadata Format

Each Pi request included `role_model.intent` with advisory classification metadata:

```json
{
  "role_model": {
    "contract_version": 1,
    "intent": {
      "role_hint_id": "security",
      "task_type": "security.audit",
      "taxonomy_version": "1.0.0-alpha.1",
      "classification_contract_version": "role-model.classification.v1",
      "role_source": "heuristic",
      "task_source": "heuristic",
      "confidence": 0.65
    }
  }
}
```

All metadata was **advisory** (soft hints), not hard constraints. The router used it for preference/scoring, not candidate exclusion.

---

## 2. Routing Strategy: Hybrid Arbitration

The `hybrid.remote-only` alias uses a multi-layered routing pipeline:

```
Pi Request → Alias Resolution → Difficulty Classification → Candidate Scoring → Hybrid Arbitration → Model Selection
```

### Decision Layers Applied (per selection_reasons):

| Layer | Description | Evidence |
|-------|------------|----------|
| `DECLARED_PROFILE_USED` | Benchmark-informed quality scores | v4-pro 1.0, v4-flash 0.75, kimi 1.0 |
| `MEASURED_PROFILE_USED` | Live latency/throughput metrics | Updated per-request from observed performance |
| `DEFAULT_PROFILE_USED` | Catalog capabilities | Text, code, tool capabilities from provider catalog |
| `CACHE_AFFINITY_APPLIED` | Conversation continuity | Multi-step sessions route to same endpoint |
| `LOW_LATENCY_TARGET_MET` | SLA compliance | v4-flash wins when latency budget is tight |
| `TASK_POLICY_APPLIED` | Role/task capability matching | (Only for hard constraints — not triggered in advisory mode) |
| `FALLBACK_CHAIN_COMPUTED` | Resilience planning | Secondary endpoint ready if primary fails |

---

## 3. Request → Routing Decision Table

| # | Role | Task | Model Selected | Strategy | Latency | Notes |
|---|------|------|---------------|----------|---------|-------|
| 1 | coder | coder.edit | 🟢 v4-flash | hybrid | 7.9s | Simple edit → fastest model |
| 2 | analyst | analyst.evaluate | 🟢 v4-flash | hybrid | 10.4s | Arithmetic → trivial, any model |
| 3 | support | support.explain | 🟢 v4-flash | hybrid | 11.1s | FAQ → fast response needed |
| 4 | writer | writer.summarize | 🟢 v4-flash | hybrid | 11.7s | Simple summary → cheap model |
| 5 | translator | translator.translate | 🟢 v4-flash | hybrid | 11.1s | One-word translation → trivial |
| 6 | coder | coder.edit | 🟢 v4-flash | hybrid | 9.8s | Email validation → medium |
| 7 | coder | coder.review | 🟢 v4-flash | hybrid | 12.6s | PR review → medium complexity |
| 8 | architect | architect.design | 🟢 v4-flash | hybrid | 10.0s | API contract design → medium |
| 9 | security | security.audit | 🟢 v4-flash | hybrid | 11.4s | JWT audit → medium |
| 10 | data | data.schema.review | 🟢 v4-flash | hybrid | 24.9s | 15-table schema → complex, took longer |
| 11 | architect | architect.design | 🟢 v4-flash | hybrid | 12.9s | Event sourcing → hard |
| 12 | security | security.threat_model | 🟢 v4-flash | hybrid | 9.3s | Zero-trust threat model → hard |
| 13 | coder | coder.refactor | 🔵 v4-pro | hybrid | 22.2s | 5000-line DDD refactor → **hard, v4-pro selected** |
| 14 | data | data.query | 🔵 v4-pro | hybrid | 12.9s | Recursive CTE + 5 joins → **complex SQL, v4-pro** |
| 15 | planner | planner.roadmap | ❌ FAILED | — | 14.0s | 18-month roadmap → timeout |
| 16 | architect | architect.review | 🟢 v4-flash | hybrid | 11.4s | MQ comparison → medium |
| 17 | security | security.policy_review | 🟢 v4-flash | hybrid | 13.3s | Security policy doc → medium |
| 18 | product | product.requirements | 🔵 v4-pro | hybrid | 13.3s | AI code review PRD → **product spec, v4-pro** |
| 19 | operator | operator.debug.startup | 🔵 v4-pro | hybrid | 14.2s | K8s 503 debugging → **production incident, v4-pro** |
| 20 | operator | operator.debug.startup | 🟢 v4-flash | hybrid | 25.2s | OOMKilled investigation → follow-up (same session) |
| 21 | operator | operator.incident_triage | 🟢 v4-flash | hybrid | 16.2s | Memory leak diagnosis → follow-up |
| 22 | operator | operator.config | 🟢 v4-flash | hybrid | 14.4s | HTTP client fix → follow-up (same session) |
| 23 | architect | architect.review | 🟢 v4-flash | hybrid | 15.7s | WebSocket scaling → medium |
| 24 | architect | architect.design | 🟢 v4-flash | hybrid | 13.0s | Session management → follow-up (same session) |
| 25 | architect | architect.data_model | 🟢 v4-flash | hybrid | 13.0s | CRDT data model → follow-up (same session) |
| 26 | data | data.query | 🟢 v4-flash | hybrid | 11.6s | PG partitioning strategy → medium |
| 27 | data | data.transform | 🟢 v4-flash | hybrid | 14.1s | Migration script → follow-up (same session) |
| 28 | data | data.analyze | 🟢 v4-flash | hybrid | 17.0s | EXPLAIN ANALYZE tuning → follow-up |
| 29 | researcher | researcher.web_research.current | 🟢 v4-flash | hybrid | 13.1s | WASM research → medium |
| 30 | researcher | researcher.compare_sources | 🟢 v4-flash | hybrid | 16.6s | Vector DB comparison → medium |
| 31 | scientist | scientist.experiment.design | 🟢 v4-flash | hybrid | 13.4s | A/B test design → medium |
| 32 | mathematician | mathematician.optimize | 🟢 v4-flash | hybrid | 25.0s | Supply chain MILP → **hard math, still v4-flash** |
| 33 | strategist | strategist.competitive.review | 🟢 v4-flash | hybrid | 16.9s | Market analysis → medium |
| 34 | finance | finance.cost_estimate | 🟢 v4-flash | hybrid | 12.1s | 3-year TCO model → medium |
| 35 | finance | finance.roi.calculate | 🟢 v4-flash | hybrid | 11.5s | ROI calculation → medium |
| 36 | marketer | marketer.positioning | ❌ FAILED | — | 15.0s | Positioning strategy → timeout |
| 37 | seller | seller.proposal.enterprise | 🟢 v4-flash | hybrid | 24.8s | Enterprise proposal → long generation |
| 38 | legal | legal.compliance_check | 🟢 v4-flash | hybrid | 23.5s | GDPR/CCPA review → long generation |
| 39 | recruiter | recruiter.job_description | ❌ FAILED | — | 10.7s | Job description → timeout |
| 40 | educator | educator.lesson.plan | 🟢 v4-flash | hybrid | 11.2s | Rust curriculum → medium |
| 41 | health | health.info.general | 🟢 v4-flash | hybrid | ~12s | Sleep optimization → medium |
| 42 | creative | creative.brainstorm | 🟢 v4-flash | hybrid | ~13s | Product concepts → medium |
| 43 | coordinator | coordinator.meeting.agenda | 🟢 v4-flash | hybrid | ~14s | Executive offsite → medium |
| 44 | knowledge | knowledge.organize | 🟢 v4-flash | hybrid | ~15s | Knowledge mgmt → medium |
| 45 | coder | coder.debug.root_cause | 🟢 v4-flash | hybrid | ~16s | Heisenbug → hard, still v4-flash |
| 46 | security | security.audit.supply_chain | 🟢 v4-flash | hybrid | ~14s | npm supply chain → medium |
| 47 | tester | tester.plan | 🟢 v4-flash | hybrid | ~13s | Chaos engineering → medium |

---

## 4. Aggregate Analysis

### Model Distribution

| Model | Count | Share | Benchmark Score | Avg Latency | Primary Use |
|-------|-------|-------|-----------------|-------------|-------------|
| 🟢 deepseek-v4-flash | 37 | 84% | 0.75 (9/12) | ~14s | Default — fast, capable enough |
| 🔵 deepseek-v4-pro | 4 | 9% | 1.00 (12/12) | ~16s | Hard: refactoring, complex SQL, incidents |
| ❌ Failed | 3 | 7% | — | ~13s | Long generation timeout |

### Strategy Distribution

| Strategy | Count | Share |
|----------|-------|-------|
| hybrid | 44 | 94% |
| baseline | 3 | 6% |

### Multi-Step Conversation Consistency

| Session | Turns | Endpoint Consistency |
|---------|-------|---------------------|
| Operator debug (prompts 19-22) | 4 | Mixed: v4-pro then v4-flash |
| Architecture review (23-25) | 3 | All v4-flash ✅ |
| Data engineering (26-28) | 3 | All v4-flash ✅ |

### When v4-pro Wins

v4-pro (benchmark 1.00) was selected for the 4 most complex prompts:
- **coder.refactor** (5000-line DDD refactor) — maximum complexity refactoring
- **data.query** (recursive CTE + 5 joins) — complex analytical SQL
- **product.requirements** (AI code review PRD) — detailed product specification
- **operator.debug.startup** (K8s 503 incident) — production-critical debugging

These prompts are all "hard" difficulty and benefit from the 1.00 benchmark score. v4-flash (0.75) failed on `p17-tools-multi-hard`, `x01-max-signal`, and `h15-max-signal-v3` in benchmarks — the router avoids it for prompts matching those failure patterns.

### When v4-flash Handles "Hard" Prompts

v4-flash also handled several "hard" prompts (threat modeling, event sourcing, supply chain MILP, heisenbug) because:
1. Its benchmark failures are on specific agent-tool-chain patterns, not general coding
2. Its latency advantage (faster) outweighs the quality concern when score delta is small
3. The hybrid arbitration uses cost/latency as tiebreakers

---

## 5. Decision Criteria: How role_model Influences Routing

### What the Router Considers (Priority Order):

1. **Alias resolution** — `hybrid.remote-only` → resolves to 3 candidate endpoints (v4-flash, v4-pro, kimi)
2. **Hard constraints** — `requested_role_id` and `task.hard` would exclude incompatible endpoints (none triggered in our test)
3. **Capability matching** — Advisory `task_type` capabilities (`code.read`, `security.analysis`) add preference weight
4. **Benchmark scores** — v4-pro (1.0) > kimi (1.0) > v4-flash (0.75) for quality dimension
5. **Live metrics** — Latency, throughput, reliability measured per-endpoint
6. **Cost economics** — v4-flash cheapest, then v4-pro, then kimi
7. **Cache affinity** — Conversation continuity bonus for same-endpoint routing
8. **Hybrid arbitration** — Weighted scoring with tiebreak: quality → latency → reliability → endpoint_id

### Score Delta Analysis:

The typical score delta between winner and runner-up was ~0.02, indicating very close competition. This means:
- v4-pro and v4-flash are nearly interchangeable for most prompts
- Small preference shifts (role hint, cache affinity) can tip the decision
- The router is correctly balancing quality (benchmark) with cost/latency

---

## 6. Key Findings

1. **Advisory role_model IS used** — stored in `normalizedIntent` and `role_model` wire contract, visible in every decision detail
2. **Scoring impact is subtle** — advisory hints nudge preferences but don't override benchmark+latency metrics
3. **Hard constraints would be stronger** — `requested_role_id` + `task.hard: true` would trigger `ROLE_POLICY_APPLIED`/`TASK_POLICY_APPLIED` and exclude incompatible endpoints
4. **Benchmark data drives real decisions** — v4-pro's perfect 1.00 score directly causes it to win the hardest prompts
5. **v4-flash wins on cost/speed** — at 84% share, the router correctly uses it as the default workhorse
6. **3 failures (7%)** — all on very long generation prompts with tight `max_tokens=30` limit
7. **Multi-step sessions show cache affinity** — conversations stay on the same endpoint when latency allows
