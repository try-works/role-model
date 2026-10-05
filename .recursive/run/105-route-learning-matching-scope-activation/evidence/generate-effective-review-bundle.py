"""Use canonical bundle generator with explicit immutable-input addendum basis.
Original locked 00-worktree.md is NOT rewritten. Override is narrowly the executable
public diff basis; generated bundle lists this wrapper and supplementary addendum.
"""
import importlib.util, sys
from pathlib import Path
script=Path("D:/DEV/role-model-internal/.agents/skills/recursive-mode/scripts/recursive-review-bundle.py")
spec=importlib.util.spec_from_file_location("canonical_bundle",script)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
def effective_basis(run_dir):
    supplement=run_dir/"addenda/00-worktree.normalized-diff-basis.addendum-02.md"
    if not supplement.exists(): raise RuntimeError("effective basis addendum missing")
    baseline="701b8b8fc0b0eeebdfe818b757f5702f50021488"
    return {"baseline_type":"local commit","baseline_reference":baseline,"comparison_reference":"working-tree","normalized_baseline":baseline,"normalized_comparison":"working-tree","normalized_diff_command":"git diff --name-only "+baseline,"base_branch":"dev","worktree_branch":"recursive/105-route-learning-matching-scope-activation","notes":"effective addendum override; paired private basis recorded separately"}
module.get_run_diff_basis=effective_basis
if __name__=="__main__": sys.exit(module.main())
