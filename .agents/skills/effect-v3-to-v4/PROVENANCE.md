# Installed skill provenance: `effect-v3-to-v4`

This skill is an installed copy of upstream `Effect-TS/skills`, not first-party text.

| field | value |
| --- | --- |
| upstream | https://github.com/effect-ts/skills |
| path upstream | `skills/effect-v3-to-v4/SKILL.md` |
| commit | `2309e6f27d9955b434c0e3f394b945c136e89fd2` ("Update effect-ts skill to install effect@rc (#12)") |
| retrieved | 2026-09-27 |
| sha256 | `62ef89aa2967b68fab2a29bbb5b8f038ed9e40c047cf8bc08c37d29ba5f48563` |

## Why it is installed here

The public repository's Effect code is on the v4 line (`effect@4.0.0-rc.117`, vendored under `vendor/effect`), and
parts of the router still carry v3 idioms. This skill is the bounded migration workflow for moving a file, package or
module from v3 to v4 against the generated `migration/v3-to-v4.md` reference, so a migration is a planned change
rather than an opportunistic rewrite.

## Refreshing the pin

```bash
git clone --depth 1 https://github.com/effect-ts/skills.git /tmp/effect-skills
cp /tmp/effect-skills/skills/effect-v3-to-v4/SKILL.md .agents/skills/effect-v3-to-v4/SKILL.md
```

Then update this file's commit, retrieval date and digest in the same commit.
