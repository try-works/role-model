# S496 — migrate requests-ranking TARGET select to Foldkit listbox

Status: pending
TDD Mode: strict
Public basis 705bb44f.

Follow S491 exactly: replace the remaining native ranking-target <select> with the existing src/ui/listbox.ts wrapper; parent state, message flow (RequestsRankingFieldChanged -> same query build), and all other selects stay unchanged.

Strict RED: scene test against the native target select times out waiting for listbox trigger (same imports/signature, only markup differs - no crash allowed in the RED log). Coverage: role=listbox/option, one aria-selected, ArrowDown aria-activedescendant, typeahead, Escape/focus return, selection emits the same query with the expected dimension/metric fields. Green: s491/s458/s25d/s111 + new test, UI tsc 0, nonempty lint (zero added-line). Freeze hashes; no commit; independent review by a different member.
