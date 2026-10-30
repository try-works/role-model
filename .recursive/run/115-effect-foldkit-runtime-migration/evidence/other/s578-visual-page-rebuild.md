# S578 — visual page rebuild against :3456 (Requests first)

Owner direction: stop validating structure; inspect pages visually and rebuild them to the reference.

## Method
1. Capture paired screenshots at 1806x963: :3456 reference vs :51970 worktree build (D:/DEV/rm-clean/tools/shot.mjs).
2. Read both images and list concrete deltas (missing section nav, extra cards, duplicated controls, wrong control styling, missing columns, page-title duplication).
3. Rebuild the page from the reference route source (apps/runtime-ui/app/routes/*.tsx), not from headings.

## Landed this slice
- Shell: reference section sub-navigation (segmented control above content) for Studio/Local/Models/Router/Observe/Connect/System/Learning, labels and order from design-system.ts runtimeNavigationSections (committed 2bdc04f4).
- Requests page rebuilt to the reference: one filter row (segmented Time range + Breakdown + Source + Ranking metric + Ranking target), the "Advanced controls" disclosure bar with a single Expand action, then the Recent telemetry requests card. Removed the invented Ranked comparison card, the duplicated filter rows and the inline Run ranking button; the ranking listboxes now wear the reference field styling; Status family and Run ranking live inside the collapsed advanced panel.

## Visual deltas remaining on Requests
- The reference MetricStrip and chart grid inside the card appear only once telemetry loads; the port renders its own chart card below the table.
- Reference table columns beyond REQUEST/MODEL/ENDPOINT/STATUS (duration, tokens, cost, cache) are not yet rendered from the readback.

## Known deltas on other routes (from the same pair audit)
- Models: reference is a two-column Model inventory (list with controller/healthy badges + ROLES panel) followed by RUNTIME/COST/BENCHMARK fact rows; the port still renders a plain table + metric tiles. This is the next page to rebuild.
- Overview: layout matches; candidate rail scores render a dash because the readback carries no score value; chart y-axis tick styling differs.
- Studio, Local, System, Router, Learning, Observe pages: to be inspected pair by pair with the same method.
