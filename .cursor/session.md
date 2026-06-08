# Session log

Use this file to plan work, track progress, and leave enough context for the next session.
Update it as tasks move — not only at the end.

---

## Active session — 2026-06-08 (design-system cleanup)

### Goal

Close design-system debt after the single-shell-header refactor: align docs, slim `RuntimeRouteDefinition`, simplify `FutureSurface`, remove metadata-strip spec entirely (Option C).

### Plan (approved)

- **Phase A:** Documentation & spec cleanup
- **Phase B:** Remove `eyebrow`, `noteTitle`, `noteBody` from `RuntimeRouteDefinition`
- **Phase C:** Slim `FutureSurface`, tests/guards, verify build

### Progress

| Task | Status | Notes |
| --- | --- | --- |
| A1 Page template global rule + 9 row prefixes | done | `DESIGN_SYSTEM.md` |
| A2 Remove metadata strip from spec (Option C) | done | Core rule §6 rewritten; no deferred strip |
| A3 Document `usePageActions()` only for actions | done | Header metadata table |
| A4 `FutureSurface` scaffold rules | done | No title/eyebrow props |
| B1 Remove `eyebrow` from route definitions | done | `design-system.ts` |
| B2 Remove `noteTitle` / `noteBody` | done | `design-system.ts` |
| C1 Slim `FutureSurface` API | done | `{ notes, actions? }` only |
| C2 Test/guard updates | done | `design-system.test.ts` |
| C3 Build verification | done | 86 tests pass; build OK |

### Explicitly out of scope

- Three-card metadata strip UI — **removed from spec**, not deferred
- Static actions in `RuntimeRouteDefinition` — rejected

### Key files touched

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/components/future-surface.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

### Prior session — header refactor (2026-06-08)

Completed earlier same day: `ShellHeaderProvider`, removed `PageHeader`, migrated 33 routes. UI refactor changes may still be uncommitted in working tree alongside this cleanup.

### For next session

- Route copy canonical in `design-system.ts` only (`section`, `title`, `description`, `template`)
- Page actions → `usePageActions()`; dynamic titles → `useShellHeaderOverride()`
- Read `DESIGN_SYSTEM.md` § Shell layout / Header metadata ownership / Page templates before UI work

---

## Template (copy for new sessions)

```markdown
## Active session — YYYY-MM-DD

### Goal
...

### Plan
1. ...

### Progress
| Task | Status | Notes |
| --- | --- | --- |

### Open / optional follow-ups
- [ ] ...

### For next session
...
```
