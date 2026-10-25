import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  comfortableSemanticTheme,
  compactSemanticTheme,
  expressiveSemanticTheme,
} from './semantic-themes'
import { scopedRoleDeclarations } from '@/lib/theme-roles'

import { complexTokens } from '../complex-tokens.stylex'
import { foundationTokens } from '../foundations-tokens.stylex'
import { tokens } from '../tokens.stylex'
import type { PrimitiveChildren } from './types'

export const SEMANTIC_THEME_NAMES = [
  'comfortable',
  'compact',
  'expressive',
] as const
export type SemanticThemeName = (typeof SEMANTIC_THEME_NAMES)[number]

export type ThemeScopeProps = Readonly<{
  children: PrimitiveChildren
  theme?: SemanticThemeName | undefined
  /** Re-resolve every theme role against the `.dark` or light palette for this subtree. */
  colorScheme?: 'dark' | 'light' | undefined
}>

const variableName = (variable: string): string =>
  variable.replace(/^var\((--[^,)]+).*/u, '$1')

// Role variables are bound at :root; a subtree palette needs them rebound
// at the scope element so derived roles (hover mixes) follow it.
const roleBindings = (
  [
    ['tokens', tokens],
    ['foundationTokens', foundationTokens],
    ['complexTokens', complexTokens],
  ] as const
)
  .map(([group, vars]) => {
    const names = new Map(
      Object.entries(vars).flatMap(([role, value]) =>
        typeof value === 'string' ? [[role, variableName(value)] as const] : [],
      ),
    )
    return scopedRoleDeclarations(group, role => names.get(role) ?? '')
  })
  .join(';')

export const themeScope = <Message>(
  props: ThemeScopeProps,
  h: HtmlBuilder<Message>,
): Html => {
  const theme = {
    comfortable: comfortableSemanticTheme,
    compact: compactSemanticTheme,
    expressive: expressiveSemanticTheme,
  }[props.theme ?? 'comfortable']
  return h.div(
    [
      h.Class(stylex.props(theme).className ?? ''),
      h.DataAttribute('semantic-theme', props.theme ?? 'comfortable'),
      ...(props.colorScheme === undefined
        ? []
        : [
            h.Class(
              `${props.colorScheme} ${stylex.props(theme).className ?? ''}`,
            ),
            h.DataAttribute('color-scheme', props.colorScheme),
            h.Attribute(
              'style',
              `color-scheme:${props.colorScheme};${roleBindings}`,
            ),
          ]),
    ],
    props.children,
  )
}
