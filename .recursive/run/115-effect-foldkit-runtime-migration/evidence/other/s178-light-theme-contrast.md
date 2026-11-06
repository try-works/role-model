# S178 Light theme was unreadable: 1.12:1, caused by inline dark tokens

The contrast audit I added after S177 found the worst ratio on the Overview page:

```
dark theme   worst 6.81:1   0 elements below AA
light theme  worst 1.12:1   20 elements below AA
             "Overview"  color rgb(237,237,237)  on rgb(250,250,250)
```

## Root cause

The `<html>` element carried an **inline style** pinning the dark palette:

```
style="color-scheme: light; background-color: rgb(10,10,10); color: rgb(237,237,237);
       --rm-accent:#ffffff; --rm-bg:#0a0a0a; --rm-border:#1f1f1f; --rm-fg:#ededed;
       --rm-secondary:#9a9a9a; --rm-surface:#0f0f0f;"
```

`index.html` wrote a `palettes` table inline at boot (defaulting to dark) and the theme toggle only flipped `data-theme`/classes on afterwards. Inline style outranks every stylesheet, so in light mode the stylesheet supplied the *panels* (`#fafafa`) while `--rm-fg`/`--rm-bg`/`--rm-surface`/`--rm-border` stayed **dark**. That is why the light theme was half-applied - and why the earlier per-token reading looked self-contradictory.

## Fixes

1. **Removed the inline palette.** The stylesheet already defines both palettes; the shell only selects one (`data-theme`, class, `color-scheme`).
2. **Light muted text darkened.** With the palette fixed, the worst remaining ratio was `#888` on `#fff` = **3.54:1** (20 elements). Light `--rm-muted` now maps to `--rm3-light-muted-foreground` (`#666`).

## Verified in the browser, both themes, same page

```
light  worst 5.74:1   0 elements below AA   (was 1.12:1 / 20)
dark   worst 6.81:1   0 elements below AA
```

Screenshots taken in both themes; the light one is legible (dark text on white, visible controls).

## Tests

`test/s178-theme-tokens.test.mjs` (2 tests): no `setProperty("--rm-…")` and no `palettes` table in `index.html`; the light muted mapping is the darker token and never the ring colour. **RED 0/2** against the committed source, **GREEN 2/2** after; **6/6** together with the S175/S177 invariants. Full suites: `runtime-ui` **97/97**, `runtime-ui-next` **289/289**.

## My error while writing the test

My first version sliced the light block as `css.slice(indexOf(light), indexOf(dark))` - in the source the light block comes **after** the dark one, so the slice was empty and the assertion failed against the fixed file. It now asserts on the mapping itself rather than on a range whose order it assumed.

## What this means for the port

A token can be correct in isolation and wrong in composition: the stylesheet was right, the shell was right, and the inline palette made the pair unreadable. DOM/behaviour tests could never see it; only rendering did.