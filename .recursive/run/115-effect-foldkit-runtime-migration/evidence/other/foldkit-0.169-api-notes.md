# Foldkit 0.169 API digest (read from the vendored source)

Pin: vendor/foldkit/VENDORED.json:6 (tag 'foldkit@0.169.0'), :7 (commit
'7ee214268c602967937b80f6f20d1e831f2e8ab6'), :33 (contentDigest
'14a19d180fd43784b1c11073d9c7c6efa3a599c43b2fb8e5bcbd64136ed8322d'). The payload
excludes '**/dist/**' and 'scripts/**' (VENDORED.json:19-27), so everything below is read
from the TypeScript sources, never from a published build.

Citation convention: 'src/...' means 'vendor/foldkit/packages/foldkit/src/...' and 'ui/src/...'
means 'vendor/foldkit/packages/ui/src/...'. Line ranges are inclusive. Where the source does
not settle a question, the section says UNKNOWN instead of inferring from React habits.

This digest was produced read-only; no product code was written for it.

## 1. How an application is defined and run

### 1.1 The program definition

'makeApplication' is the entry point for a page-owning program:

- src/runtime/makeApplication.ts:26-54 defines BaseApplicationConfig. The load-bearing fields:
  'Model: Schema.Codec<Model, any, unknown, unknown>' (line 33),
  'update: (model, message) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>'
  (lines 34-37), 'view: (model, h: HtmlBuilder<Message>) => Document' (line 38), optional
  'subscriptions' (lines 39-43), 'container: HTMLElement | null' (line 44), optional 'ports'
  (line 45), 'resources?: Layer.Layer<Resources>' (line 51), 'managedResources' (line 52),
  'freezeModel' (line 49) and 'preserveScroll' (line 50).
- 'init' comes in four forms: plain (src/runtime/makeApplication.ts:137-143), with Flags
  (117-121), with a Url (94-99), or with Flags and a Url (72-78). The public helper types are
  ApplicationInit / RoutingApplicationInit (src/runtime/makeApplication.ts:145-172).
- The Message type parameter is constrained to a tagged value: 'Message extends { _tag: string }'
  (src/runtime/makeApplication.ts:180-182).
- The update return is a plain record, not a tuple: 'Readonly<{ model: Model; commands?:
  Commands<Message, R>; outMessage?: never }>' (src/update/update.ts:37-44). 'Update.Commands'
  is 'ReadonlyArray<Command<Message, never, R>>' (src/update/update.ts:16-18).

A complete real example is vendored under packages/typing-game:

- Model: Schema.Struct (packages/typing-game/client/src/model.ts:6-11).
- Message: 'defineMessageUnion({...})' (packages/typing-game/client/src/message.ts:7-16).
- init: returns '{ model, commands }' and maps child Commands (packages/typing-game/client/src/init.ts:11-40).
- update: a pure '(model, message) => { model, commands? }' (packages/typing-game/client/src/update.ts:95-113).
- view: '(model, h) => Document' returning '{ title, body }' (packages/typing-game/client/src/view/view.ts:15-60).

### 1.2 Running a program

The runtime/public.ts surface is exactly: SlowPhase, defaultSlowCallback, embed, hydrate,
makeApplication, makeElement, run (src/runtime/public.ts:1-9). There is no separate
'mount to node' function exported there.

- 'run(program)' starts the program and owns the page for its lifetime. The first render builds
  DOM fresh in the configured container, replacing what is there; doc at
  src/runtime/start.ts:106-110, overloads at 111-124, implementation at 125-130. It boots via
  'BrowserRuntime.runMain' (src/runtime/start.ts:92). A Flags app passes
  'RunOptions<Flags, Resources> = { flags: Effect<Flags, never, Resources> }'
  (src/runtime/start.ts:17-23).
- 'hydrate(program)' adopts a server-rendered DOM in place instead of building fresh; doc at
  src/runtime/start.ts:150-173, signature at 174-184, options 'HydrateOptions' (buildId) at
  132-148. Server rendering/hydration are marked @experimental there.
- 'embed(program)' starts the program under a host-controlled lifecycle and returns an
  'EmbedHandle' with schema-typed inbound/outbound Ports and 'dispose()'; doc at
  src/runtime/start.ts:186-209, overloads 211-228, handle shape 284-286. A program can be
  embedded once at a time (236-243).
