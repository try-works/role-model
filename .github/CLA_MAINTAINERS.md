# CLA Maintainer Checklist

This repository uses `cla-assistant-lite` with a versioned CLA document and a
versioned signatures file.

## First-time verification

1. Push the CLA files and workflow to GitHub.
2. Open a pull request from a second GitHub account that has not signed the
   CLA before.
3. Confirm the `CLA` check appears and fails.
4. Confirm the PR comment points to the intended CLA version file.
5. Reply on the pull request with the exact assent phrase:

   `I have read cla/CLA-v1.0.md and I hereby agree to the role-model Contributor License Agreement.`

6. Confirm the `CLA` check turns green.
7. Confirm the workflow creates or updates `signatures/cla-v1.json` on `main`.
8. Push another commit to the same pull request and confirm the `CLA` check
   remains green.
9. Only after the workflow works end-to-end, add the `CLA` check as a
   required status check in branch protection.

## Hardening the CLA document URL

The workflow is intended to point `path-to-document` at the immutable tag URL:

`https://raw.githubusercontent.com/try-works/role-model/cla-v1.0/cla/CLA-v1.0.md`

To keep that true:

1. Create and push the matching git tag `cla-v1.0` after the CLA text is
   finalized.
2. Verify that the raw GitHub URL for that tag resolves correctly.
3. Re-run the first-time verification flow with a second GitHub account.
4. Only then make the `CLA` check mandatory in branch protection.

This ensures contributors assent to an immutable document URL rather than a
file on a moving branch.

## Publishing a new CLA version

When the contributor agreement changes:

1. Do not edit any existing `cla/CLA-vX.Y.md` file.
2. Add a new file such as `cla/CLA-v1.1.md`.
3. Update `CLA.md` to point to the new version.
4. Update the workflow:
   - `path-to-document`
   - `path-to-signatures` such as `signatures/cla-v1_1.json`
   - the exact assent phrase in both the `if` condition and
     `custom-pr-sign-comment`
   - the explanatory PR comment text
5. Create and push a tag for the new version, for example `cla-v1.1`.
6. Point `path-to-document` at that tag URL.
7. Re-run the first-time verification flow with a test account.

## Operational caveats

- `cla-assistant-lite` writes signature data back to the repository. If
  branch protection blocks action commits to `main`, the workflow will fail
  until that is allowed.
- The action repository is archived upstream, so monitor it conservatively and
  be prepared to replace it later if GitHub platform changes break it.
