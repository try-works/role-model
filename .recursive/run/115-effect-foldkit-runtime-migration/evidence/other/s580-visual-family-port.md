# S580 — visual family port (worker slices)

Owner direction: each page must be compared visually with the preserved :3456 build and rebuilt from the reference source, not just heading-matched.

## Frozen worker slices
- Router family (`src/router-family-view.ts`): page-level H2/Preview banners removed; controller rebuilt as a 2-column card grid with controller/active pills and inline ENDPOINT/SOURCE/HEALTH/TOOLING/ROLES/ROLE COUNT/SERVING rows; decisions as one ledger card with 10 horizontal six-field rows and a source pill; candidates as one outer card with 2-column inner cards; workloads order Workloads -> diagnostics -> templates -> entries with buttons moved to the entries editor and saved/new counters; router overview alias stats mapped plus "Browse all alias pools (N)".
- Learning family (`src/features/learning/routes.ts`): reference operator-token card, live replay & evaluation panel, packs/decisions/evidence/history loading panels with reference tables kept in the DOM, decisions 3x2 filter grid, history chart removed.
- Studio (`src/features/studio/routes.ts` + `src/features/layout/reference.ts`): reference tab strip from the shell, Request/Result 4:8 grid, select controls and labels, full-width CTA, per-tab result card without the extra Raw response card; shared reference spacing (card gap/header/body, 16 section gap, 60ch description).
- Local/System/Learning supplements deduplicated (`src/features/density/supplements.ts`, `src/features/s563-layout.ts`).

## Pair evidence (D:/DEV/rm-clean/audit)
- Router: pair-ref-*/pair-fold-* for router, strategy, agent-strategy, workloads, controller, candidates, decisions; hashes in s5-router-pairs-hashes.txt.
- Learning: pair-ref-learning*, pair-fold-learning*; Studio: 5 tab pairs.
- Local: pair2-fold-*; System: fold4 pairs.

## Verified state
- tsc 0; build PASS.
- Structure equal on Learning (6/6), Studio (5 tabs), Local (8 routes), System (5 routes), Router layouts (7 routes). Remaining deltas are vertical rhythm (5-90px), data mapping gaps (empty readbacks: alias mode mix, effort/live metrics, decision model/timestamp), and two Studio card heights.
- Functional regressions found by review (Providers device-auth/provider-account, Endpoints admission, readback loading/error states on six family pages) are being restored by the families-view owner while keeping the reference layout.
