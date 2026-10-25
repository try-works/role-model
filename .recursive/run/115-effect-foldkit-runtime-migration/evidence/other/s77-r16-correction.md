# S77 R16 correction: most of R's UI is read-only, so the "5 regressions" were overstated

I probed R (`:3456/app`, released 0.0.20) page by page for interactive controls rather than trusting the earlier comparison.

## What R actually offers

| R page | inputs | selects | textareas | Verdikt |
|---|---|---|---|---|
| Router | 0 | 0 | 0 | **read-only** - "Routing strategy lost" was a FALSE regression |
| Connect | 0 | 0 | 0 | read-only info tabs (Registry/Downstream/Upstream); no provider form visible |
| Local | 0 | 0 | 0 | **read-only** - "choose local backend" is links/cards, not a form |
| System | 0 | 0 | 1 | tabs are read-only EXCEPT **Config**, whose textarea is editable (`readOnly:false`, 392 chars) |
| Studio | 0 | 0 | 1 + Run request | interactive (prompt textarea + Run) |

Direct URLs `/app/system`, `/app/local`, `/app/studio` answer "This runtime route does not exist" - R's sections are client-side views, so URL probing alone misleads.

## Corrected R16 regression list

| Item | Earlier verdict | Corrected |
|---|---|---|
| Router strategy editor | regression | **not a regression** - R is read-only there |
| Provider setup / connect actions | regression | **unproven** - no form found on Connect; may hide behind tabs |
| Local backend choice | regression | **not a regression** - read-only in R |
| Runtime-config editor | regression | **stands** - R has an editable config textarea, C has no editor |
| Overview filters | regression | **closed** - C now implements them against real query params |
| Models page | missing | **closed** - C now has it |
| Model pool (quality/cost/speed) | regression | **stands** (visual), blocked on a host field for quality/speed |

So the port is closer to R than the earlier verdict said: R 0.0.20 is itself a read-mostly operator console, and the client replacement already matches it on Overview, Models, Local, Router readback and Studio dispatch. The genuine remaining gaps are the **runtime-config editor** and the **model-pool visualisation**.