- The real DOM node is the 'container' config field (src/runtime/makeApplication.ts:44); the
  concrete example passes 'document.getElementById("root")' and calls 'Runtime.run(application)'
  (packages/typing-game/client/src/entry.ts:18, :29).

### 1.3 Node-scoped programs

'makeElement' is the node-scoped variant for a widget on a page the host owns: its view returns
'Html' (not 'Document') so it never touches the document head (src/runtime/makeElement.ts:24-51,
view at :36, 'container: HTMLElement | null' at :42). Its init forms mirror makeApplication
(src/runtime/makeElement.ts:53-90).

UNKNOWN: the vendored runtime/public.ts has no API that mounts a program into an arbitrary node
other than the 'container' field plus run/embed/makeElement. I did not find a separate
'mountToNode'-style function in the read surface.

## 2. How a view is described (html)

### 2.1 What a view returns

- 'Html = VNode | null' (src/html/index.ts:215); a null child renders nothing.
- 'Child = Html | string' (src/html/index.ts:216), so text children are plain strings.
- A page-owning view returns 'Document = { title: string; lang?: string; dir?: TextDirection;
  canonical?: string; ogUrl?: string; body: Html }' (src/html/index.ts:295-302). The runtime
  patches 'body' into the container, writes 'title', and manages the optional metadata
  (src/html/index.ts:268-301).
- A node-scoped view returns 'Html' instead (src/runtime/makeElement.ts:36).

### 2.2 The builder and element constructors

Views do not import element functions from a module-scope namespace; the runtime supplies a
builder typed by the frame's Message universe:

'HtmlBuilder<Message> = MessageUniverse<Message> & HtmlElements<Message> &
HtmlAttributes<Message> & { empty: null; keyed: KeyedFunction<Message>;
submodel: ... }' (src/html/index.ts:5547-5556).

- It cannot be constructed by application code; the runtime hands it to each view, and a builder
  from another frame is rejected by the Message universe marker (src/html/index.ts:5520-5538).
- Thread it as an ordinary parameter; never store it (src/html/index.ts:5540-5545).
- 'empty' is literally null (src/html/index.ts:5551, :5564).
- 'inertHtml' is a builder whose Message is 'never' for module-scope markup with no dispatch
  (src/html/index.ts:5594-5624).

Element constructors all take an attribute array and an optional children array:

'type ElementFunction<Message> = (attributes: ReadonlyArray<Attribute<Message> |
ChildAttribute>, children?: ReadonlyArray<Child>) => Html' (src/html/index.ts:3259-3262).
Void elements take attributes only (src/html/index.ts:3264-3266). The full HTML/SVG/MathML set
is declared as 'HtmlElements<Message>' (src/html/index.ts:3297-3511) and instantiated at
3513-3737; 'button' is at :3312 and 'div' at :3326.

Example: 'h.div([h.Class("card")], [h.span([], ["hi"])])'
(packages/typing-game/client/src/view/view.ts:35-59).

### 2.3 Attributes and listeners

Attributes are a single tagged enum keyed by constructor name: 'export type Attribute<Message> =
Data.TaggedEnum<{...}>' (src/html/index.ts:589-982). The shape is decisive for the port:

- Plain attributes carry values: 'Class' (591), 'Id' (592), 'Style' taking a
  'Record<string, string>' (879), 'DataAttribute' (878), 'Attribute' for a raw name/value
  (877), ARIA constructors (831-876).
- Event listeners carry a Message, not a DOM handler: 'OnClick: { message: Message; options?:
  ClickOptions }' (606), 'OnSubmit: { message: Message }' (700), 'OnFocus' / 'OnBlur' (682-683).
- Listeners that need event data carry a projection function whose return is a Message:
  'OnInput: { f: (value: string) => Message }' (686), 'OnChange' (687), 'OnKeyDown: { f: (key:
  string, modifiers: KeyboardModifiers) => Message }' (646-648), 'OnPointerDown' taking
  (pointerType, button, screenX, screenY, timeStamp, clientX, clientY, pointerId, target)
  (625-637), 'OnScroll: (scrollTop) => Message' (702), 'OnDropFiles: (files) => Message'
  (726-728).
