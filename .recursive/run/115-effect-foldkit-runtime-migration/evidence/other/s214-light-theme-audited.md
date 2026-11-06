# S214 The light theme is now audited, not inferred from tokens

Every rendered check in this run had been running in the **default dark theme**. The light theme was
verified only by unit tests over token hexes (S178, S199) - which is exactly the gap that let the
white-on-white accent fill (S175) and the 8%-alpha focus ring (S203) ship.

## The flag

`audit-rendered-ui.mjs --theme dark|light|both` sets `document.documentElement.dataset.theme` in the
page and **fails when the requested theme does not stick**:

    if (!seen.startsWith(currentTheme)) problems.push("theme " + currentTheme + " did not apply ...")

## Results

    3 routes, 1440x900, --theme light                  PASS x3
    20 routes, 1440x900, --theme light --focus         {"routes":20,"failures":0,"focus":true}

## Falsifiability (the only kind that counts)

Appending `html[data-theme="light"] { --rm-muted: #fefefe !important; }` to the packaged CSS:

    FAIL / - low contrast: RUNTIME UI 1.01:1, RUNTIME 1.01:1, MODELS 1.01:1, ...

Restored: passes. So the light-theme run measures the light theme, and a muted-on-background
regression is caught rather than assumed away.

## Now standing

The packaged-candidate gate and the CI audit step both run the light theme (`--theme light`) on top of
the existing dark pass, the 390px pass, and the Studio journey:

    PASS studio run: clicked -> raw:success
    {"routes":20,"failures":0,"focus":true}   exit=0

## Still not judged

Contrast over images/gradients is counted and reported, not judged (no gradients behind text today).