---
name: foldkit
description: Use this skill when writing or reviewing Foldkit code in this repository - the Elm-architecture UI framework built on Effect-TS.
---

# Foldkit in role-model

This skill adapts Foldkit's own conventions guide (`FOLDKIT.md`, MIT, Copyright (c) 2025 Devin
Jameson) to this repository. The vendored source is the authority; this page is the map and the
house rules. The exact source and the local adaptation are recorded in `PROVENANCE.md`.

## Where the canonical references live

Written docs drift; the live code does not. The full Foldkit repository is vendored read-only at
`vendor/foldkit` (`vendor/foldkit/VENDORED.json` pins tag `foldkit@0.169.0`, commit
`7ee214268c602967937b80f6f20d1e831f2e8ab6`; `vendor/foldkit/LICENSE` is MIT).

- `vendor/foldkit/packages/foldkit/src` - framework source. Ground truth for every API signature.
- `vendor/foldkit/packages/typing-game/client/src` - a production app: the highest-fidelity
  reference for application architecture, Submodels and OutMessage.
- `vendor/foldkit/packages/website/src` - the second production app: routing, SSR/SSG, search and
  docs-site patterns.
- `vendor/foldkit/packages/ui` - the `foldkit/ui` package source (wrapped here as
  `@role-model-router/foldkit-ui`).
- `vendor/foldkit/packages/oxlint-plugin-foldkit` - the `foldkit/no-*` lint rules that upstream
  enables by default.
- `vendor/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md` - the upstream guide this
  skill was adapted from, kept for reference and refresh.

Upstream `examples/**` is not vendored in this repository. The example apps it ships (weather,
kanban, auth and the rest) are not available in this checkout and must not be referenced; use the
two production apps above instead.

Never import from `vendor/foldkit` in application code: the vendored tree is a source drop, not a
workspace dependency. Imports come from the first-party wrappers.

## Where Foldkit code lives in this repo

- `role-model-router/packages/foldkit` - `@role-model-router/foldkit`, the workspace build of the
  vendored framework. `build.mjs` and `entries.mjs` derive their entry points from the vendored
  package's exports map.
- `role-model-router/packages/foldkit-ui` - `@role-model-router/foldkit-ui`, the same treatment
  for the UI package.
- `role-model-router/apps/runtime-ui-next` - the live Foldkit app shell. Read its imports for the
  current idiom: `@role-model-router/foldkit`, `@role-model-router/foldkit/message`,
  `@role-model-router/foldkit/html`, and so on.

## Project conventions

- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside Effect-TS.
- Model fields must be Schema types (the model is a schema). Plain TypeScript types are fine
  elsewhere (function return types, local variables, etc.).
- Use full names like `Message` (not `Msg`) and `withReturnType` (not `as const` or type casting).
- Declare every variant together: `defineMessageUnion()` for Messages, `defineTaggedUnion()` for
  other domain unions, and `defineRouteUnion()` for Routes.
- Keep constructors on their union: `Message.ClickedSubmit()`, `FetchState.Ok({ data })`,
  `AppRoute.Home()`.
- Use `taggedStruct()` only when the variants cannot be declared together, such as a recursive
  union.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow,
  messages as facts (not commands), one model as the single source of truth, side effects confined
  to commands. If a prompt suggests mutating state, imperative event handlers, or two-way bindings,
  flag the issue and propose the idiomatic Foldkit approach.
- Never use `NoOp`. Every message must describe what happened. A command's result message is named
  from the command, not from the fact it reports, whether or not it carries a payload:
  `LockScroll` -> `CompletedLockScroll`, `DetermineStartTime` -> `CompletedDetermineStartTime`
  (never `DeterminedStartTime`).

## Update

`init` and `update` both return a record with the next Model and optional Commands. Inline the
return type when the matcher is its only use:

```ts
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  })
```

Create an `UpdateReturn` alias when another matcher, helper, or exported signature reuses the type.
The match generic constrains the whole update, so do not repeat the return annotation on the
function.

