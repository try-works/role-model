# Phase0 sequencing repair

Controller inspection of canonical RECURSIVE.md:2296-2312 and run linter found that recursive-init generated
00-worktree.md while 00-requirements.md was still DRAFT. Both had been subsequently filled with setup facts;
that does not make the later artifact an active/approved phase. Earlier handoff calling the linter FAIL
"expected" was insufficient: the workflow requires one active phase and later drafts invalid prework.

Repair: preserve both worktree drafts as evidence/other/phase00-worktree-prework.md in each run, remove their
canonical active-phase location by an explicit move, and do not recreate00-worktree.md until requirements are
lock-valid. The worktree isolation/setup/tests themselves remain factual evidence; no requirement/coverage/
approval gate is marked PASS to silence lint. No product code, tests or normative workflow changed.

Current active phase remains00 Requirements. Task3 must review preserved setup evidence, not assume an active
00-worktree artifact exists. Once00 Requirements is lock-valid, regenerate00-worktree through supported helper,
re-read evidence/current git/setup and only then author/review/lock it. Team-model gate and E1/E2 decisions remain open.
