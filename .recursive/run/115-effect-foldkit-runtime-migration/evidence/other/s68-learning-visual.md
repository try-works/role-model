# S68 /learning verified: real values, two layout questions

## Working (verified in the browser on the packaged host)

- `/learning` renders with `h1` + three sections: **Knowledge worker** (`state=ok`, "7 row(s) from the live host read"), **Replay jobs** (`empty`, "No replay jobs."), **Evaluation jobs** (`empty`, "No evaluation jobs.").
- Nav includes a **Learning** group alongside Overview/Observe/Router/System/Studio.
- Real values present: `role-model.knowledge-worker.v1`, `sqlite_fts5_bm25`, `productionActivation: disabled`, "0 retrieval / 0 rollback / 0 recovery".
- The rail dash reason is visible text, not only a title.

## Defect confirmed

**Two `h1`s read "Learning"** (y=24 top bar, y=88 content). That regresses the single-title rule verified earlier on the Overview. Fix dispatched, with an assertion that every route has exactly one `h1`.

## Open question, being settled with measurements

The 1920x1080 capture appears to clip the value column ("role-model.knowledge-worker.v...", "di...", "0 retrieval / 0 rollback / 0 re..."), yet the DOM says the row is `x=252 w=1138 right=1390` inside a page whose `scrollWidth` is 1905. Either the capture is scaled or the rows overflow at some zoom.

Dispatched instructions: measure the value element against the screenshot, then either make the cell `min-w-0`/`truncate` with a `title` carrying the full text and prove wrapping at 1280 and 1024, or state with numbers that the capture was scaled - and not "fix" a non-defect.
