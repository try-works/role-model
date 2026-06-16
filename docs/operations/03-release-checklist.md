# Release Checklist

Use this checklist every time you cut a tagged `role-model` release.

## Before tagging

1. Merge only from a commit that already passed `ci.yml`.
2. Confirm the release commit range includes the locked recursive receipts you want the changelog generator to read.
3. Update `apps/docs-site/content/docs/` for every user-visible install, benchmark, routing, UI, or release-flow change in the release.
4. Confirm installer and manual-download docs still match the assets the workflow will publish.
5. Run the local release floor:

```bash
corepack pnpm run ci:check
corepack pnpm run docs:build
corepack pnpm run runtime:package-sea
```

## Tagging

1. Create an annotated tag: `git tag -a vX.Y.Z -m "role-model vX.Y.Z"`
2. Push the tag: `git push origin vX.Y.Z`

## What GitHub should do

The tag should trigger `build-binaries.yml`, which now:

1. builds all supported runtime archives,
2. attests the built archives,
3. gathers every archive into one publish job,
4. adds installer scripts,
5. writes `SHA256SUMS.txt`,
6. generates a recursive changelog from implementation, decisions, and state receipts in the tag range,
7. creates one GitHub Release using that recursive changelog plus generated release notes.

## After publish

Verify the GitHub Release contains:

- all four platform archives,
- `install.sh`,
- `install.ps1`,
- `SHA256SUMS.txt`,
- generated release notes grouped by the categories in [.github/release.yml](../../.github/release.yml),
- the recursive changelog at the top of the release body.

Also verify:

- the release is marked prerelease only when the tag is prerelease-like,
- installer scripts still resolve the latest published release,
- the release workflow produced artifact attestations for the archives,
- manual-download instructions in [install.md](../public/install.md) still match the released filenames.

## Environment protection

Use a GitHub Actions environment named `release` for required reviewers or other deployment protections. The
workflow references this environment, but the approval rules themselves live in repository settings.
