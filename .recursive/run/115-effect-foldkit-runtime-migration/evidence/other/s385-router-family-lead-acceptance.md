# S385 — F-URL Router family Lead acceptance

- Reviewer: s9 (deepseek-flash) PASS (no HOLD) — evidence/other/s384-router-family-review.md sha256 `A909F1CE97D49AF1BAF577B0C2C9B6220259764CFFBAD01683EF7523CF1597F8`.
- Committed bytes verified by Lead per the S384 frozen hashes (route/legacy-redirects/view/init/readback/runtime-endpoints + s383/s269 tests).
- What landed: ONE real router/config readback projects four read-only routes (/router/strategy, /router/workloads, /router/config, /router/agent-strategy) with honest loading/error/empty states; both pending redirects (/app/control/routing-strategy, /app/router/config) resolve to /router/strategy via a single history-replace Command with query/hash preserved; MISSING 14→10; 53 = 42 supported + root + 10 missing. 126/126, UI tsc 0, lint clean.
- F-URL progress: 42 of 53 canonical families. Remaining: Learning panels (5), llama-swap (3), operator/extensions (2) per S379.
