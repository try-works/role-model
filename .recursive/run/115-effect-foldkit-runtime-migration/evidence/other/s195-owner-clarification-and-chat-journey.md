# S195 Owner clarification: :3456 serves the OLD React app as the visual reference

Recorded verbatim: *"the old react app is served on :3456 for visual inspection"*.

## What this corrects in my own record

In S176 I compared the port against `:3456` and wrote up "two scope findings": a different information architecture, and an Overview without the model-pool scatter or the token-usage chart.

That framing was half right. `:3456` is **the old React app kept as the reference**, not the shipped target of this port. So:

- the differences are **expected**, not regressions - a new Foldkit shell is a different IA by construction;
- `apps/runtime-ui` staying in the tree is **consistent** with decision D-U1 ("React is deleted at cutover"), because the cutover has not happened;
- the port's requirement is to **reach** what the reference offers, with `:3456` as the visual yardstick, not to avoid differing from it.

## Reference captures committed for comparison

| File | Page | What it shows |
|---|---|---|
| `ui-audit/reference-overview.png` | `:3456/` | model-pool scatter (quality / cost / speed) and "Token usage over time" |
| `ui-audit/reference-studio.png` | `:3456/studio` | the reference Studio composition |

Read-only GETs against the operator; no state written.

## Where that leaves the port

| Port page | State vs reference |
|---|---|
| all 25 routes | render, named, legible, focusable, 24x24 targets, no overflow - verified by the rendered audit |
| Overview | stat panel + filters + telemetry empty state; **does not yet carry** the scatter or the token chart |
| IA | OVERVIEW / OBSERVE / ROUTER / CONTROL / LOCAL / SYSTEM vs the reference's single list |

So the honest position on "complete Foldkit UI port" is unchanged and now better grounded: the shell is complete as a shell, and the Overview's two visualisations remain the known content gap against a reference the owner has confirmed is the yardstick.

## Also in this round

- **a real OpenAI-compatible chat completion** now runs inside the gate: `POST /v1/chat/completions` on the packaged candidate returns `chat.completion` with the requested model echoed and `usage.total_tokens` present (`total_tokens=56`); with an unknown model it returns 400 and the check fails, so it is falsifiable;
- the 24x24 target check had 20 false failures because it measured the **sr-only skip link in its hidden state**; it now skips clipped elements and separately asserts the skip link becomes >=24px when focused.

Gate with everything enabled: `PASS chat completion`, `PASS expected model deepseek-official/deepseek-flash`, `{"routes":20,"failures":0,"focus":true}`, exit 0.