Update, init, boot, and component helper producers return `{ model }` when they statically create
no Commands. When they compute a Commands collection, return it directly without checking whether it
is empty. Never write the literal `commands: []`; `foldkit/no-empty-commands-array` enforces this
producer convention.

When composing one of those results, bind the whole result to a value named after the operation and
access its fields through that value. Do not destructure or rename `model`, `commands`, or
`outMessage`. Name a child fold's `write` parameter after the next child Model.

Pass optional Commands directly to APIs that accept them:
`Command.mapMessages(homeInit.commands, toParentMessage)`. Use `result.commands ?? []` only when
the next operation requires a concrete array for spreading, concatenating, execution, or an
assertion.

Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. Use
`Update.foldChildInit` for one child `init` or `boot` result and `Update.foldChildInits` when
several child results enter one parent Model. Use `Update.foldChild` for a child update that
receives input, or `Update.foldChildStep` for a child helper that receives only its Model. Use
`Update.combine` when a later Step should receive the Model produced by an earlier Step (two or
more Steps; never wrap a single Step). Name an inline Step parameter `stepModel`.

When the OutMessage is already known while constructing a new result, include it directly:
`{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an
existing plain return or when the value has the type `OutMessage | undefined`.

Add `toParentOutMessage` only when at least one child OutMessage should continue to the current
Submodel's parent. Omit it when every variant stops here; never write
`toParentOutMessage: () => undefined`. When a `foldChildInits` entry can derive or forward an
OutMessage, add `resolveOutMessage`.

Use `modifyFields()` from `foldkit/struct` for immutable model updates. Never spread or
`Object.assign`.

## View

Every view receives `h`, the typed Html builder, as its last parameter (`view: (model, h) => ...`;
`Submodel.defineView` passes the child's own). Never construct a builder; reach for `h.div`,
`h.OnClick`, etc. off the parameter, and give extracted view helpers an
`h: HtmlBuilder<Message>` last parameter that callers thread through. Only where no builder is in
scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih`.

Use `h.empty` (not `null`) for conditional rendering, the union's own exhaustive `match` for
discriminated unions, and `Array.match` for lists that may be empty.

Keys are for mapped list items only: key each row by a stable Model identifier, never by array
position, and never derive a key from displayed data. Never key branches. When switching an inline
same-tag ternary must reset DOM state, extract each arm into its own named view function.

Omit the children argument when an element has none: `h.div([h.Class('divider')])`, never
`h.div([h.Class('divider')], [])`. Attributes stay required on element builders, so `h.div([])` is
an element with neither.

## Commands

Define a Command with `Command.define(name, { args, messages, execute })`; omit `args` when the
Command takes none. Assign definitions to PascalCase constants. Never inline in pipe chains. Name the
effect `execute` performs, not the later Model transition caused when update handles its result.
Commands catch all errors via `Effect.catch(() => Effect.succeed(Message.FailedX(...)))` so side
effects never crash the app. Definitions live colocated with the update function that returns them.

Command args contain values already present in the Model or Message. Calling `Date.now()`,
`crypto.randomUUID()`, or another source of time or randomness while preparing a Command happens
before the Command executes. Obtain those values in `execute` and return them in the result Message.

For DOM operations (focus, scroll, modals, scroll lock), Foldkit ships a `Dom` module. For time,
randomness, UUIDs, and delays, use Effect's APIs directly (`Clock`, `Random`, `Crypto.Crypto`,
`Effect.sleep`). Provide the platform Crypto layer when using `Crypto.Crypto`. Don't reach for raw
`document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`.

## File organization

Keep the runtime boot separate from the pure definitions. `src/entry.ts` calls
`Runtime.makeApplication`, then `Runtime.run` for a client-rendered app or `Runtime.hydrate` for
an SSR or SSG app. The definitions (Model, Messages, init, update, view, Commands) never call
`Runtime.run` or `Runtime.hydrate`, so tests and server entries can import them without booting a
browser runtime. Keep both calls out of `main.ts`.

