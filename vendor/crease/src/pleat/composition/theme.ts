import { Style, Theme } from '@pleat/core'
import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  comfortableSemanticTheme,
  compactSemanticTheme,
  expressiveSemanticTheme,
} from './semantic-themes'
import { complexTokensTheme } from '../complex-tokens'
import { className } from '../style'
import { foundationTokensTheme } from '../foundations-tokens'
import { tokensTheme } from '../tokens'
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

const SCHEMES = {
  dark: Style.make({ colorScheme: 'dark' }),
  light: Style.make({ colorScheme: 'light' }),
}

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
      ...css(
        ...Theme.bindings(theme),
        // Role variables are bound at :root; rebinding them here makes
        // derived roles follow the subtree palette.
        ...(props.colorScheme !== undefined
          ? [
              ...Theme.bindings(tokensTheme),
              ...Theme.bindings(foundationTokensTheme),
              ...Theme.bindings(complexTokensTheme),
            ]
          : []),
      ),
      h.DataAttribute('semantic-theme', props.theme ?? 'comfortable'),
      ...(props.colorScheme === undefined
        ? []
        : [
            h.Class(
              `${props.colorScheme} ${className(SCHEMES[props.colorScheme])}`,
            ),
            h.DataAttribute('color-scheme', props.colorScheme),
          ]),
    ],
    props.children,
  )
}
