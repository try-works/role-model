# S571 — reference-grounded story contract green

After the owner direction that stories/scenes must be based on :3456 and the UI built to them, the capture was rebuilt (story-dump: 1806x963 emulation, headings incl. chart-card titles, HTML + role=table column sets, control field labels + visible values) and the catalogue regenerated from it.

Scene result: test/s565-page-stories.scene.test.ts 40/40 pass — every route now shows the captured reference sections in order, the reference table columns, and the named reference controls. Per-route fixes landed by the workers: Router tables always render headers, RouterAgentStrategy posture selects, Providers provider/model pickers, Endpoints runtime-connections headers, ObserveRouting/Requests/Index filter accessible names, Benchmark scores table, Models/ModelsRoles empty-state cards + role selects, LearningDecisions filters, LearningEvidence guardrail table, LocalLogs reference columns, Runtime four reference cards, SystemOperator heading order.

Open follow-ups recorded: runtime-config editor needs its own reference route (/app/control/runtime-config exists in the reference), Models/ModelsRoles state surfaces must coexist with always-rendered reference cards, and stale s540 density copy.
