# S221 The confirm-to-save leg is pinned too - three tests, two of which can fail

S219 proved the confirm-to-PUT leg by hand; S220 pinned the editor transitions. This pins the command.

## `test/s221-config-confirm-command.test.ts` (3/3)

| Test | Pins |
|---|---|
| a changed config reaches `confirming` with a diff | the review panel only appears for a real change |
| confirming emits **ONE** save command carrying the edited text | the network leg starts from the right text |
| a second confirm while saving changes nothing | no double submit |

Falsifiability, third test: removing the `status !== "confirming"` guard from `RuntimeConfigConfirmRequested`
makes two confirms send two writes:

    x a second confirm while saving is a no-op (no double submit)
    Tests  1 failed | 2 passed (3)

Restored -> 3 passed.

## Two corrections to my own test

1. I first asserted that confirming with a **stale token** must not save. Reading the handler showed the
   token is a caller-assigned correlation id, not a server nonce, and `RuntimeConfigSaved` compares it
   against the value the editor stored from the same message. There is nothing to be stale: **I had
   invented a property the design does not have.** Replaced with the double-submit guard, which is the
   protection that actually exists.
2. I then asserted the second confirm leaves the editor in `saving`. It does not - the first confirm
   sets the state it wants, and the second is a pure no-op. The invariant is *the second confirm changes
   nothing*, so the test now compares the two states instead of naming one.

## Full UI surface

    ui vitest        295/295  (30 files)
    invariants        17/17

## What remains hand-proven only

The command object is asserted; the actual PUT and the re-read are proven by the S219 manual run. A
future journey could close that, but a message-level test cannot.