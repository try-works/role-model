import { COMPONENT_LAYOUT_PROPERTY_NAMES } from '@/lib/layout-properties'

/*
 * Post-pass over emitted documentation programs.
 *
 * The shared emitters render styled example programs for both the StyleX and
 * Pleat renderers. A few emit paths reference `className(...)` or `styles.*`
 * without emitting the matching import or `const styles` declaration for the
 * specific fixture branch. This repair applies the missing pieces to the
 * finished program text so every emitted program typechecks against the real
 * APIs, declares its styles before `Runtime.run`, and passes only validated
 * placement styles to `*layoutStyle` slots.
 */

const SHELL_DECLARATIONS = `{
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
    }`

const SHELL_PLAIN_DECLARATIONS = `{
      marginInline: 'auto',
      maxWidth: '28rem',
      padding: '2rem',
    }`

/**
 * Inserts a module-scope declaration directly after the import block, so
 * it is initialized before `Runtime.run` evaluates the first view.
 */
const insertAfterImports = (source: string, declaration: string): string => {
  const imports = [
    ...source.matchAll(/^import\b[\s\S]*?from\s+'[^']+'[ \t]*$/gm),
  ]
  const last = imports.at(-1)
  if (last === undefined) return `${declaration}\n\n${source}`
  const end = last.index + last[0].length
  return `${source.slice(0, end)}\n\n${declaration}${source.slice(end)}`
}

const SHELL_ENTRIES: Record<string, string> = {
  shell: SHELL_DECLARATIONS,
  shellPlain: SHELL_PLAIN_DECLARATIONS,
  page: SHELL_PLAIN_DECLARATIONS,
}

const addImport = (code: string, importLine: string): string => {
  const imports = [...code.matchAll(/^import .*$/gm)]
  const last = imports.at(-1)
  if (last === undefined) {
    return `${importLine}\n\n${code}`
  }
  const at = last.index! + last[0].length
  return `${code.slice(0, at)}\n${importLine}${code.slice(at)}`
}

/**
 * StyleX can only extract `stylex.create` calls whose declarations are
 * statically authored at module scope, so inline `layoutStyle({ ... })`
 * calls in StyleX programs are hoisted into one module-scope
 * `stylex.create` and referenced by key. The extracted entries are typed
 * against the closed `ComponentLayoutStyle` contract by StyleX itself.
 */
