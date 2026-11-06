# S541 - deepen learning/models/studio pages to reference density

Status: pending
TDD Mode: strict per page + density gate
Public basis e29d8fc2; methodology in evidence/other/s539-corrected-audit.md and S538.

Targets and current ratios: /learning/packs 0.63, /learning/evidence 0.44, /learning 0.83, /learning/decisions 0.82, /learning/history 0.82, /models 0.76 (roles data-empty), /studio/advanced 0.48, /studio/audio 0.56, /studio/images 0.60, /studio/rerank 0.71, /studio/chat 1.29 ok.

Read the reference React sources (learning.tsx and its panels, studio*.tsx, models routes) and the reference text JSONs; render every reference sub-section, metric block, table column set and control verbatim, with honest empty states where data is absent. Keep s491 ranking listboxes, s525/s533/s534 suites and the learning ladder behaviour green.

Strict RED per page (reference sub-section labels + envelope fail on HEAD). Acceptance per page: reference headings present AND route-dump textLen >= 0.9x after fixture traffic with a 5s settle; record evidence/logs/s541-audit.log. Suites + UI tsc 0 + s247 3/3 + nonempty lint zero added-line; freeze hashes; independent review; no commit.