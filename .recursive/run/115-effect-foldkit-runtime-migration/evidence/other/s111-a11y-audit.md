# S111 Accessibility audit found a real defect: the controller select had no name

## Audit (browser, shipped build, port 5960)

Across `/`, `/models`, `/studio`, `/control/controller`, `/learning`, `/requests`:

| Property | Result |
|---|---|
| interactive elements | 51-59 per route |
| without an accessible name | **0 on five routes, 1 on `/control/controller`** |
| images without `alt` | 0 |
| `<main>` / `<h1>` landmarks | 1 / 1 per route |

## The defect

The controller endpoint `<select>` had **no accessible name**: no `aria-label`, no `aria-labelledby`, no `id`, and its visible label ("Controller endpoint") was a **sibling**, not a wrapping `<label>` or a `for=` association. A screen reader announced an unnamed combo box.

Fixed with `h.AriaLabel("Controller endpoint")` on the select.

## Pinned

`test/s111-a11y.test.ts` mounts seven routes (six real + NotFound) and asserts, after settling, that **every** `button`, `a[href]`, `input`, `select` and `textarea` has an accessible name, plus one `h1` per route and `alt` on every image. **7 / 7.**

Two harness facts learned the hard way while writing it: the Foldkit container needs an `id` or the shell refuses to mount, and the mounted shell does not reproduce document landmarks - so the single-`<main>` property stays a browser-verified claim (from this audit) rather than a unit assertion.

## Also this round

`test/s110-nav-links.test.ts` (25 nav links resolve through the real router) came back **25 / 25** after a type fix: the route union exposes `_tag`, not `tag`.

## Client suite

**289 / 289 across 28 files**, `tsc` **0**.