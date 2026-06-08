# Session log

Use this file to plan work, track progress, and leave enough context for the next session.
Update it as tasks move — not only at the end.

---

## Active session — 2026-06-08

### Goal

Remove duplicate runtime UI headers: keep `AppShell` as the single route-level header; remove per-page `PageHeader` duplication.

### Plan (approved in chat)

1. Add `ShellHeaderProvider` + `usePageActions()` + `useShellHeaderOverride()`
2. Move actions into `AppShell` header top-right
3. Remove `PageHeader` from all routes
4. Update `DESIGN_SYSTEM.md` and tests
5. Verify with `pnpm test` + `pnpm build` in `runtime-ui`

### Progress

| Task | Status | Notes |
| --- | --- | --- |
| `shell-header-context.tsx` | done | Provider + hooks |
| `app-shell.tsx` actions/override slot | done | Single header |
| `app-layout.tsx` provider wiring | done | |
| Remove `PageHeader` primitive | done | |
| Migrate 33 route files | done | 18 use `usePageActions` |
| `request-detail` dynamic title | done | `useShellHeaderOverride` |
| `not-found` standalone heading | done | Outside shell |
| `future-surface.tsx` | done | Actions via hook only |
| `DESIGN_SYSTEM.md` | done | Header ownership section |
| `design-system.test.ts` guards | done | 85/85 pass |
| `runtime-ui` build | done | |

### Key files touched

- `role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx` (new)
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/routes/app-layout.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `role-model-router/apps/runtime-ui/app/routes/*.tsx` (33 files)
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

### Earlier in same session (UI polish)

- Removed accent rule from `AppShell` header
- Removed accent rule from `PageHeader` (before component removal)
- Started dev servers: UI `:5173`, bridge `:3456` (QA mode, placeholder `MOONSHOT_API_KEY`)

### Open / optional follow-ups

- [ ] Add “content starts under shell header” note to remaining page-template rows in `DESIGN_SYSTEM.md` (only `summary-board` updated)
- [ ] Remove unused `eyebrow` field from `RuntimeRouteDefinition` or document as alias of `section`
- [ ] Trim dead `eyebrow`/`title`/`description` props from `FutureSurface`
- [ ] Git commit when ready (not done in session)

### How to verify

```bash
cd role-model-router/apps/runtime-ui
corepack pnpm test
corepack pnpm run build
# Manual: http://127.0.0.1:5173/app — one header, no duplicate title block
```

### For next session

- Read this file + `DESIGN_SYSTEM.md` § Shell layout / Header metadata ownership before more UI work
- Route copy is canonical in `app/lib/design-system.ts` (`RuntimeRouteDefinition`); do not reintroduce in-page title blocks
- Page-local links/controls → `usePageActions()`; dynamic titles → `useShellHeaderOverride()`

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
