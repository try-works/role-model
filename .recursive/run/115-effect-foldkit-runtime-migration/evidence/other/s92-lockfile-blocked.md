# S92 Packaging lockfile attempt: blocked by the no-network rule, reverted cleanly

To close packaging self-containment I tried to declare the CSS toolchain in `apps/runtime-ui-next/package.json` **and** update `pnpm-lock.yaml` without installing packages:

```
pnpm install --lockfile-only --offline
```

Result: **failed**. The lockfile-only resolution still needs registry metadata that is not cached:

```
[ERR_PNPM_NO_OFFLINE_META] Failed to resolve @anthropic-ai/sdk in package mirror ...metadata-full...jsonl
✗ Lockfile failed supply-chain policy check (903 entries)
```

The lockfile was left byte-unchanged (340,142 bytes) and I reverted the `package.json` edit immediately, so the worktree is **clean** (`git status` empty).

## What that means

Declaring the dependency and regenerating the lockfile is a **network operation** - it needs a real `pnpm install`, which this run's rules forbid. The fallback resolution added earlier (normal import first, warned fallback to the legacy tree) therefore stays, and packaging self-containment remains open with an exact, one-command remedy for a normal development session:

```
# add vite + @tailwindcss/vite to apps/runtime-ui-next, then
pnpm install   # regenerates pnpm-lock.yaml
```

Recording the failure rather than leaving a package.json that a frozen-lockfile install would reject.
