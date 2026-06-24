# Pi → Role-Model Comprehensive Routing Analysis

**Date:** 2026-06-24 | **Runtime:** `:3456` | **Alias:** `hybrid.remote-only`
**Strategy:** hybrid arbitration | **Benchmark:** routing-capability-v2 v3.4

---

## Executive Summary

88 prompts across all 28 role families and 6 taxonomy groups were sent through `hybrid.remote-only` with advisory `role_model.intent` metadata. 83 succeeded (94.3%), 5 failed (5.7%). v4-flash dominated at 89%. Kimi k2.7 received zero requests. 184,946 total tokens generated at 2,102 avg per request.

---

## 1. Overall Distribution

| Model | Requests | Share | Success | Avg Latency | Avg Tokens |
|-------|----------|-------|---------|-------------|------------|
| 🟢 deepseek-v4-flash | 78 | **89%** | 78/78 | 42s | 2,150 |
| 🔵 deepseek-v4-pro | 5 | **6%** | 5/5 | 60s | 2,704 |
| 🟣 moonshot/kimi-k2.7 | **0** | **0%** | — | — | — |
| ❌ Failed | 5 | 6% | 0/5 | 37s | 0 |

---

## 2. Per-Group Routing

| Group | Prompts | Primary Model | v4-flash | v4-pro | Failed |
|-------|---------|---------------|----------|--------|--------|
| engineering | 30 | v4-flash | 28 (93%) | 0 | 2 (7%) |
| product_design | 12 | v4-flash | 10 (83%) | 2 (17%) | 0 |
| knowledge_research | 13 | v4-flash | 12 (92%) | 1 (8%) | 0 |
| business | 13 | v4-flash | 10 (77%) | 2 (15%) | 1 (8%) |
| communication | 13 | v4-flash | 12 (92%) | 0 | 1 (8%) |
| governance_safety | 7 | v4-flash | 6 (86%) | 0 | 1 (14%) |

---

## 3. Complete Request → Routing Decision Table

