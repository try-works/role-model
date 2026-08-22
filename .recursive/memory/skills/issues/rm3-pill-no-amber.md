# RM3 warning pill ink must not use amber (issues)

Type: incident
Status: CURRENT
Scope: runtime-ui RM3 chrome / status pills
Owns-Paths: role-model-router/apps/runtime-ui/app/app.css; role-model-router/packages/ui/**
Watch-Paths: role-model-router/apps/runtime-ui/**; role-model-router/packages/ui/**
Source-Runs: 86-runtime-ui-rm3-design-system-frontend
Validated-At-Commit: working-tree run-86 Phase 8 closeout
Last-Validated: 2026-08-01
Tags: runtime-ui, rm3, design-system, status-pill, charts

## Issue

RM3 chrome warning/status pill **ink** must not use amber. Amber/yellow semantic accents are reserved for **chart** semantics (`--rm3-chart-*` / `--rm3-light-chart-*`) only. Operator polish P8 fixed warning pill ink to muted-foreground; do not regress to amber on chrome pills/badges.

## Guidance

- Use `Badge` tones or muted foreground for warning chrome states (see P2/P8 in run-86 addendum-01).
- Keep amber/yellow on Recharts/plot semantics only, per Graph palette rules.
- When restyling status surfaces, grep for amber/yellow on non-chart CSS and reject drift.
