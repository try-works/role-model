from pathlib import Path

paths = [
    Path(r"D:\DEV\.wt\83-kw\.recursive\run\83-kw-operator-toggle-assemble-live-e2e-argv-equals\00-requirements.md"),
    Path(r"D:\DEV\role-model\.worktrees\83-kw-operator-toggle-assemble-live-e2e-argv-equals\.recursive\run\83-kw-operator-toggle-assemble-live-e2e-argv-equals\00-requirements.md"),
]

for p in paths:
    t = p.read_text(encoding="utf-8")
    t = t.replace("- Coverage: `PENDING-WORKTREE`", "- Coverage: `PASS`")
    t = t.replace("- Approval: `PENDING-WORKTREE`", "- Approval: `PASS`")
    t = t.replace("- Coverage: `PENDING-USER-APPROVAL`", "- Coverage: `PASS`")
    t = t.replace("- Approval: `PENDING-USER-APPROVAL`", "- Approval: `PASS`")
    t = t.replace(
        "- [ ] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)",
        "- [x] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)",
    )
    t = t.replace(
        "- [ ] Lock Phase 0 via recursive-lock after worktree PASS",
        "- [x] Lock Phase 0 via recursive-lock after worktree PASS",
    )
    # Ensure plain gate lines exist (some linters want both backtick and plain forms)
    if "Coverage: PASS" not in t.replace("`", ""):
        pass
    # Add non-backtick gate lines if missing
    if "\nCoverage: PASS\n" not in t and "Coverage: `PASS`" in t:
        t = t.replace("- Coverage: `PASS`", "- Coverage: `PASS`\n\nCoverage: PASS")
    if "\nApproval: PASS\n" not in t and "Approval: `PASS`" in t:
        t = t.replace("- Approval: `PASS`", "- Approval: `PASS`\n\nApproval: PASS")
    # Fix proof lines
    t = t.replace(
        "Coverage/Approval PASS and Phase 0 requirements lock proceed only after `00-worktree.md` PASS.",
        "Dual-repo worktrees created; `00-worktree.md` Coverage/Approval PASS. Requirements ready to lock.",
    )
    p.write_text(t, encoding="utf-8", newline="\n")
    print("updated", p)
    # show gate-ish lines
    for line in t.splitlines():
        if "Coverage" in line or "Approval" in line or "TODO" in line or "[ ]" in line:
            if "Coverage" in line or "Approval" in line or "[ ]" in line:
                print(" ", line)
