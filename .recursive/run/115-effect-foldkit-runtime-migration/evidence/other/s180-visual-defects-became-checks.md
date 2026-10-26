# S180 Three visual defects became three gate checks

The S175-S179 work found defects only a browser could see. That is a process problem: a defect found by looking should end as a check, not as a memory.

## Added to the packaged candidate gate (`verify-client-journeys.mjs`)

| Check | What it refuses |
|---|---|
| `ui css` | `main.css` missing, under 10 KB, or lacking either theme block |
| `ui bundle` | `main.js` missing, not JavaScript, under 50 KB, or missing the Studio control and Overview filter bindings |
| `ui theme boot` | `index.html` that does not select a theme, **or that writes `--rm-*` tokens inline** - the exact bug that made the light theme 1.12:1 |

```
PASS ui css: 57753 bytes, both theme blocks
PASS ui bundle: 2660809 bytes
PASS ui theme boot: theme selected in CSS, no inline palette
PASS ui shell: 1852 bytes
exit=0   (10 checks total, was 8)
```

## My error adding them

My first `ui bundle` assertion looked for the literal `data-studio-run`. The bundle stores the attribute **name** (`"studio-run"`) and the DOM renders `data-studio-run`, so the check failed on a correct package. Reading the bundle showed it immediately; the check now looks for the two attribute names the shell actually binds.

That is the same class as the earlier import mistakes - asserting on a string I assumed rather than the one the code produces - and it was caught because the gate **ran** rather than being reasoned about.

## Also this round: the same mistake twice

I wrote `const L = [...].join("\n")` and then called `L.join("\n")` again - the identical slip as S176. It is trivial, and it is the third time a small mechanical error in my own tooling cost a round-trip. The pattern is consistent enough to name: **I batch edits and assertions faster than I re-read them.**

## What is still manual, and why that matters

These checks are HTTP-level. They cannot see:

- contrast ratios (found 1.12:1 in S178),
- an invisible control (found in S175),
- an accessible name that repeats its options (found in S177).

Those still require a real browser. Playwright is **not installed** in this worktree (the repo has 24 E2E specs but no browser dependency available offline), so the rendered audit I ran in S176/S178 remains a manual session. The honest status: three defects are now guarded against regression; **new** visual defects of the same shapes are not detected by CI.

Closing that gap needs a browser dependency in CI - a decision with its own cost (download, runtime, flake), so I am recording it rather than installing it unilaterally.