- Some listeners return 'Option<Message>' instead (e.g. OnKeyDownPreventDefault 649-654,
  OnPointerMove 615-621), so an interaction can decline to dispatch.
- ClickOptions is declarative: defaultAction (Allow|Prevent), propagation (Bubble|Stop) and
  focusSelector (src/html/index.ts:232-243; DefaultAction/EventPropagation at 220-230).
- DOM lifecycle hooks are attributes too: 'OnMount: { action: MountAction<Message, any> }'
  (976-978) and 'OnUnmount: { message: Message }' (979-981).

### 2.4 Children, conditionals, lists, keys

- Children are ordinary arrays: both element functions take ReadonlyArray<Child> (3259-3262),
  and Child includes strings (216). The public html barrel exports no conditional or list
  combinator (src/html/public.ts:1-22 lists childAttributes, ClickOptions, createKeyedLazy,
  createLazy, DefaultAction, EventPropagation, inertHtml, TextDirection and types only).
- A conditional is therefore plain JavaScript producing Html, with 'null' (or 'h.empty') for
  nothing (215, 5551). I found no exported 'when'/'if' constructor in the html surface.
- Keyed children use an explicit helper: 'keyed(tagName)(key, attributes?, children?)'
  (src/html/index.ts:3246-3257; KeyedFunction at 3291-3295). For memoized subtrees there is
  'createLazy' / 'createKeyedLazy' (src/html/lazy.ts:229, :268; re-exported at
  src/html/index.ts:84).
- Submodel slots are keyed by 'slotId', and the documentation requires a stable per-item id
  rather than an array index when rendering a list (src/html/submodel.ts:135-143).

### 2.5 Embedding a Submodel

'HtmlBuilder.submodel' (src/html/index.ts:5553-5556) takes a SubmodelConfig
(src/html/submodel.ts:177-192):

- 'slotId: string' (181; uniqueness rules at 135-143),
- 'model: ViewModelOf<View>' (182),
- 'view: View' branded by 'defineView' (183; defineView at 92-107, SubmodelView type at 57-67),
- 'toParentMessage: (childMessage) => ParentMessage' (184),
- 'viewInputs' required exactly when the view declares it (190-192).

A Submodel publishes attribute groups for a parent to spread via 'childAttributes', which binds
each handler to the child boundary's wrap chain (src/html/childAttribute.ts:17-42, :47-87).
OutMessage handling is done by the parent with 'Update.foldChild' (src/html/submodel.ts:172-175).

## 3. Commands, subscriptions and Effect integration

### 3.1 Update contract

The update signature returns the next model plus Commands, never performs effects itself
(src/update/update.ts:37-44). Steps compose with 'Update.combine' (src/update/update.ts:100-147):
steps only accumulate Commands and "no Command runs during the fold. The runtime runs the batch
after update returns" (src/update/update.ts:124-127).

### 3.2 Commands are data carrying Effects

'Command<T, E = never, R = never>' is 'Readonly<{ name: string; args?: Record<string, unknown>;
key?: string; effect: Effect.Effect<T, E, R> }>' (src/command/index.ts:12-24).

- 'Command.define(name, { args?, messages, interrupt?, execute })' (src/command/index.ts:130-166,
  overloads 220-290). 'args' is a Schema.Struct field map; 'messages' is a non-empty array of
  result Message schemas; 'execute' returns an Effect whose success is one of those Messages.
- Constructing a Command never runs execute; a with-args body is wrapped in 'Effect.suspend' so
  it cannot run inside the pure reducer (src/command/index.ts:116-128, doc at 139-142).
- 'messages' is required so the runtime, DevTools and the test harness have a result reference
  (the same rule is stated for Mounts at src/mount/index.ts:227-235).
- Commands in one batch run concurrently with no execution-order guarantee
  (src/command/index.ts:157-159).
- Interruption is opt-in: 'interrupt: true' keys by name, or '{ keyFields, toKey }' keys by args
  (src/command/index.ts:83-101, :144-166).
- 'Command.mapEffect' (src/command/index.ts:402) and 'mapMessage' / 'mapMessages' (447, 512)
  lift a Command into another Message context; this is how parent init/update adopt child
  Commands (packages/typing-game/client/src/init.ts:22-32).

