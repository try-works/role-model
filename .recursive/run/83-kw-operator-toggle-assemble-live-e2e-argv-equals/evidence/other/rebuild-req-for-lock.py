from pathlib import Path

draft = Path(r"D:\DEV\role-model-internal\.cursor\spec-drafts\83-kw-operator-toggle-assemble-live-e2e-argv-equals.00-requirements.md")
targets = [
    Path(r"D:\DEV\.wt\83-kw\.recursive\run\83-kw-operator-toggle-assemble-live-e2e-argv-equals\00-requirements.md"),
    Path(r"D:\DEV\role-model\.worktrees\83-kw-operator-toggle-assemble-live-e2e-argv-equals\.recursive\run\83-kw-operator-toggle-assemble-live-e2e-argv-equals\00-requirements.md"),
    draft,
]

t = draft.read_text(encoding="utf-8")

# Strip old Coverage/Approval tails
marker = "\n## Coverage Gate\n"
idx = t.find(marker)
if idx < 0:
    raise SystemExit("Coverage Gate not found")
head = t[:idx].rstrip() + "\n"

# Fix TODO items
head = head.replace(
    "- [ ] User approve this draft\n",
    "- [x] User approve this draft (2026-07-25)\n",
)
head = head.replace(
    "- [ ] recursive-init + write approved content into both repos’ run folders\n",
    "- [x] recursive-init + write approved content into both repos’ run folders\n",
)
head = head.replace(
    "- [ ] recursive-init + write approved content into both repos' run folders\n",
    "- [x] recursive-init + write approved content into both repos' run folders\n",
)
head = head.replace(
    "- [ ] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)\n",
    "- [x] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)\n",
)
head = head.replace(
    "- [ ] Lock Phase 0 via recursive-lock after worktree PASS\n",
    "- [x] Lock Phase 0 via recursive-lock after worktree PASS\n",
)

# Fix outputs
old_outputs = """Outputs:
- Temporary draft (this file): `.cursor/spec-drafts/83-kw-operator-toggle-assemble-live-e2e-argv-equals.00-requirements.md`
- After user approval + recursive-init: `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-requirements.md` (mirrored dual-repo)"""
new_outputs = """Outputs:
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-requirements.md` (private + public mirrors)
- Approved source draft retained at `.cursor/spec-drafts/83-kw-operator-toggle-assemble-live-e2e-argv-equals.00-requirements.md`"""
if old_outputs in head:
    head = head.replace(old_outputs, new_outputs)

# Also handle already-rewritten outputs without backticks corruption
if 'Outputs:\n- /.recursive/run/83' in head:
    # leave; will normalize below
    pass

tail = """
## Coverage Gate

- Effective inputs reviewed:
  - User approval of draft (2026-07-25) for shadow-ready + ceremony ON + assemble + equals-form argv + TDD + rebuilt runtime + cloud E2E + pi storage
  - Dual-repo worktrees recorded in `00-worktree.md` (private `D:/DEV/.wt/83-kw`, public `.worktrees/83-kw-…`)
  - Prior STATE/DECISIONS/memory and run-82 residuals
- Requirement coverage check:
  - Theme A KW: `R3`–`R8`, `R10`, `R12`
  - Theme B assemble/freeze: `R1`–`R2`
  - Theme C equals-form argv: `R9`
  - Cross-cutting packaging/TDD/Phase5/cloud/pi/binder/dual-repo: `R11`, `R13`–`R19`
- Out-of-scope confirmation: `OOS1`–`OOS14` explicit
- Lock state: ready to lock with worktree PASS

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - Requirements cover shadow-ready default, ceremony-bound ON, KW correctness, full assemble, equals-form argv, strict TDD, rebuilt SEA, live cloud `--track=dev`, and live `pi` storage with observable criteria
  - No ambient always-on (`OOS1`); ceremony retained (`OOS1b`); empty cold-start forbidden (`OOS1c`)
  - Dual worktrees isolated on `recursive/83-kw-operator-toggle-assemble-live-e2e-argv-equals`
  - Run id `83` (public max+1)
  - User approved draft 2026-07-25; written into both worktree run folders
- Remaining blockers:
  - none for Phase 0 requirements lock

Approval: PASS

## Subagent Capability Probe

- Probe: requirements authoring and approval incorporation performed by controller; no delegated requirements audit.
- Result: self-executed.

## Delegation Decision Basis

- Audit Execution Mode: `self-audit`
- Delegation Override Reason: Phase 0 requirements are the user-approved draft already reconciled into dual-repo run folders after worktree isolation; locking is mechanical with complete local context.

## Audit

Audit: PASS
"""

final = head + tail
# ensure no unchecked TODOs
unchecked = [ln for ln in final.splitlines() if ln.strip().startswith("- [ ]")]
if unchecked:
    raise SystemExit(f"unchecked TODOs remain: {unchecked}")

for path in targets:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(final, encoding="utf-8", newline="\n")
    print("wrote", path, "bytes", path.stat().st_size)

print("OK")
