# S245 Foldkit "Workspace" reference: what it is, what we can use now, what needs a bump

References supplied: preview site `/example-apps/workspace`, source `examples/workspace/src` on
`codex/layers-and-submodels`, PR #1655. Analysed at the PR's verified snapshot
`f3be22cfeefed437164ad614d08b16d9000e0703`.

## 1. What those links actually are

PR #1655 ("feat!: build applications from Blocks and Effect Layers", **open**, branch
`codex/layers-and-submodels`) is an **integration preview**: canary packages `0.169.0-canary.f3be22cf…`,
`@foldkit/ui@0.169.0-canary…`, `@foldkit/devtools@0.169.0-canary…`, peer `effect@4.0.0`,
TypeScript `7.1.0-beta`. The PR body says the APIs "will likely change before the stable release."
The `workspace` example does **not** exist on `main` today; it is the PR's showcase (163 files under
`examples/workspace`).

Our pin is the **stable** lineage: `vendor/foldkit` at `foldkit@0.169.0`,
commit `7ee214268c602967937b80f6f20d1e831f2e8ab6` (the same commit the guide names as the stable source),
`effect` 4.0.6, TypeScript 5.9.3.

## 2. The reference architecture (read from source, not summarised from prose)

    Definition   Block.makeDefinition('Application', { Model, Message, OutMessage? })
                 -> makeStep / makeFieldsStep / makeCommandsStep / makeNoopStep
                 -> makeCommand / makeSubscriptions / makeMount / makeManagedResources
    Composition  Definition.makeComposition({ bindings, mounts }) -> makeInit / makeUpdate / makeView
                 -> makeBinding(ChildBlock, { field, key, childField, init })
                    .withOutMessagePolicy({ fold: makeOutMessageFold(Child, {...}) })
    Block        Composition.prepareBlock({ init, update, view, subscriptions, EffectsLayer })
                 -> Block.assemble(prepare)
    Program      Program.make({ block, container, Flags, routing, devTools })
    Runtime      Runtime.run(program.provide(ApplicationLayer))

Effects are **Layers**, not inline `Effect` in Commands:

    export const EffectsLayer = Layer.mergeAll(Command.EffectsLayer, subscriptions.layer)
    export const ApplicationLayer = WorkspaceRepositoryLayer

Commands are generator handlers that `yield*` services once and return a per-invocation function:

    makeCommand('LoadWorkspace', { messages: [...], handler: function* () {
      const repository = yield* WorkspaceRepository
      return () => repository.load.pipe(Effect.map(Message.SucceededLoadWorkspace))
    }})

Other load-bearing conventions:

- **OutMessage** per child block: typed child→parent protocol, folded by the parent binding. No
  hand-authored `Got*Message` variants.
- **Bindings** replace submodel plumbing. Keyed collections keep one child Model per id
  (`issueDetailInstances: Schema.Array(IssueDetailInstance)`), so a hidden editor still receives its
  result and "results stay scoped to their issue ID" (README).
- **ViewInputs** schema: a child view receives explicit props, not the global model.
- **AsyncData** (`AsyncData.Schema(Success, Error)`, `Loading/Success/...`, `hasData`, `getData`,
  `revalidateOrLoad`, `settle`) for every async read.
- **@foldkit/ui** for every single-selection control (Listbox), Dialog, DragAndDrop — "Every
  single-selection control uses Foldkit UI Listbox" (README).
- **scenes and stories** ship with the example: `scene({update, view}, given(model), click(...),
  Command.resolve(...), expectOutMessage(...))` and `story(update, given(model), message(...),
  expectOutMessage(...), Command.expectNone())`.

## 3. Our port measured against it

    src files            25
    src lines            5,467
    messages             37 (one flat union)
    Command.define       8 (execute-style, not Layers)
    subscriptions        1 (makeRefreshSubscriptions)
    Model                one Schema.Struct: readbacks, controls, studio, diagnostics, observability, ...
    entry                makeApplication({...}) + embed (stable Runtime API)
    Submodels/Blocks     0
    @foldkit/ui usage    button only (in view.ts); selects hand-rolled
    readback.ts          1,194 lines hand-rolling loading/error/stale/truncation states
    tests                vitest + happy-dom DOM assertions, node:test invariants; no story/scene

