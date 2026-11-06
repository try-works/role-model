# S206 A real Studio defect, and a fix I reverted because it did not work

## The defect

On a host whose catalogue does not include the hardcoded Studio model, the **first thing a user tries fails**:

```
click [data-studio-run] on /studio
-> HTTP 400 {"type":"capability_eligibility_error","code":"no_eligible_target",
               "message":"no targets for model moonshot/kimi-k2.5 …"}
```

`src/studio.ts` seeds `studioIdle()` with `model: "moonshot/kimi-k2.5"` and `prompt: "A quiet harbour at dawn"`, and the field is free text. On the operator host that model exists; on the default fixture catalogue (openai, anthropic, cli) it does not - so Studio is broken out of the box on any host without that model.

## The fix I attempted, and why I reverted it

I made the Studio derive its model from the configured catalogue (view) and substitute a configured model on run (update). It **did not take effect**, and the diagnostic I added explains why:

```
[data-route="studio"] data-studio-catalogue -> "0"
```

`configuredModels` is a **route-scoped readback**: it is fetched when the Models page is visited, not when Studio mounts. The sidebar count comes from a different readback (`models`), which is why the shell can show "MODELS 3" while the Studio sees an empty list. With an empty catalogue my substitution has nothing to substitute.

Both edits were reverted rather than left in the tree. A fix that silently does nothing is worse than an open defect: it makes the code look handled.

## The actual fix (next)

The Studio route must **request `configuredModels` on mount** - the same way the Models route does - and only then pick a default. That means wiring a command in the route-entry path, not guessing inside the view.

## What this round did establish

- the Studio journey fails end to end through the UI, with the exact server error captured;
- the failure is a **data-default** problem, not a rendering problem (the page renders, the button works, the request is sent);
- route-scoped readbacks are why `/studio` sees an empty catalogue while the sidebar shows three models.

## Honest status

The port can **render** Studio and **send** a request; it cannot **complete** one on a host without `moonshot/kimi-k2.5`. That is a functional gap in the port, and it is now recorded with the mechanism and the next step.