Concrete example: 'Command.define("NavigateInternal", { args: { url: Schema.String },
messages: [Message.CompletedNavigateInternal], execute: ({ url }) => pushUrl(url).pipe(
Effect.as(Message.CompletedNavigateInternal())) })' (packages/typing-game/client/src/update.ts:15-20).

### 3.3 Subscriptions are dependency-derived Streams

'Subscriptions<Model, Message, Services> = Readonly<Record<string, Subscription<Model, Message,
any, Services>>>' (src/subscription/subscription.ts:81-83). A Subscription entry is built from
(src/subscription/subscription.ts:89-108):

- 'modelToDependencies: (model) => Dependencies',
- 'dependenciesToStream: (dependencies) => Stream.Stream<Message, never, Services>' (or the
  keepAlive variant that also receives 'readDependencies: () => Dependencies').

Restart semantics are explicit: without 'keepAliveEquivalence' every Model change recomputes
dependencies and any change tears down and restarts the Stream; with it, an equivalence decides
whether the Stream survives (src/subscription/subscription.ts:55-68).

Constructors: 'make' (src/subscription/subscription.ts:175-186; example at 161-173), 'aggregate'
(337-354), 'lift' for child records with a 'when' gate (580-593; example 560-578), and
'persistentEntry' for a stream with no Model dependencies (356-377). It is Effect's Stream type
throughout, so Services are the Layer requirements.

Concrete example: the app lifts child subscriptions and aggregates them
(packages/typing-game/client/src/subscription.ts:8-26).

### 3.4 Mounts: Effect work tied to a live DOM element

A MountAction is 'Readonly<{ name: string; args?: Record<string, unknown>; f: (element: Element,
viewStateChanges: Stream.Stream<ViewState>) => Stream.Stream<Message, E> }>'
(src/mount/index.ts:66-73). 'Mount.define(name, { args?, messages, execute })' defers execute
until the element enters the DOM (src/mount/index.ts:196-236). Cleanup composes with
'Effect.acquireRelease' inside the Effect and runs when the element unmounts
(src/mount/index.ts:223-225, :237-245). Mounts are attached with 'h.OnMount(...)'
(src/html/index.ts:976-978).

### 3.5 Where services come from

The program supplies one 'resources?: Layer.Layer<Resources>' (src/runtime/makeApplication.ts:51)
that the host builds once; Commands and Subscriptions declare their service requirement in
their R type (src/command/index.ts:12, src/subscription/subscription.ts:89-108). Flags Effects
draw on the same Layer (src/runtime/makeElement.ts:64-70).

## 4. Navigation, routes and URL state

### 4.1 URL value

'Url' is a Schema.Struct of protocol, host, port (Option), pathname, search (Option) and hash
(Option) (src/url/index.ts:13-21). 'fromString' returns Option (110-111); 'toString' encodes
(112-114).

### 4.2 Route parsers

Route definitions are bidirectional parsers (src/route/parser.ts):

- 'ParseError' is a tagged error with message/expected/actual/position (22-27).
- 'ParseResult<A> = [A, ReadonlyArray<string>]' (32).
- 'Biparser<A>' has parse and print, both returning Effects (43-49).
- 'Router<A>' is callable to build a URL and exposes .parse/.build (67-73).
- Constructors: 'literal' (105-134), 'param' (143), 'string' (181), 'int' (201), 'schemaSegment'
  (265), 'root' (323), 'rest' (360), 'restString' (427), 'oneOf' (514), 'slash' (586), 'query'
  (633).
- 'parseUrlWithFallback(parser, NotFoundRoute)' parses a Url and falls back to a route built
  from '{ path }' (723-736).

'defineRouteUnion({ Tag: fields, ... })' declares the tagged Route union
(src/schema/index.ts:629-635; full example at 607-627). The vendored app shows the whole pattern:
AppRoute union, home/room routers via 'root' / 'literal' + 'slash' + 'string' + 'mapTo', and
'parseUrlWithFallback' (packages/typing-game/client/src/route.ts:5-24).

### 4.3 Routing config and URL events

