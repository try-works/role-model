# S175 I looked at the UI and found an invisible primary action

The owner standard for this run is that UI must be verified visually in a browser, not by DOM assertions. This round I finally did that on the packaged candidate and found a defect no test in the suite could see.

## What the candidate actually serves

Started `role-model-dev.exe` (`0.0.20-163-g6ed7ece9`, sha `e3181d50`) on port 6201 with its own state root, then opened it in the shared browser:

```
title: "Overview | RM3 Foldkit shell"
50 links: Overview, Studio, Learning, Models, Router, Candidates, Decisions, Providers,
          Endpoints, Controller, Receipts, Queues, Logs, Requests, Activity, Readiness, ...
```

The shell is the Foldkit port, styled, with the sidebar stat panel, time-range segmented control and filter selects - not the unstyled HTML the owner complained about earlier at :5790. The navigation covers the operator's top-level sections (Studio, Models, Router, Observe, Local, Remote, Learning).

## The defect

`/studio` rendered as a white **empty box** where the primary action should be:

```
computed  bg: rgb(255, 255, 255)   color: rgb(255, 255, 255)
```

In this dark theme `--rm-accent` resolves to `#ffffff`, and the button class was `bg-[var(--rm-accent)] ... text-white`. **White on white.** Three controls had the same pattern (Studio Run, runtime-config Save, and one more), and the correct token - `--rm-on-primary` (`#0a0a0a`) - already existed and was unused there.

## Fix and verification

- three accent fills now use `text-[var(--rm-on-primary)]`;
- client rebuilt (`node build.mjs`, PASS);
- browser re-check: `bg: rgb(255,255,255) color: rgb(10,10,10)`, and the screenshot shows "Run" legibly;
- new invariant `test/s175-accent-contrast.test.mjs`: **RED 0/2** against the committed source, **GREEN 2/2** after the fix.

## Why the suite missed it

Every existing test asserts structure, text content and behaviour. A control can contain "Run", be focusable, fire the right message, and still be invisible. The only test that catches it is one about **colour pairing** - and the only way I found it was by looking at a screenshot.

## What I am changing

The packaged candidate gate checks eight surfaces over HTTP; it cannot see rendering. A rendered-UI check has to come from a browser session (this one), or from a screenshot step in CI. Until one of those exists, "the shell renders correctly" is a claim I can only make for the pages I actually opened - Overview and Studio so far.

## Also observed, not yet verified

The operator (`:3456`, production `0.0.20`) serves a **different** information architecture: Overview/Studio/Local/Remote/Models/Router/Observe/Connect/System/Learning, with a model-pool scatter plot and token-usage charts on Overview. The port covers those destinations under a different sidebar grouping; whether each destination is **complete** against the operator page is a page-by-page visual comparison I have not finished.