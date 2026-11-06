# R7/R8 provenance and RM3 behaviour matrix

Status: GREEN for the ledgers and maintained matrix. No product runtime code changed; component
behaviour is now pinned by Scene tests.

## R7 provenance
- `packages/ui/FOLDCN-GAP.md`: explicit **Foldcn not vendored/not used** decision against the
  Crease-first rule, with the Crease pin (bb447e36...), MIT licence and the adoption precondition.
- `packages/ui/RM3-ADAPTED-SOURCES.md`: adapted-source ledger kept outside the vendor snapshot;
  maps first-party RM3 sources to pinned upstream files, SHA-256, licence, owner and adaptation notes.
  Crease chart/echarts hashes, Foldkit button/checkbox/input hashes are pinned; first-party components
  with no copied upstream are recorded as such rather than invented.
- Guard: `packages/ui/src/rm3-provenance.test.ts` (docs exist, hashes match the actual vendor files,
  Foldcn gap states the Crease-first decision).

## R8 behaviour matrix
- `packages/foldkit/test/s652-rm3-behavior-matrix.scene.test.ts` covers:
  light/dark wrappers, mobile block/full-width, keyboard/focus (focus ring + click handler), RTL labels
  and references, disabled button, checkbox and textarea in the same surface, dialog overlay
  `aria-labelledby`/close/cancel->RequestedClose, reduced-motion stylesheet, and cn-merge behaviour.
- Matrix export: `packages/ui/src/rm3-matrix.ts` names every required dimension and its owning test.
- cn semantics: donor `cn` resolves conflicts (tailwind-merge); Foldkit button concatenates and keeps
  the caller class. Both behaviours are asserted, so the difference is intentional and documented.

## Evidence
- RED: `evidence/logs/r7-rm3-provenance-red.log`, `evidence/logs/r8-rm3-matrix-red.log`.
- GREEN: `evidence/logs/r8-rm3-matrix-green.log` (22 targeted tests; expanded matrix later 9/9).
- Suites: `@role-model/ui` 35/35 including provenance; `foldkit` package wrapper closure 15/15;
  targeted matrix/button/input/textarea 22/22; expanded matrix 9/9.
- Commits: R7/R8 `e26b7660`; stronger overlay/reduced-motion assertions `e0be5496`; checkbox/textarea
  coverage `05e51100`.

## Remaining
- Independent review by the lead/reviewer (delegation unavailable at this depth).
- The dialog Escape/dismiss path is pinned at the view source (`OnCancelPreventDefault`/
  `OnClick RequestedClose`) and update close; a full native-dialog browser journey remains with the
  packaged UI lane rather than this Scene matrix.
- Existing `s12c-foldkit-checkbox` caller-hook test fails standalone with `document is not defined`
  (pre-existing environment issue; unrelated to these changes) and is excluded from the GREEN log.
