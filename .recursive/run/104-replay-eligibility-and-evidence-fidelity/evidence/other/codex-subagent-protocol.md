# Codex subagent delegation protocol (observed in this environment)

Version: 2026-10-01. Basis: 7 delegated children spawned in this session, 2 delivered, 5 stalled (interrupted
after exceeding their box with no artefact). Every mechanic below is either directly observed or a rule adopted
because of an observed failure.

## 1. What actually works

- `spawn_agent(task_name, fork_turns, message)` starts a child that shares this filesystem and cwd.
- **The spawn payload is dropped.** The child sees only `Task name: /root/<name>` and an empty payload
  (documented defect: parent->child text lands in an `encrypted_content` part the child cannot read).
- The working transport is a **brief file on disk** that the child recovers by the last path segment of its task
  name. The parent must write the brief and register it in `E:\tmp\collab\INBOX.md` **before** spawning.
- `list_agents` is the only status surface; children are not shown in the app's thread list.
- `interrupt_agent` works and returns the previous status; runtimes keep no partial deliverable for you.
- The reliable liveness signal is the child's session log:
  `C:\Users\erikb\.codex\sessions\<yyyy>\<mm>\<dd>\rollout-*.jsonl` matched by the task name. Read its last JSON
  line's `timestamp` and the file size. `LastWriteTime` on the file is unreliable (it often shows creation
  time). The UI status "running" does **not** mean progress.

## 2. The failure mode observed (5 of 7 children)

Child starts, reads the brief, works for 15-55 minutes (session log grows to 0.3-1.7 MB with `token_usage_record`
events), and never writes its findings file or returns. `list_agents` reports `running` the whole time. Cause is
unproven; the practical signature is **deep, open-ended analysis with the deliverable held until the end**.
Mitigations below are adopted from that signature, not from a proven root cause.

## 3. Mandatory protocol for every delegation

1. **Brief first, always.** Write `E:\tmp\collab\briefs\<task_name>.md`, add the INBOX row, then spawn with the
   same `task_name`. Put a `RECEIPT TOKEN:` on line 1 and require the child to echo it.
2. **One deliverable path per child.** Exactly one file it may write (usually outside the repo for read-only
   work). No child may write repo files unless the brief grants an explicit ownership list.
3. **Checkpoint requirement (the important one).** The brief must instruct: *create the deliverable file within
   the first 2 minutes with its section skeleton, then append findings as you go; never hold the whole document
   until the end.* This is the fix for children that die with zero output.
4. **Time box with a hard stop.** State a box in minutes (default 10; 15 for a source-walk audit) and: *if you
   reach the box, write what you have, mark it PARTIAL, and return immediately.*
5. **Bounded question list.** 8-12 numbered checks maximum. Open-ended "audit everything" briefs are what
   stalled. If the scope has more questions than that, split it into sequential children rather than one child.
6. **No child spawns children** unless explicitly authorised; nested delegation multiplies unmonitorable work.
7. **Concurrency: at most 3 children at once, and at most 2 when any child has a source-walk or whole-document
   brief.** Observed: the batch of 4 (two of which were deep) half-failed; the batch of 3 failed entirely.
8. **Every child is optional.** No phase may block on a child returning. The controller owns a fallback for
   every delegated slot and executes it with the same checklist if the child fails.

## 4. Controller monitoring loop

1. Spawn, then wait with a bounded `wait_agent` (<= 10 minutes).
2. On each wake: check the deliverable path; if absent, check the child's session-log last event timestamp.
3. If the box has passed, or there has been no new session event for ~2 boxes with no deliverable, interrupt
   the child.
4. Record the attempt under `/.recursive/run/<run-id>/evidence/retries/<role>-<task>-attempt-NN.md` with the
   session-log path, last event timestamp, and size; mark `Subagent Availability: degraded`.
5. Execute the task yourself with the same checklist and record the override reason. Re-dispatch only with a
   **new task name** (a follow-up reuses the old name and the child re-reads its old brief).

## 5. Brief template

```md
RECEIPT TOKEN: <unique-token>

# Brief: <one-line task>

Role: <analyst|planner|implementer|code-reviewer|tester|memory-auditor>
Write scope: exactly one path -> <deliverable path>. Everything else is READ-ONLY.
Time box: <N> minutes. Create the deliverable immediately with its skeleton, then append as you go.
If the box expires: write what you have, mark it PARTIAL, return. Do not keep going.

## Context (what you must read first)
<exact file paths, no "look around">

## Checks (numbered, <= 12)
1. ...

## Output shape
<sections; end with `Receipt token:` and a verdict>

## Forbidden
No repo writes outside the deliverable. No commits, branch changes, dependency installs, runtime restarts,
or spawning other agents.
```

## 6. Verification of anything a child returns (unchanged)

Never accept a child's word. Re-read its cited files, re-run its commands, check its claimed file list against
the real worktree, and reject context-free or verdict-free output. For write-capable children, also verify TDD
order, the ownership boundary, and the R15 primitive map.