'RoutingConfig<Message> = { onUrlRequest: (request: UrlRequest) => Message; onUrlChange: (url:
Url) => Message }' (src/runtime/browserListeners.ts:7-11). The runtime installs listeners for
'popstate' (29-41), same-origin link clicks with modifier/download/target guards (43-90), and
programmatic navigation on the 'foldkit:urlchange' event (19-20, 104-116). The app wires those to Messages
(packages/typing-game/client/src/entry.ts:23-26); routing init receives the initial Url
(src/runtime/makeApplication.ts:94-99; packages/typing-game/client/src/init.ts:16-17).

### 4.4 Navigation effects

'pushUrl' and 'replaceUrl' call history and dispatch a 'foldkit:urlchange' CustomEvent
(src/navigation/index.ts:5-17); 'back'/'forward' (19-25), 'load' (27-29) and 'openUrl' (31-36)
return Effects. 'UrlRequest' is 'Internal: { url } | External: { href }'
(src/navigation/urlRequest.ts:6-12).

### 4.5 Transition helpers

'Transition<Route> = { maybePreviousRoute: Option<Route>; nextRoute: Route }'
(src/route/transition.ts:9-12), built with 'make' (17-23) or 'coldLoad' (28-31). 'enteredAny' /
'entered' answer which route a transition entered (40-48, 62-69); 'exitedAny' / 'exited' answer
which it left (80-87). The module is exported as 'Route.Transition'
(src/route/public.ts:29).

## 5. Composing @foldkit/ui components

### 5.1 Button: attributes only

'Ui.Button.view(config, h)' is a pure attribute builder (ui/src/button/index.ts:20-60). The config
is '{ toView: (attributes: { button: ReadonlyArray<Attribute<Message>> }) => Html; onClick?;
isDisabled?; type?; isAutofocus? }' (7-18). It emits 'h.Type', 'h.Tabindex(0)', disabled ARIA/
data attributes, an optional 'h.OnClick(onClick)' and autofocus (50-56). Layout, label and the
actual element are owned by the consumer's 'toView'; the component has no Model, Message or
update. Public export is just 'view' and its types (ui/src/button/public.ts:1-3).

### 5.2 Listbox: a stateful Submodel

Listbox is a Submodel, not a hook-style component:

- Model is a Schema.Struct (shared base at ui/src/listbox/shared.ts:55-71; single-select at
  ui/src/listbox/single.ts:20-24) including isOpen, maybeActiveItemIndex, activationTrigger,
  searchQuery and an Animation submodel.
- Message is a tagged union: 'defineMessageUnion({ Opened, Closed, SelectedItem, ActivatedItem,
  MovedPointerOverItem, Searched, ... })' (ui/src/listbox/shared.ts:100-120+).
- 'update' is a pure function; selecting emits 'OutMessage.Selected({ value })' and closes
  (ui/src/listbox/single.ts:39-41). Programmatic 'open' / 'close' / 'selectItem' wrap Messages
  (48-60).
- The parent owns the selection and passes it in through ViewInputs; the view drives
  'aria-selected' and the hidden input from it (ui/src/listbox/single.ts:65-77).
- The public surface exports init/create/Model, the Message and Command constructors, and
  'Multi' (ui/src/listbox/public.ts:1-52).

Composition is 'h.submodel({ slotId, model, view, viewInputs, toParentMessage })'
(ui/src/listbox/single.ts:106-135; src/html/submodel.ts:177-192). The parent runs the child
update with 'Update.foldChild' and folds the OutMessage (src/html/submodel.ts:172-175).

### 5.3 Focus, keyboard, scroll and modal responsibilities

The component owns ARIA and keyboard wiring; the commands it emits do the DOM work:

- ARIA/state attributes on the trigger and items container: 'h.AriaHasPopup',
  'h.AriaExpanded', 'h.AriaControls', 'h.AriaActiveDescendant', role 'listbox',
  'aria-multiselectable', 'aria-orientation' (ui/src/listbox/shared.ts:1047-1110).
- Keyboard handlers attach with 'h.OnKeyDownPreventDefault(handleButtonKeyDown)' and
  'h.OnKeyDownPreventDefault(handleItemsKeyDown)' (ui/src/listbox/shared.ts:1058, :1104); key
  arrowing/home/end logic lives in ui/src/keyboard.ts:9-40 (findFirstEnabledIndex, keyToIndex).
