# S177 Two selects announced their whole label content, and one had no name at all

After the route audit I looked at the accessibility tree of the Overview page and saw four `LabelText` nodes with **empty names**. Reading the live DOM explained it:

```
select 1 aria-label=null  label text = "BREAKDOWN\nAll\nEndpoint\nModel\nProvider"
select 2 aria-label=null  label text = "SOURCE\nAll\nLocal\nRemote"
...
```

Each select sits inside a `<label>` that also contains the field caption **and the option text**, so the computed accessible name was the entire label content. A screen reader would announce "Breakdown All Endpoint Model Provider" as the control name.

## Fixed

`h.AriaLabel(label)` on the filter select: names become

```
["Breakdown","Source","Status","Difficulty"]
```

## A second, hidden instance of the same defect

My first invariant caught a **second** select I had not seen in the browser: `overview-filter-value`, which only renders when a breakdown is chosen. It had no name at all. It now carries `aria-label="Breakdown value"`, verified by selecting `breakdown=endpoint` in the live page:

```
[{"name":"Breakdown","filter":"breakdown"},{"name":"Breakdown value"},{"name":"Source"},{"name":"Status"},{"name":"Difficulty"}]
```

## Evidence

- `test/s177-select-names.test.mjs`: no `h.select(` in the port may exist without `h.AriaLabel(`; **RED 0/2** against the committed source, **GREEN 2/2** after;
- `test/s175-accent-contrast.test.mjs` still green (4/4 together);
- client rebuilt, live page re-checked.

## What this says about the earlier a11y test

`s111-a11y` walks seven routes looking for **unnamed** controls and passed - because these controls *were* named, just named wrongly (with their option text). "Has an accessible name" and "has a useful accessible name" are different assertions, and only the second one is worth anything.