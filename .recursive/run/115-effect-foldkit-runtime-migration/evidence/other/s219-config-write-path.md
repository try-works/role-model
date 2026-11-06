# S219 The config write path works by hand; a scripted journey did not, so I did not ship one

## What works (driven by hand through the packaged UI)

    /runtime -> "Load runtime config" -> textarea filled from the file
    edit JSON -> "Review changes" -> "Changed top-level keys: added: runtime"
    "Confirm save" -> notice "Applied snapshot from server"
    GET /api/role-model/runtime/config -> { applied: true, path: ...\runtime-config.yaml, config: {...} }

So the port's only multi-step form (load, diff, confirm, PUT, re-read) **does** work end to end.

## A real contract finding, from the same journey

PUT with an unknown top-level key:

    PUT /api/role-model/runtime/config
    { "version": "1.0", "execution_mode": "decision_only", "ui194_probe": { "keep": true } }

    -> 200 {"applied":true, ...}
    -> the stored config does NOT contain ui194_probe

The server **normalises to the known schema, drops unknown keys, and reports success**. An operator who
pastes a config gets "applied" with part of it silently gone. The UI then shows the server's snapshot,
so the loss is visible to someone who compares - but nothing says "dropped".

This is host behaviour, not a port regression, and it is not mine to change unilaterally: rejecting
unknown keys (400) and dropping them (200) are both defensible contracts, and switching would change
what `runtime-config.yaml` may contain. **Recorded for the owner, not patched.**

## What I attempted and did not ship

A `--config-save` audit journey: load, edit `routing_strategy` to an allowed value (`balanced`), save,
confirm, require a notice. In the script it never reached the confirm panel:

    FAIL config save: clicked -> clicked -> no-confirm -> pending

Neither a synthetic `element.click()` nor a CDP pointer click plus a dispatched `input` event moved the
editor into the state where Save opens the review panel, even though the same sequence works when I do
it by hand. Rather than weaken the check to accept "no notice" (which would pass on a broken save), I
**removed the journey**. A check that cannot reach the state it tests is not a check.

## Verified after removal

    syntax ok
    PASS /runtime, PASS control action: message:Providers action failed: HTTP 400
    {"routes":2,"failures":0}   exit=0

## Open

- the edit-then-save state transition is worth a unit test at the message level (`RuntimeConfigChanged`
  -> status editing) rather than a DOM journey; that is the next honest way to pin it.
- unknown-key handling decision (owner).