# S223 The TypeScript build was broken for several rounds - no test could see it

Running `tsc --noEmit` on the UI app for the first time this block:

    src/message.ts(14,14): error TS2322: Type MessageUnion<...> is not assignable to type MessageUnion<...>

## Cause

When S209 added `targetId` to the control action message I wrote it as an optional property of the
interface:

    readonly targetId?: typeof Schema.String;

Every other optional field in that union is a **schema value**, not an optional property:

    readonly serverEndpointId: Schema.optional<typeof Schema.String>;

The first form makes the field `string | undefined` in the union type while the runtime schema is
an optional schema, so the interface and schema disagree and the union is not assignable. Corrected
to the schema form:

    readonly targetId: Schema.optional<typeof Schema.String>;

After the fix: `tsc exit=0`.

## Why nothing caught it

| Runner | Sees types? |
|---|---|
| esbuild (build) | no - strips them |
| vitest | no - transpiles |
| node --test on .mjs | n/a |
| the packaged gate | no - runs the bundle |

The app had **no typecheck in its test script**. Every green signal in this run was from a runner
that erases types first.

## The guard

    "test": "tsc --noEmit -p tsconfig.json && vitest run && node --test test/*.test.mjs"

and the end-to-end run:

    pnpm run test -> exit 0
    Test Files 31 passed, Tests 297 passed, invariants 17/17

## Package rebuilt and gated on the packaged client

    PASS control action: message:Providers action failed: HTTP 400
    PASS studio run: clicked -> raw:success
    {"routes":20,"failures":0,"focus":true}   gate exit=0

## Lesson

A type error is invisible to every test runner that strips types, and this app had four of them and
no tsc in CI. "Tests pass" and "the code typechecks" are independent claims; only one of them was
being made.