- Focus and scroll are Commands, not inline DOM reads: 'FocusButton', 'FocusItems',
  'ScrollIntoView', 'ClickItem' (ui/src/listbox/shared.ts:256-294).
- Modal mode adds 'LockScroll' / 'UnlockScroll' and 'InertOthers' / 'RestoreInert' Commands
  (ui/src/listbox/shared.ts:230-254).
- Positioning/portal work is a Mount: 'AnchorListbox' and 'PortalListboxBackdrop' defined with
  'Mount.define' (ui/src/listbox/shared.ts:665, :687) and attached via 'h.OnMount(...)'
  (:1085).

### 5.4 What the parent must do

The parent stores the child Model, renders 'h.submodel', folds child Messages and handles the
child OutMessage (e.g. 'Selected'); it also passes per-render 'viewInputs' such as the selected
value and the item list. The listbox docs say selection is "owned by the parent and passed in
via ViewInputs.maybeSelectedValue" (ui/src/listbox/single.ts:19, :65-77).

UNKNOWN: I did not audit Dialog's focus-trap implementation (only listbox and button were read).

## 6. What a minimal honest test looks like

### 6.1 Shipped test runtime

The repo ships a Vitest integration and a scene/story harness:

- 'foldkit/test/vitest' exports 'setup()' which calls 'expect.extend(sceneMatchers)' and augments
  Vitest's Assertion with toHaveText/toHaveClass/toHaveAttr/toHaveValue/toBeDisabled/...
  (src/test/vitest.ts:5-25, :27-40). The setup file calls it once (src/test/vitest-setup.ts:1-3).
- 'foldkit/test' exposes Story, Scene and Lazy (src/test/public.ts:1-3); the root package also
  exports Scene and Story namespaces (src/index.ts:23-24).
- The vendored family runs Vitest with 'environment: happy-dom'
  (vendor/foldkit/packages/foldkit/vitest.config.ts:5; packages/ui/vitest.config.ts:10).

### 6.2 Scene: view/interaction assertions

'Scene.scene({ update, view }, ...steps)' executes a scene (src/test/scene.ts:3033-3075) and
throws if any Command or Mount remains unresolved, any unmount unacknowledged, or any interaction
went unacknowledged (3030-3107). Steps start with 'Scene.given(model)' (944-962) and include
click (1878), keydown (2562), change, hover, focus, submit, plus explicit outcomes
'expectHandled' (1647), 'expectIgnored' (1688) and 'expectOutMessage' (1542).

Assertions run against VNodes, not the live DOM: matchers accept 'Option<VNode>'
(src/test/matchers.ts:18-26; toHaveClass at 62-70) and query helpers import VNode
(src/test/query.ts:18). Commands and Mounts are resolved explicitly by helper groups
('Scene.Command' / 'Scene.Mount', src/test/scene.ts:1464-1519); the UI listbox test resolves
Mounts with 'Scene.Mount.resolve' (packages/ui/src/listbox/single.test.ts:33-40).

### 6.3 Story: pure update/command simulation

'Story.story' is an immutable simulation of a Foldkit program: its state is
'{ model, commands, outMessage }' (src/test/story.ts:29-36). Steps include 'given' (120),
'message' (161), 'model' (248) assertions, Command assertions (328) and 'story' (422). This needs
no DOM and is the natural way to test update + Commands.

### 6.4 Can a test run without a real browser?

Partly, and the answer depends on the step:

- Story runs update logic with no DOM (src/test/story.ts:29-36).
- Scene asserts on VNodes, but its pointer simulation builds real DOM elements with
  'document.createElement' and appendChild (src/test/scene.ts:2115-2138), so pointer-style steps
  need a DOM implementation. The shipped choice is happy-dom
  (vendor/foldkit/packages/foldkit/vitest.config.ts:5).
- UNKNOWN: I did not audit every Scene step to determine which ones work with no DOM at all;
  the shipped configuration always provides happy-dom.

## 7. Sharp differences from React mental models

1. There is no component-local state or hooks. One Model value is decoded by a Schema
   (src/runtime/makeApplication.ts:33) and update is a pure function returning the next Model
   plus Commands (src/update/update.ts:37-44). Anything that would be 'setState' is a Message
   dispatched into the root update.