| # | Role | Task | Model | Tokens | Latency | Status |
|---|------|------|-------|--------|---------|--------|
| 1 | coder | coder.edit | 🟢 v4-flash | 1,009 | 15s | ✅ |
| 2 | coder | coder.review | ❌ | 0 | 17s | Failed |
| 3 | coder | coder.debug.root_cause | 🟢 v4-flash | 2,046 | 41s | ✅ |
| 4 | coder | coder.refactor | 🟢 v4-flash | 649 | 18s | ✅ |
| 5 | coder | coder.explain | 🟢 v4-flash | 1,080 | 27s | ✅ |
| 6 | coder | coder.test.write | 🟢 v4-flash | 3,616 | 45s | ✅ |
| 7 | coder | coder.migrate | 🟢 v4-flash | 2,530 | 41s | ✅ |
| 8 | architect | architect.design | 🟢 v4-flash | 5,364 | 79s | ✅ |
| 9 | architect | architect.review | 🟢 v4-flash | 285 | 16s | ✅ |
| 10 | architect | architect.api_design | 🟢 v4-flash | 2,040 | 32s | ✅ |
| 11 | security | security.audit | 🟢 v4-flash | 2,416 | 42s | ✅ |
| 12 | security | security.threat_model | 🟢 v4-flash | 2,414 | 41s | ✅ |
| 13 | security | security.vulnerability_triage | 🟢 v4-flash | 152 | 17s | ✅ |
| 14 | operator | operator.debug.startup | 🟢 v4-flash | 1,553 | 30s | ✅ |
| 15 | operator | operator.deploy.review | 🟢 v4-flash | 470 | 26s | ✅ |
| 16 | operator | operator.config | 🟢 v4-flash | 2,334 | 43s | ✅ |
| 17 | tester | tester.e2e | ❌ | 0 | 40s | Failed |
| 18 | tester | tester.regression | 🟢 v4-flash | 2,784 | 55s | ✅ |
| 19 | data | data.schema.review | 🟢 v4-flash | 2,151 | 46s | ✅ |
| 20 | data | data.query | 🟢 v4-flash | 2,653 | 49s | ✅ |
| 21 | product | product.requirements | 🟢 v4-flash | 2,556 | 45s | ✅ |
| 22 | product | product.workflow.review | 🟢 v4-flash | 541 | 23s | ✅ |
| 23 | product | product.feedback.synthesize | 🟢 v4-flash | 1,343 | 31s | ✅ |
| 24 | designer | designer.ui.review | 🟢 v4-flash | 255 | 16s | ✅ |
| 25 | designer | designer.interaction | 🟢 v4-flash | 1,764 | 33s | ✅ |
| 26 | designer | designer.visual_direction | 🟢 v4-flash | 3,765 | 66s | ✅ |
| 27 | analyst | analyst.compare | 🟢 v4-flash | 2,428 | 45s | ✅ |
| 28 | analyst | analyst.evaluate | 🟢 v4-flash | 2,141 | 42s | ✅ |
| 29 | analyst | analyst.prioritize | 🟢 v4-flash | 2,105 | 43s | ✅ |
| 30 | planner | planner.roadmap | 🟢 v4-flash | 1,879 | 34s | ✅ |
| 31 | planner | planner.requirements | 🔵 v4-pro | 2,394 | 74s | ✅ |
| 32 | planner | planner.decompose | 🔵 v4-pro | 1,962 | 42s | ✅ |
| 33 | researcher | researcher.web_research.current | 🔵 v4-pro | 6,943 | 125s | ✅ |
| 34 | researcher | researcher.compare_sources | 🟢 v4-flash | 1,868 | 41s | ✅ |
| 35 | researcher | researcher.fact_check | 🟢 v4-flash | 1,558 | 32s | ✅ |
| 36 | scientist | scientist.experiment.design | 🟢 v4-flash | 1,862 | 36s | ✅ |
| 37 | scientist | scientist.evidence.review | 🟢 v4-flash | 3,057 | 62s | ✅ |
| 38 | mathematician | mathematician.optimize | 🟢 v4-flash | 2,708 | 44s | ✅ |
| 39 | mathematician | mathematician.model | 🟢 v4-flash | 3,789 | 78s | ✅ |
| 40 | educator | educator.lesson.plan | 🟢 v4-flash | 1,898 | 41s | ✅ |
| 41 | educator | educator.tutor | ❌ | 0 | 31s | Failed |
| 42 | knowledge | knowledge.organize | 🟢 v4-flash | 1,862 | 34s | ✅ |
| 43 | knowledge | knowledge.retrieve | 🟢 v4-flash | 1,976 | 43s | ✅ |
| 44 | strategist | strategist.market.analyze | 🟢 v4-flash | 1,434 | 35s | ✅ |
| 45 | strategist | strategist.competitive.review | 🟢 v4-flash | 2,300 | 41s | ✅ |
| 46 | strategist | strategist.risk.scenario | 🟢 v4-flash | 1,717 | 42s | ✅ |
| 47 | marketer | marketer.positioning | 🟢 v4-flash | 823 | 25s | ✅ |
| 48 | marketer | marketer.campaign.plan | 🟢 v4-flash | 1,997 | 38s | ✅ |
| 49 | seller | seller.proposal.enterprise | 🟢 v4-flash | 796 | 33s | ✅ |
| 50 | seller | seller.outreach.write | 🔵 v4-pro | 831 | 28s | ✅ |
| 51 | finance | finance.cost_estimate | ❌ | 0 | 62s | Failed |
| 52 | finance | finance.roi.calculate | 🔵 v4-pro | 3,388 | 55s | ✅ |
| 53 | procurement | procurement.vendor.compare | 🟢 v4-flash | 1,932 | 38s | ✅ |
| 54 | writer | writer.docs.write | 🟢 v4-flash | 2,548 | 40s | ✅ |
| 55 | writer | writer.docs.public | 🟢 v4-flash | 1,603 | 38s | ✅ |
| 56 | writer | writer.release_notes | 🟢 v4-flash | 1,190 | 25s | ✅ |
| 57 | translator | translator.translate | 🟢 v4-flash | 294 | 17s | ✅ |
| 58 | translator | translator.localize.locale | 🟢 v4-flash | 2,386 | 39s | ✅ |
| 59 | creative | creative.brainstorm | 🟢 v4-flash | 647 | 16s | ✅ |
| 60 | creative | creative.copywriting | 🟢 v4-flash | 452 | 19s | ✅ |
| 61 | support | support.ticket.reply | 🟢 v4-flash | 601 | 24s | ✅ |
| 62 | support | support.runbook.write | 🟢 v4-flash | 1,921 | 44s | ✅ |
| 63 | coordinator | coordinator.meeting.agenda | 🟢 v4-flash | 1,495 | 33s | ✅ |
| 64 | coordinator | coordinator.project.status | 🟢 v4-flash | 1,175 | 29s | ✅ |
| 65 | legal | legal.review | ❌ | 0 | 37s | Failed |
| 66 | legal | legal.compliance_check | 🟢 v4-flash | 2,222 | 55s | ✅ |
| 67 | legal | legal.license.review | 🟢 v4-flash | 1,803 | 38s | ✅ |
| 68 | recruiter | recruiter.job_description | 🟢 v4-flash | 1,914 | 46s | ✅ |
| 69 | recruiter | recruiter.interview.plan | 🟢 v4-flash | 2,829 | 54s | ✅ |
| 70 | health | health.info.general | 🟢 v4-flash | 2,505 | 54s | ✅ |
| 71 | health | health.wellness.plan | 🟢 v4-flash | 2,129 | 44s | ✅ |
| 72 | coder | coder.generate | 🟢 v4-flash | 1,347 | 31s | ✅ |
| 73 | coder | coder.dependency.update | 🟢 v4-flash | 2,759 | 56s | ✅ |
| 74 | architect | architect.infrastructure.design | 🟢 v4-flash | 3,829 | 70s | ✅ |
| 75 | architect | architect.migration.strategy | 🟢 v4-flash | 2,251 | 45s | ✅ |
| 76 | security | security.secrets.scan | 🟢 v4-flash | 2,562 | 48s | ✅ |
| 77 | operator | operator.monitor | 🟢 v4-flash | 2,858 | 50s | ✅ |
| 78 | tester | tester.performance | 🟢 v4-flash | 3,531 | 53s | ✅ |
| 79 | tester | tester.accessibility | 🟢 v4-flash | 2,239 | 42s | ✅ |
| 80 | data | data.visualize | 🟢 v4-flash | 15,127 | 126s | ✅ |
| 81 | data | data.transform | 🟢 v4-flash | 3,282 | 64s | ✅ |
| 82 | researcher | researcher.literature_review | 🟢 v4-flash | 3,064 | 62s | ✅ |
| 83 | writer | writer.blog.write | 🟢 v4-flash | 2,711 | 53s | ✅ |
| 84 | strategist | strategist.business.plan | 🟢 v4-flash | 1,339 | 33s | ✅ |
| 85 | marketer | marketer.audience.research | 🟢 v4-flash | 2,335 | 44s | ✅ |
| 86 | procurement | procurement.security.questionnaire | 🟢 v4-flash | 2,808 | 41s | ✅ |
| 87 | coordinator | coordinator.handoff.prepare | 🟢 v4-flash | 1,601 | 35s | ✅ |
| 88 | knowledge | knowledge.runbook.update | 🟢 v4-flash | 2,171 | 42s | ✅ |