const hoistStyleXLayoutStyles = (source: string): string => {
  const declarations: Array<string> = []
  let out = ''
  let cursor = 0
  const pattern = /\blayoutStyle\(/g
  for (
    let match = pattern.exec(source);
    match !== null;
    match = pattern.exec(source)
  ) {
    const open = match.index + match[0].length
    let depth = 1
    let end = open
    while (end < source.length && depth > 0) {
      const char = source[end]
      if (char === '(') depth += 1
      else if (char === ')') depth -= 1
      end += 1
    }
    const key = `layout${String(declarations.length)}`
    declarations.push(`${key}: ${source.slice(open, end - 1).trim()}`)
    out += `${source.slice(cursor, match.index)}layoutStyles.${key}`
    cursor = end
    pattern.lastIndex = end
  }
  out += source.slice(cursor)
  out = out.replace(
    /^import \{ layoutStyle \} from '@\/stylex\/contracts'\n/m,
    '',
  )
  if (declarations.length === 0) return out
  if (!/import \* as stylex from '@stylexjs\/stylex'/.test(out)) {
    out = addImport(out, "import * as stylex from '@stylexjs/stylex'")
  }
  return insertAfterImports(
    out,
    `const layoutStyles = stylex.create({\n  ${declarations.join(',\n  ')},\n})`,
  )
}

/** Finds the balanced `(...)`/`{...}` span opening at `open`. */
const closingIndex = (source: string, open: number): number => {
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (char === '(' || char === '{' || char === '[') depth += 1
    else if (char === ')' || char === '}' || char === ']') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const topLevelKeys = (literal: string): ReadonlyArray<string> => {
  const keys: Array<string> = []
  let depth = 0
  for (let index = 0; index < literal.length; index += 1) {
    const char = literal[index]!
    if (char === '(' || char === '{' || char === '[') depth += 1
    else if (char === ')' || char === '}' || char === ']') depth -= 1
    if (depth === 1 && (char === '{' || char === ',')) {
      const rest = literal.slice(index + 1)
      if (/^\s*\.\.\./.test(rest)) keys.push('...')
      const key = /^\s*(?:'([\w-]+)'|(\w+))\s*:/.exec(rest)
      if (key !== null) keys.push(key[1] ?? key[2]!)
    }
  }
  return keys
}

const isLayoutOnly = (literal: string): boolean => {
  const keys = topLevelKeys(literal)
  return (
    keys.length > 0 &&
    keys.every(key => COMPONENT_LAYOUT_PROPERTY_NAMES.has(key))
  )
}

/**
 * Styles passed to a `*layoutStyle` slot must satisfy the closed
 * `ComponentLayoutStyle` contract without assertions. Pleat entries that only
 * declare parent-layout properties are rebuilt through the validating
 * `layoutStyle` constructor; StyleX entries are already typed by
 * `stylex.create`, so redundant assertions on them are dropped. Appearance
 * styles are never asserted into the layout type.
 */
const promoteLayoutStyles = (
  source: string,
  base: 'stylex' | 'pleat',
): string => {
  let out = source
  const referenced = new Set(
    [
      ...out.matchAll(/\w*[Ll]ayoutStyle:\s*([^,\n]*(?:\n\s*[?:][^,\n]*)*)/g),
    ].flatMap(match =>
      [...match[1]!.matchAll(/\bstyles\.(\w+)/g)].map(ref => ref[1]!),
    ),
  )
  const layoutOnly = new Set<string>()
  for (const name of referenced) {
    const entry = new RegExp(
      base === 'pleat'
        ? `\\b${name}:\\s*Style\\.make\\(`
        : `\\b${name}:\\s*\\{`,
    ).exec(out)
    if (entry === null) continue
    const open = entry.index + entry[0].length - 1
    const close = closingIndex(out, open)
    const literal =
      base === 'pleat'
        ? out.slice(open + 1, close).trim()
        : out.slice(open, close + 1)
    const isChained = /^\s*\.pipe\(/.test(out.slice(close + 1))
    if (!literal.startsWith('{') || isChained || !isLayoutOnly(literal))
      continue
    layoutOnly.add(name)
    if (base === 'pleat') {
      out = `${out.slice(0, open - 'Style.make'.length)}layoutStyle${out.slice(open)}`
    }
  }
  for (const name of layoutOnly) {
    out = out.replace(
      new RegExp(`(styles\\.${name})\\s+as\\s+ComponentLayoutStyle\\b`, 'g'),
      '$1',
    )
  }
  if (
    base === 'pleat' &&
    /\blayoutStyle\(/.test(out) &&
    !/import \{[^}]*\blayoutStyle\b[^}]*\} from '@\/pleat\/contracts'/.test(out)
  ) {
    out = addImport(out, "import { layoutStyle } from '@/pleat/contracts'")
  }
  if (
    !/as ComponentLayoutStyle\b|:\s*ComponentLayoutStyle\b|<ComponentLayoutStyle>/.test(
      out,
    )
  ) {
    out = out.replace(
      /^import type \{ ComponentLayoutStyle \} from '@\/(?:stylex|pleat)\/contracts'\n/m,
      '',
    )
  }
  return out
}

export const repairStyled = (
  code: string,
  base: 'stylex' | 'pleat',
): string => {
  let out = base === 'stylex' ? hoistStyleXLayoutStyles(code) : code
  const baseModule = base === 'pleat' ? '@/pleat' : '@/stylex'

  if (/\bclassName\(/.test(out) && !/import\s*\{[^}]*\bclassName\b/.test(out)) {
    out = addImport(out, `import { className } from '${baseModule}/style'`)
  }

  if (
    /\bstylex\.(props|create|defineVars|createTheme)\(/.test(out) &&
    !/import \* as stylex/.test(out)
  ) {
    out = addImport(out, "import * as stylex from '@stylexjs/stylex'")
  }

  const styleRefs = new Set(
    [...out.matchAll(/\bstyles\.(\w+)/g)].map(match => match[1]!),
  )
  if (styleRefs.size > 0) {
    if (/const styles\s*=/.test(out)) {
      for (const name of styleRefs) {
        const declaration = SHELL_ENTRIES[name]
        if (declaration === undefined) continue
        if (new RegExp(`\\b${name}\\s*:`).test(out)) continue
        out = out.replace(
          /(const styles\s*=\s*)(stylex\.create\(\{|\{)/,
          (_all, head, open) =>
            `${head}${open}\n    ${name}: ${base === 'pleat' ? `Style.make(${declaration})` : declaration},`,
        )
      }
    } else {
      const entry = (name: string): string =>
        base === 'pleat'
          ? `${name}: Style.make(${SHELL_ENTRIES[name]})`
          : `${name}: ${SHELL_ENTRIES[name]}`
      const emitted = [...styleRefs].filter(name => name in SHELL_ENTRIES)
      if (emitted.length > 0) {
        const body =
          base === 'pleat'
            ? `{ ${emitted.map(entry).join(', ')} }`
            : `stylex.create({ ${emitted.map(entry).join(', ')} })`
        if (base === 'pleat' && !/\bStyle\b/.test(out)) {
          out = addImport(out, "import { Style } from '@pleat/core'")
        }
        if (
          base === 'stylex' &&
          !/import \* as stylex/.test(out) &&
          !/from '@stylexjs\/stylex'/.test(out)
        ) {
          out = addImport(out, "import * as stylex from '@stylexjs/stylex'")
        }
        out = insertAfterImports(out, `const styles = ${body}`)
      }
    }
  }

  if (
    base === 'pleat' &&
    /Style\.make\(/.test(out) &&
    !/\bStyle\b/.test(out.replaceAll('Style.make', ''))
  ) {
    out = addImport(out, "import { Style } from '@pleat/core'")
  }

  out = promoteLayoutStyles(out, base)

  return out
}
