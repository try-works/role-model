# S557 — independent review: S554 B6/R27 closure verification

Reviewer: `s9b-eventlog`, actual model **deepseek-flash** (verified with `list_agents`). Read-only; no source/test edits; no commit. The only write is this evidence file.

Snapshot: public worktree `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, HEAD `346d2a1c`.

## Frozen bytes verified

| Artifact | sha256 | Result |
|---|---|---|
| `test/s313-server-owner.test.ts` | `1F4B1F6DFFFD160A8EB44578A9035945B1A1FD4332F61C10EE0686744BC0B0AC` | match (6951 B) |
| `evidence/other/s310b-field-ledger.json` | `B16A7936D0C7453B0B779B4832E580B3A217B0D985C7CBD703E5CEE3AD462DF2` | match (5231 B) |

`git status` confirms the only frozen-slice changes are those two files; `composition-dag.ts`, `cli.ts`, and `index.ts` are unchanged from HEAD. The remaining dirty files are unrelated evidence/audit material.

## Verdict: **bounded PASS**

The three B6 repairs are present in the basis source, the 181-name ledger and its test hold, and the new static guard genuinely fails when the CLI wiring is dropped. The only qualification is that this is verification/closure evidence, not a new product implementation: the source repairs predate this slice, and the RED is mutation-based by disclosure.

## Source verification

- `composeBackendOwner` exposes `getRoutableInventory: () => resolveBackend()?.getEffectiveRoutableInventory?.() ?? null` at `composition-dag.ts:1108`.
- `anonymousLearningReads` is typed at `:1065` and conditionally spread into the options at `:1098`; it is omitted when unset, preserving the 181 count when absent.
- `createCliServerOptions` composes the backend owner (`cli.ts:4422-4557`); `startServer` captures `let backendOwner` at `:5272`, assigns it at `:5320`, and calls `startBridgeServer(serverOptions, backendOwner === undefined ? undefined : { backend: backendOwner, ... })` at `:5324`.
- The facade fallback is explicit: `index.ts:20881` uses `lifecycle?.backend ?? composedBackendOwnerOf(options)`, with the branded test seam only when `allowTestSeamBackend === true`; production bare options fail closed (`:20882-20888`).
- The new s313 guard at `test/s313-server-owner.test.ts:139-144` reads `src/cli.ts` and asserts the `let backendOwner`, assignment, and `{ backend: backendOwner }` call. Mutation C (`s554-red-c.log`) drops the wiring and the guard fails exactly as intended.

## Ledger verification

- `s310b-field-ledger.json` has `oldCount: 181`, `newCount: 181`, `allFields: 181`, `names.length: 181`; `missing: []`, `extra: []`, no duplicate names.
- Both restored fields are present in the names list: `getRoutableInventory` and `anonymousLearningReads`; `restored` records the same pair.
- `s310b-backend-owner.test.ts:99-118` asserts `getRoutableInventory` is a function and returns `null` without a backend, `anonymousLearningReads` is `"on"` when set, `Object.keys(options).length === 181`, and the key is absent when unset.

## RED evidence

- The three mutation REDs are disclosed as mutation-based because the three repairs already existed at basis `346d2a1c`; no product source was changed in this slice.
- `s554-red-a.log`: dropping `getRoutableInventory` fails the ledger test (`expected undefined to be a function`).
- `s554-red-b.log`: dropping conditional `anonymousLearningReads` fails the ledger test (`expected undefined to be 'on'`).
- `s554-red-c.log`: dropping the CLI wiring fails the s313 guard (`startBridgeServer(serverOptions, { backend: backendOwner })` no longer matches).
- All three are full vitest outputs with nonzero exit; the corresponding green run is `s554-green.log`.

## Independent gates

- **25/25** tests across `s310b`, `s313`, `s324`, `s327`, `s330` (5 files), exit 0.
- Host `tsc --noEmit -p tsconfig.json`: **0**, exit 0.
- s247 synthetic-click budget: **3/3**, exit 0.
- Anti-slop on the new s313 guard: **0 findings**; `composition-dag.ts` 161 and `cli.ts` 1035 are the unchanged baseline levels.

## Caveats (non-blocking)

- This closes B6/R27 as a verification/ledger slice only; it is not a claim that the whole composition DAG or whole R27 is newly implemented. The three source repairs are pre-existing at the basis.
- `s310b-tdd.json` records historical hashes for earlier source revisions; they are not the current basis hashes, so it should not be read as verification of the frozen bytes. The current source is verified above.
- The s313 guard is a static source-text regex; it prevented the actual wiring-drop mutation, but a future refactor that preserves the strings without wiring could evade it. It is a regression tripwire, not a behavioural substitute.
- Mutation RED was not re-executed by this read-only reviewer; it is accepted from the full retained logs, while the current tests and source were rerun independently.

## Bottom line

Bounded PASS for the S554 B6/R27 closure verification. The source contains the composed Backend owner, the two restored option fields, the conditional `anonymousLearningReads`, the CLI `{ backend: backendOwner }` wiring with facade fallback, and a 181-name ledger; the static guard is mutation-sensitive and all requested gates pass. No source edits or commit were made.
