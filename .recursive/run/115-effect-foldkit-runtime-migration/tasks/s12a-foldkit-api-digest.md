# S12a Foldkit API digest from the vendored source (public, R7)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Read-only analysis plus one new notes file. No product code.

## Why
The client port needs the actual Foldkit 0.169 API shape, read from `vendor/foldkit/packages/foldkit/src` and `vendor/foldkit/packages/ui/src`, not from memory or the upstream website. This mirrors what worked for Effect: a citable digest, then implementation against it.

## Produce `evidence/other/foldkit-0.169-api-notes.md` covering, each with file:line citations:
1. How an application is defined and run: which module owns the entry (`runtime`? `mount`?), what the arguments are, what a Model/Message/update/init looks like in this version, and how a root scene is mounted to a real DOM node.
2. How a view/scene is described (`scene`, `html`): the element/attribute/event vocabulary, how attributes and listeners are typed, how lists/keyed children and conditionals are expressed.
3. How commands and subscriptions are declared and executed, including any Effect integration (this is where Foldkit's Effect dependency shows up).
4. How navigation/route and URL state are expressed (`navigation`, `route`, `url`).
5. How a component from `@foldkit/ui` is composed (pick one simple and one stateful component, e.g. button and listbox/dialog), including focus/keyboard handling responsibilities.
6. What a minimal honest test looks like in this version: does the repo ship a test runtime (`test`, `test/vitest`), what does it assert on, and can a test mount without a real browser?
7. Anything that differs sharply from React mental models and would trip up an implementer.

## Rules
- Do NOT modify any file except the notes file and `evidence/logs/s12a-*` logs.
- Do NOT install anything, do not run the network, do not start servers, no subagents, no commits.
- Where the source is ambiguous, say UNKNOWN rather than inferring.
- Quote the smallest decisive snippet for each claim rather than paraphrasing loosely.
Report: the sections covered, the file:line citations you consider load-bearing, and anything you could not establish.