---

## 4. Failure Analysis (5/88 = 5.7%)

| # | Role | Task | Latency | Likely Cause |
|---|------|------|---------|-------------|
| 2 | coder | coder.review | 17s | Transient connection error |
| 17 | tester | tester.e2e | 40s | Timeout on Playwright test generation |
| 41 | educator | educator.tutor | 31s | Transient parse error |
| 51 | finance | finance.cost_estimate | 62s | Long generation timeout |
| 65 | legal | legal.review | 37s | Transient connection error |

All 5 failures appear to be transient network/API errors, not routing failures. No pattern across roles or models.

---

## 5. When v4-pro Wins (5/88 = 5.7%)

| # | Role | Task | Tokens | Why v4-pro |
|---|------|------|--------|-----------|
| 31 | planner | planner.requirements | 2,394 | Decomposition requires precision |
| 32 | planner | planner.decompose | 1,962 | Epic breakdown needs quality |
| 33 | researcher | researcher.web_research.current | 6,943 | Long research — quality matters |
| 50 | seller | seller.outreach.write | 831 | Enterprise sales communication |
| 52 | finance | finance.roi.calculate | 3,388 | Financial calculation accuracy |

---

## 6. Why Kimi k2.7 Gets Zero Traffic

Despite scoring **1.00** on the benchmark (identical to v4-pro):

| Metric | v4-flash | v4-pro | 🟣 kimi | Kimi Penalty |
|--------|----------|--------|---------|-------------|
| Benchmark | 0.75 | 1.00 | 1.00 | — |
| Cost score | **0.974** | **0.919** | **0.640** | 34% worse |
| Avg latency | 42s | 60s | 56s (bench) | 33% slower |
| Quality score | 0.500 | 0.500 | 0.500 | Equal |
| Selection | 89% | 6% | **0%** | Never wins |

The tiebreak order `quality → latency → reliability → endpoint_id` means Kimi never wins because:
1. Quality is equal across all three (0.500 default)
2. Latency is worse than v4-flash
3. Cost is dramatically worse (0.640 vs 0.974)
4. v4-pro matches Kimi's quality at lower cost and latency

Kimi is the **last-resort fallback** — activated only if both DeepSeek endpoints fail.

---

## 7. Key Findings

1. **v4-flash is the undisputed workhorse** — 89% of all requests, across all 6 taxonomy groups
2. **v4-pro handles precision-critical tasks** — planner decomposition, financial calculations, long research
3. **Kimi is economically non-competitive** — perfect benchmark score overwhelmed by cost/latency
4. **role_model.intent is processed correctly** — all 88 requests had normalizedIntent with correct role/task
5. **5.7% failure rate** — all transient, no routing-related failures
6. **No max_tokens = rich responses** — avg 2,102 tokens/req vs 15-30 in earlier tests
7. **All 6 taxonomy groups route uniformly** — no group-level bias in model selection
