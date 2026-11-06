# S560 — reference shell and overview layout rebase

The owner rejected the ported UI against the 0.0.20 build on :3456: the sidebar was an invented runtime rail with expanded sub-page groups, and the overview used a stat strip and one-column chart grid. This slice replaces both with the shipped React shell structure.

Shell (src/view.ts): aside w-56 with "role-model" wordmark, TEN flat section links (Overview Studio Local Remote Models Router Observe Connect System Learning), footer stack role-model-model-inventory / role-model-cache / role-model-router-endpoint; header h-12 with the reference page title and theme toggle; main max-w-[1216px] px-4 py-5 gap-6. Removed: [data-shell-rail], RUNTIME UI, the 28-item grouped nav, Dark/Light shell footer.

Overview: PageFilters layout (time-range segmented control left, four labeled selects right) and the shared ChartGrid (rounded-lg border, gap-px cells, span-12 Model pool / Token usage / Cache efficiency, span-6 Effective cost + Cost avoided + Latency + Success vs failure), ChartCard cell chrome (p-4, header -mx-4 border-b px-4 pb-3, text-sm title / text-xs description), Model pool two-column plot + candidates rail with per-candidate swatches and route-score column, scatter markers on the reference palette. Removed the invented MODELS/REQUESTS/CACHE/ROUTER ENDPOINT stat strip; period/summary moved to sr-only.

Geometry, measured at 1806x963 against :3456: aside 224x865 (ref 224x865), header 48 (ref 48), content track 1216 (ref 1216), ten 32px nav items, footer stack present. Screenshots: D:/DEV/rm-clean/audit/fold-app.png vs ref-app.png.

Tests: new test/s560-shell-layout.test.ts (RED 3/3 before). Retargeted mount/routes/s71a to the reference shell; 48/48 across the five shell suites. Test retargeting for the data-family suites and the per-family page layout ports are in flight (S561/S563/S564).
