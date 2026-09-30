/**
 * The bundled `role-model` skill.
 *
 * The skill body ships as a file next to the built bundle, so its directory is
 * resolved from the module's own location and probed for both layouts (the built
 * `lib/` and the authored `src/`), exactly as the taxonomy data root is.
 *
 * @module @try-works/dsh-role-model/skills
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The packaged skill's name. Lower-case, matching the product name. */
export const SKILL_NAME = 'role-model'

/** A skill registration, structurally what the harness's skill registry accepts. */
export interface SkillRegistration {
  readonly name: string
  readonly description: string
  readonly source: string
  readonly content: string
  readonly resourceBase?: { readonly kind: 'directory'; readonly path: string }
}

/**
 * Resolve the packaged skill directory.
 * @param fromDirectory - directory of the module doing the resolving.
 * @returns the absolute skill directory, or undefined when it is not present.
 */
export function resolveSkillDirectory(fromDirectory: string): string | undefined {
  const candidates = [
    // The built bundle: `lib/index.js` -> `<pkg>/skills/role-model`.
    join(fromDirectory, '../skills', SKILL_NAME),
    // The sources: `src/*.ts` -> `<pkg>/skills/role-model`.
    join(fromDirectory, '../../skills', SKILL_NAME),
    // The sources with the bundler's `import.meta.url` still pointing at them.
    join(fromDirectory, '../../../skills', SKILL_NAME),
  ]
  return candidates.find(candidate => existsSync(join(candidate, 'SKILL.md')))
}

/**
 * Read the packaged skill body.
 * @param fromDirectory - directory of the module doing the reading.
 * @returns the body, or undefined when the skill file is not present.
 */
export function readSkillBody(fromDirectory: string): { content: string; directory: string } | undefined {
  const directory = resolveSkillDirectory(fromDirectory)
  if (directory === undefined) return undefined
  return { content: readFileSync(join(directory, 'SKILL.md'), 'utf8'), directory }
}

/**
 * Build the skill registration from the packaged files.
 *
 * Returns undefined rather than throwing when the skill file is missing: a missing
 * skill degrades the plugin's usefulness, it does not invalidate the route.
 *
 * @param fromDirectory - directory of the module doing the reading.
 * @param description - routing description shown by skill discovery.
 * @returns the registration, or undefined when the skill file is absent.
 */
export function createSkillRegistration(
  fromDirectory: string,
  description: string,
): SkillRegistration | undefined {
  const body = readSkillBody(fromDirectory)
  if (body === undefined) return undefined
  return {
    name: SKILL_NAME,
    description,
    source: 'bundled',
    content: body.content,
    resourceBase: { kind: 'directory', path: body.directory },
  }
}

/** The description skill discovery matches against (mirrors the file's frontmatter). */
export const SKILL_DESCRIPTION =
  'Use when routing model requests through an externally running role-model runtime, inspecting role-model aliases, or diagnosing the role-model provider route.'

/** The directory to resolve the packaged skill from, for the built and source layouts. */
export function skillDirectoryFromModuleUrl(moduleUrl: string): string {
  return dirname(fileURLToPath(moduleUrl))
}