2. Messages are schema-defined tagged unions (src/message/index.ts:1;
   packages/typing-game/client/src/message.ts:7-16), not callback props. Event attributes carry
   a Message or a function returning one (src/html/index.ts:606-744); there is no synthetic DOM
   event object handed to application code for ordinary clicks.
3. The view is pure and receives the runtime's builder: 'view(model, h)'. The builder must be
   threaded as a parameter and never stored; a builder from another frame is a type error
   (src/html/index.ts:5520-5545).
4. Effects are not run inside update or view. A Command is data containing an Effect
   (src/command/index.ts:12-24); update builds Commands and the runtime runs the batch after
   update returns (src/update/update.ts:124-127), concurrently and without ordering
   (src/command/index.ts:157-159).
5. Long-lived work is a Subscription derived from Model dependencies (a Stream, restarted on
   dependency change; src/subscription/subscription.ts:55-68, 89-108), not an effect with a
   dependency array.
6. Lists need explicit identity: 'keyed(tag)(key, ...)' (src/html/index.ts:3246-3257) and
   stable per-item Submodel 'slotId's, never array indexes (src/html/submodel.ts:135-143).
7. The runtime owns the DOM container and render loop (src/runtime/start.ts:106-130); imperative
   DOM work is scoped to a live element through Mount + Effect.acquireRelease
   (src/mount/index.ts:196-245), not a useEffect cleanup.
8. There is no JSX in the vendored sources: markup is builder calls such as
   'h.div([h.Class(...)], [...])' (packages/typing-game/client/src/view/view.ts:35-59).
9. Children may be raw strings (src/html/index.ts:216); a text child is a string, not a
   component.
10. Immutability enforcement is a dev-time aid, not a production guarantee: the model is
    deep-frozen only when 'freezeModel !== false && !!import.meta.hot'
    (src/runtime/runtime.ts:352-362; src/runtime/deepFreeze.ts:3-23).

## 8. Not established (UNKNOWN)

- Production root mounting beyond 'container' + run/hydrate/embed/makeElement: no additional
  API is exported from src/runtime/public.ts:1-9. Whether a lower-level internal mounting path
  exists elsewhere in runtime.ts was not audited.
- Scene's exact DOM requirements per step: pointer simulation needs document
  (src/test/scene.ts:2115-2138); a full step-by-step audit was not done.
- @foldkit/ui Dialog focus trap and scroll-lock internals (only button and listbox were read).
- View-transition configuration semantics (the type is surfaced at
  src/runtime/public.ts:46-48 but the implementation was not audited).
- Server rendering ('renderToString') and the hydration handoff internals: only the 'hydrate'
  entry and its doc were read (src/runtime/start.ts:150-184).
- The UI package's 'foldkitViewIdentity' Vite plugin (used by packages/ui/vitest.config.ts:5-8)
  was not audited.

## 9. Load-bearing citations (short list)

- src/runtime/makeApplication.ts:26-54 - the whole application config surface.
- src/update/update.ts:37-44 - update returns '{ model, commands? }'.
- src/command/index.ts:12-24, :116-128 - Commands are named Effects, constructed lazily.
- src/subscription/subscription.ts:89-108 - subscriptions are dependency-derived Streams.
- src/html/index.ts:215-216, :295-302 - Html/Child/Document.
- src/html/index.ts:5547-5556, :5520-5545 - the runtime-supplied HtmlBuilder contract.
- src/html/index.ts:589-982 - the complete attribute/listener vocabulary.
- src/html/index.ts:3246-3257 - keyed children.
- src/html/submodel.ts:177-192 - h.submodel config and Message lifting.
- src/runtime/browserListeners.ts:7-11 - routing is two Message-producing callbacks.
- src/route/parser.ts:43-49, :723-736 - routes are bidirectional parsers with a fallback.
- ui/src/listbox/single.ts + ui/src/listbox/shared.ts:229-310 - stateful component as Submodel
  plus Focus/Scroll/Lock Commands.
- src/test/matchers.ts:18-26 + src/test/story.ts:29-36 - the two test surfaces (VNode Scene,
  pure Story).

