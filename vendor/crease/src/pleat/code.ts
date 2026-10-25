import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { foundationTokens } from './foundations-tokens'
import { tokens } from './tokens'

/* Ported from Meta Astryx Code (packages/core/src/Code/Code.tsx) — examples
   and visual spec adapted to Crease UI tokens. */

/** Text color for `code`, mirroring the primary/secondary/inherit subset of Text. */
export type CodeColor = 'primary' | 'secondary' | 'inherit'

/** Font size for `code`. `'inherit'` adopts the surrounding text size. */
export type CodeSize = 'inherit'

const styles = {
  base: Style.make({
    borderRadius: foundationTokens.radiusBase,
    paddingBlock: 0,
    paddingInline: '0.25rem',
    backgroundColor: tokens.muted,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    lineHeight: 'inherit',
    overflowWrap: 'break-word',
  }),
}

const colorStyles = {
  primary: Style.make({ color: tokens.foreground }),
  secondary: Style.make({ color: tokens.mutedForeground }),
  inherit: Style.make({ color: 'currentColor' }),
}

const sizeStyles = {
  inherit: Style.make({ fontSize: '0.875rem', lineHeight: 'inherit' }),
}

export type CodeProps = Readonly<{
  children: ReadonlyArray<Html | string>
  color?: CodeColor
  size?: CodeSize
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export const code = <Msg>(props: CodeProps, h: HtmlBuilder<Msg>): Html =>
  h.code(
    [
      h.DataAttribute('slot', 'code'),
      h.DataAttribute('color', props.color ?? 'primary'),
      h.Class(
        className(
          reset.code,
          styles.base,
          colorStyles[props.color ?? 'primary'],
          ...(props.size === undefined ? [] : [sizeStyles[props.size]]),
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
