# S491 — Workspace W1b: real Foldkit Listbox for one select

Status: pending
TDD Mode: strict
Public basis 04fd6824; private 90e5ba27.

Gap (S485 #4): zero @foldkit/ui imports despite vendor exports ./listbox ./select ./dialog; only native selects; no listbox typeahead/arrow/RTL tests.

Repair (bounded W1b-listbox): NEW src/ui/listbox.ts wrapping @foldkit/ui listbox (vendor package foldkit-ui, dist types in packages/foldkit-ui/dist/types) exposing the exact message-compatible API for ONE existing select in the UI. Choose the safest single select (learning-ranking metric/target or overview window; NOT the provider variant or device-auth select that scene tests s425/s442 drive). Emit the same Msg value(s) on selection; keep the model/update unchanged. Add a11y/keyboard tests: arrow navigation, typeahead (if supported), aria-activedescendant/selected, Escape close, no focus trap regression.

Strict RED first: test asserting the chosen select renders through the listbox wrapper with role listbox/option today (currently native select) fails; then migrate; the same Msg flows; UI suites s458/s25d/s111 + rendered audit keep passing; UI tsc 0; nonempty lint; freeze hashes; independent review by a different member; no commit. No Dialog/modal work in this slice.
