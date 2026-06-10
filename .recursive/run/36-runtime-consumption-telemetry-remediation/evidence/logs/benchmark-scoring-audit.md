# Benchmark scoring audit — quick run `1951f6d7`

**Judge:** `moonshot/kimi-k2.6`  
**Candidates:** `lfm2.5-1.2b-instruct` (local), `moonshot/kimi-k2.6` (remote)  
**Reported scores:** local **81%**, remote **54%**

## Verdict

The inversion is **not credible capability measurement**. The local model was graded almost entirely by **permissive heuristics** (keyword/`TOOL_CALL` text patterns). The remote model was **penalized for missing synthetic `TOOL_CALL` strings** even when its reasoning described the correct workflow, and the judge LLM **only produced parseable scores on 2/24 grading calls**.

---

## Per-case comparison

| Case | Local | Remote | Local method | Remote method | Issue |
|------|------:|-------:|--------------|---------------|-------|
| p17-tools-multi-hard | 1.00 | 0.00 | heuristic | heuristic | Local fakes `TOOL_CALL` text; Kimi explains workflow, no text tools → instant 0 |
| x01-max-signal | 0.33 | 0.00 | heuristic | heuristic | Local partial keyword match; Kimi planning text, no tools → 0 |
| h01-implement-two-sum | 1.00 | 1.00 | heuristic | **judge** | Local: regex `function twoSum` only; Kimi: actual judge |
| h02-fix-async-counter | 0.25 | **1.00** | heuristic | **judge** | **Judge wrongly passed Kimi's unfixed buggy code**; local correctly low |
| h04-tool-read-router | 1.00 | 1.00 | heuristic | heuristic | Both: fake/detected `read_file` text, no execution |
| h05-tool-grep-eligibility | 1.00 | 1.00 | heuristic | heuristic | Local emits fake `grep_search` line |
| h06-tool-apply-patch | 1.00 | 0.00 | heuristic | heuristic | Local fake `apply_patch` with invalid diff; Kimi wrote real diff prose, no `TOOL_CALL` → 0 |
| h07-multi-turn-sla-guard | 1.00 | 1.00 | heuristic | heuristic | **Keyword fishing** (`throughput\|sla\|…`) on wrong/incomplete guards |
| h08-multi-turn-tool-refine | 1.00 | 1.00 | heuristic | heuristic | Text `TOOL_CALL` credited |
| h09-agent-metrics-chain | 0.50 | 0.50 | heuristic | heuristic | Partial tool credit (missing `get_metrics`) |
| h10-agent-read-grep-patch | 1.00 | 0.00 | heuristic | heuristic | Local fakes 3-tool chain; Kimi reasoning only → 0 |
| h15-max-signal-v3 | 0.67 | 0.00 | heuristic | heuristic | Local partial tools; Kimi no text tools → 0 |

**Judge LLM used:** local **0/12**, remote **2/12** cases.

---

## Root causes

### 1. Fake `TOOL_CALL` text counts as real tool use

`extractToolCallNames()` matches `TOOL_CALL name=…` in **free text**. The 1.2B local model routinely **hallucinates** tool-call syntax without API `tool_calls`.

Examples from local responses:

- `h06`: `apply_patch` with invalid diff `"const MODE = 'baseline'; const MODE = 'difficulty';"` → **score 1**
- `h10`: three fake tools including nonsense patch `const isAdmin = true` → **score 1**
- `p17`: fake `read_file`/`apply_patch` on nonsense paths → **score 1**

Kimi often outputs **chain-of-thought** (`"The user wants me to…"`) without the `TOOL_CALL` prefix → **`required_tool_call` forces score 0** via `min(content, tool)`.

### 2. `accept_patterns` award full credit for keyword presence

Heuristic grader returns **1.0** on first regex match. Cases like `h07-multi-turn-sla-guard` match `throughput|sla|sole|candidate|fallback|allow` in **incorrect** code or prose.

Local `h07` code is wrong (`!allowList.includes`) but scores **1.0**.

### 3. Judge rarely applies (JSON parse failure)

`gradingMethod: judge` appears only on remote `h01` and `h02`. For all other cases the judge response did not parse as JSON (`parseJudgeGradingResponse` returned null), so grading fell back to heuristics.

Kimi-as-judge tends to answer with **prose + reasoning**, not `{"score":…,"rationale":…}` only. `max_tokens: 256` may truncate JSON.

### 4. Judge error on h02 (false pass for remote)

Remote `h02` returned the **unchanged buggy snippet** (still prints 1). Judge rationale claims it works and scores **1.0**. Local same output scored **0.25** (heuristic). This is a **false positive** on the capable model.

### 5. `required_tool_call` gate dominates content quality

When `required_tool_call: true` and no detected tools:

```ts
score = Math.min(contentGrade.score, toolGrade.score) // toolGrade.score === 0
```

Even when concatenated rationale says *"aligns with expected workflow"*, final score is **0**. Kimi loses 5 cases (p17, x01, h06, h10, h15) primarily for this.

### 6. No response artifacts on disk for this run

Run predates / missed two-phase artifact persistence; audit relies on `actualPreview` (240 chars) in result JSON. Full responses needed for deeper review.

---

## Recommended fixes (priority)

1. **Count only API `tool_calls`** for tool grading — never regex on model text.
2. **Require judge JSON** when `useJudge` — retry on parse failure; raise `max_tokens` to 512+.
3. **Cap heuristic `accept_patterns` at ≤0.5** — never 1.0 without judge confirmation.
4. **Strip / separate chain-of-thought** before grading (Kimi coding endpoint exposes reasoning in `outputText`).
5. **Code cases:** run static checks (e.g. h02 must contain `Mutex`/`await`/serialization; h06 diff must match `---`/`+++` hunk format).
6. **Blind judge prompt:** grade only the actionable answer portion; explicitly penalize fake tool syntax in prose.
7. **Persist full responses** per run for manual audit (two-phase artifacts).

---

## Re-score estimate (qualitative)

If tools must be **real API tool_calls** and keywords cannot auto-pass:

- **Local** would drop sharply on p17, h04–h10, h06 (fake tools).
- **Remote** would rise on p17, x01, h06, h10, h15 (workflow reasoning currently zeroed).
- **h02** remote should fall (judge false pass).

Expected ordering after fixes: **remote > local** on this suite, which matches model size/capability prior.