So the reference is a **different assembly model** from ours, not a styling reference. The overlap is
the feature set (routed editors, filters, dialogs, lists, keyboard interactions).

## 4. What we can adopt TODAY without any dependency change

Our vendored 0.169.0 already exports `./scene`, `./story`, `./submodel`, `./mount`,
`./managedResource`, and `@foldkit/ui` already ships listbox/dialog/dragAndDrop/tooltip navigation.
Verified by running a new scene test against our own `view` and `update`:

    test/s245-scene-smoke.test.ts
    scene({ update, view }, given(model),
      expect(role("link", { name: "Studio" })).toExist(),
      expect(role("link", { name: "Overview" })).toExist())
    -> 1 passed; whole app suite 298/298 with tsc and the 17 invariants

That matters for two concrete open problems in this run:

| Problem | Reference answers it |
|---|---|
| two `s26k-control` click tests that fail only under happy-dom | `scene` drives clicks and resolves
  Commands/Mounts declaratively instead of asserting DOM after `element.click()` |
| our rendered audit is the only click-driven check | `story` pins update-level transitions; `scene`
  pins view+interaction without a browser |
| hand-rolled `<select>` controls (source of the s177 naming defect) | `@foldkit/ui` listbox/select |

## 5. What needs the canary bump, and what it would fix for us

| Preview capability | Our open problem it addresses |
|---|---|
| `EffectsLayer` + `program.provide(ApplicationLayer)` | **R27**: "closed composition Layer DAG" —
  acquisition is still imperative in `cli.ts`; the preview makes every feature contribute a Layer and the
  Program provide one |
| Definition-owned Commands with `yield* Service` | removes `createUpdate(...)` parameter threading
  (our `createUpdate` takes 8 positional dependencies) |
| OutMessage + Bindings | our cross-feature coupling through one flat Message union and one Model |
| AsyncData | most of `readback.ts` (1,194 lines) |
| `Program`/`Program.makeElement` | cleaner host boundary than `makeApplication` + `embed` in `mount.ts` |
| `devTools: { dispatch: true }` (+ `@foldkit/devtools-mcp`) | agent-driven UI verification as Message
  dispatch, instead of our CDP audit |

## 6. Costs, risks, verification

- **Preview instability**: the PR says APIs will likely change; adopting it now means tracking a canary.
- **Peer versions**: preview expects `effect@4.0.0`; we vendor 4.0.6. Needs a compatibility check, not an
  assumption.
- **Toolchain**: preview recommends native TypeScript 7.1.0-beta; we run 5.9.3.
- **Vendoring machinery**: bumping `vendor/foldkit` means new `VENDORED.json` provenance, digest
  verification, the anti-slop/oxlint plugin pin, and a full re-run of our gate (typecheck, 298 tests,
  17 invariants, packaged gate, parity). That is a run-sized change, not an edit.
- **Migration effort**: 5,467 lines into Definitions/Compositions/Blocks is a leaf-first rewrite of the
  app shell; the guide's own order is leaves → parents → ApplicationBlock → entry.

## 7. Recommendation

1. **Now (this run, no dependency change):** keep the scene smoke test; convert the two flaky
   `s26k-control` click tests to `scene` and add `story` tests for the update transitions we currently
   assert through the DOM. This is bounded, reversible, and uses only pinned code.
2. **Next (separate change):** replace hand-rolled `<select>` with `@foldkit/ui` listbox — it removes a
   defect class (s177) and matches the reference's rule.
3. **Then (planned, not started):** prototype the Blocks/Layers assembly on a branch after the PR merges to
   `main` (the user says it will), because a stable commit is a better vendoring target than a canary.
   Prototype only the **Layer boundary** for one command family first: it is the piece that closes R27, and
   it can be evaluated without rewriting the whole shell.

## 8. What the reference is NOT

It is not a reason to halt the current port. Our port is on stable APIs, is packaged and gated, and has
parity evidence; the preview changes *how the application is assembled*, not what the runtime API surface
does. Nothing in it invalidates the current gates - it offers a better shape for the next increment.