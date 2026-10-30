# S569 — reference stories captured from :3456

Owner direction: stories/scenes must be based on the :3456 reference, then the UI is built to them.

## Capture
D:/DEV/rm-clean/tools/story-dump.mjs (CDP, 1806x963 emulation, 5s settle, fonts ready) captures per route: header title, ordered main headings (h1-h4 + [data-slot=chart-card-title]), tables and their column headers (HTML tables and role=table/columnheader grids), buttons, comboboxes, select/input labels, main card rects and chart-grid cell spans, text length. batch-story.mjs walks the 50 canonical :3456 routes; output D:/DEV/rm-clean/audit/story/stories.json.

## Generated contract
test/support/page-stories.ts (regenerated from the capture): per tag, title, ordered section headings (deduped), table column sets, control labels, text length; plus the five studio tab stories.

## Scene test
test/s565-page-stories.scene.test.ts now asserts against the capture: headings in order, every reference table column set present, every named filter control present. First run: 25/40 pass; 15 routes fail (Benchmark, Endpoints, Index, LearningDecisions, LearningEvidence, LocalLogs, Models, ModelsRoles, ObserveRouting, Providers, Requests, Router, RouterAgentStrategy, Runtime, SystemOperator) - the build-out worklist in evidence/logs/s569-reference-story-red.log.
