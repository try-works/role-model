# Task-118 - observe-routing taxonomy/strategy filter gap closed

## Host acceptance (verified first)
- POST /api/role-model/telemetry/query on production :3456 echoes every reference key in appliedQuery.filters:
  sourceTypes, difficultyBuckets, requestedRoleIds, selectedStrategies, reasoningEfforts, effortSources,
  taxonomyGroupIds, taxonomyRoleIds, taxonomyTaskTypes, taxonomyTaskVariants, taxonomyCapabilityIds,
  taxonomyModalityIds, taxonomyToolClassIds (t118-host-filter-keys.log).

## Product
- Model.observeRoutingFilters gains the optional Advanced fields; ObserveFilterFieldSchema gains their field names.
- URL restore reads the reference query params (roleId, strategy, effort, effortSource, taxGroup, taxRole, taxTask,
  taxVariant, taxCapability, taxModality, taxTool) and opens the Advanced section when any is present.
- observeFilterBar renders the reference Advanced controls (11 text fields with data-observe-filter attributes) and
  dispatches ObserveFilterChanged; every change reloads the nine routing charts.
- routingChartFilters maps single ids to one-element arrays and comma-separated values to trimmed arrays, then
  buildRoutingChartQueries puts the same filters object into all nine POST bodies.

## Tests
- s637: exact mapping + all nine payloads; URL restore (inputs show restored values, nine entry bodies carry the full
  filter object); advanced-field change re-queries all nine with the updated key.
- RED t118-advanced-filters-red.log (3/3 failed: mapping ignored keys, no restore, no inputs) ->
  GREEN t118-advanced-filters-green.log (3/3 in a clean worktree at the pre-change commit + task-118 files; tsc 0).
- Clean-worktree full suite: 111 files / 984 tests PASS excluding s48a-build (detached-junction build artifact),
  node batch PASS (t118-full-ui.log). S247 4/4 (t118-s247.log, no new clicks).
- Packaged host (:3484, seeded state, main dist): advanced URL restores all 11 inputs, expanded aria=true, nine
  analytics POSTs, nine cards rendered (empty states are honest because the filter slice matches no seeded row).
  Evidence: t118-advanced-filters-3484.png, t118-advanced-filters-dom.json.

## Note
- The shared main worktree was concurrently dirty with another lane's system-extensions work; the commit
  e397ac05 was built from clean versions of only the task-118 files (and that lane's uncommitted copies were
  restored afterwards). Shared-tree tsc/suite remain unverified until that lane settles.