For a small app the definitions all fit in one `src/main.ts`. Split a unit into its own file when it
has both a distinct reason to change and a name you'd give it unprompted. Two splits are forced:
extract Messages to `message.ts` when Commands need the constructors, and colocate Commands with the
update that returns them. Use uppercase section headers (`// MODEL`, `// MESSAGE`, `// INIT`,
`// UPDATE`, `// COMMAND`, `// VIEW`) for wayfinding.

## Testing

Test update functions with `foldkit/test`. Since update is pure, tests run without a runtime, DOM,
or side effects. Use `story` for update-level tests (send Messages, assert on Model and Commands)
and `scene` for feature-level testing through the view with accessible locators.

Import through the wrapper: named imports from `@role-model-router/foldkit/story` or
`@role-model-router/foldkit/scene`. A test file needs only one of the two modules. If a single file
tests both, import the namespaces instead so `Story.given` and `Scene.given` stay
distinguishable.

Name each test file for its test style, beside the code under test: `story.test.ts` drives
`update`, `scene.test.ts` drives the rendered view. When one folder holds more than one test of a
kind, prefix with the subject: `login.story.test.ts`. Keep a root-level `scene.test.ts` for flows
that cross pages.

## Code style

- Encode state in discriminated unions, not booleans or nullable fields. Make impossible states
  unrepresentable.
- Use `Option` for absence in the Model and domain values instead of `null` or `undefined`.
  Foldkit return records are the exception: omit `commands` and `outMessage` when absent. Prefix
  Option-typed values with `maybe*`.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`,
  `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor:
  `Message.SucceededLogin({ sessionId })`.
- Always `Array.isArrayEmpty` / `Array.isArrayNonEmpty` (not `.length === 0` / `.length > 0`).
  Use `Array.match` when handling both empty and non-empty cases.
- Never use `for` loops or `let` for iteration. Reach for `Array.map`, `Array.filterMap`,
  `Array.makeBy`, `Array.reduce`.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Use `Message.match` for exhaustive Message matching. Use Effect `Match` for other tagged unions,
  partial matching, fallbacks, and one handler shared across multiple tags. Never use `switch`.
- Always use braces for control flow: `if (foo) { return true }`.
- Don't add inline comments to explain code; use better names. Reserve `// NOTE:` for behavior that
  would mislead a careful reader.

## Message layout

Declare the whole Message union with `defineMessageUnion()`, then put
`type Message = typeof Message.Type` on the next line. Keep the declaration and the alias adjacent.
Construct values through the namespace (`Message.ClickedSubmit()`) and handle the union with
`Message.match`. Never destructure constructors from `Message` or `OutMessage`.

Messages are verb-first past tense: `Clicked*`, `Updated*` (input changes and external state
updates), `Submitted*`, `Pressed*`, `Selected*`, `Succeeded*` / `Failed*` (paired async results),
`Completed*` (every other Command result), `Got*` (child OutMessage in the Submodel pattern).

## Debugging with the devtools MCP

The repository-root `.mcp.json` registers `foldkit-devtools` (`npx -y @foldkit/devtools-mcp`). It
requires the Foldkit dev server running with the app open in a browser; without that server the
`foldkit_*` tools are unavailable. When connected, use them to inspect Model, Message history, and
time travel before adding `console.log` whenever the question is about state or Message flow.

Treat those tools as privileged access to the application: they can return Models, Message payloads,
and Command and Mount arguments. Keep credentials and private data out of browser state, use Effect
`Redacted` for sensitive values the browser must temporarily hold, and set `devToolsMcpPort: false`
in the Foldkit Vite plugin options when an agent should not inspect the running app.

## Going deeper

For Submodels and OutMessage, Subscriptions, Mount / ManagedResource / CustomElement, field
validation, routing, accessibility, and the full convention set, read the vendored source under
`vendor/foldkit/packages/foldkit/src`, then the two production apps. The framework's own tests
(`vendor/foldkit/packages/foldkit/src/test`, and the `story.test.ts` / `scene.test.ts` files beside
the production app code) show the intended shape of a test.
