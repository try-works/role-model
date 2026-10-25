import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx Blockquote (packages/core/src/Blockquote/Blockquote.tsx)
   — examples and visual spec adapted to Crease UI tokens. */

const styles = stylex.create({
  root: {
    margin: 0,
    borderInlineStartColor: tokens.border,
    borderInlineStartStyle: 'solid',
    /* PORT-NOTE: needs token 'borderEmphasized' = light #CCD3DB / dark
       #494D53 — astryx's emphasized border; tokens.border is the nearest
       existing token. */
    borderInlineStartWidth: '2px',
    color: tokens.mutedForeground,
    overflowWrap: 'break-word',
    paddingInlineStart: '1rem',
  },
  cite: {
    display: 'block',
    fontSize: '0.75rem',
    fontStyle: 'normal',
    lineHeight: 1.6667,
    marginBlockStart: '0.5rem',
  },
})

export type BlockquoteProps = Readonly<{
  children: ReadonlyArray<Html | string>
  cite?: string
  layoutStyle?: ComponentLayoutStyle
}>

export const blockquote = <Msg>(
  props: BlockquoteProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.blockquote(
    [
      h.DataAttribute('slot', 'blockquote'),
      h.Class(className(reset.text, styles.root, props.layoutStyle)),
    ],
    [
      ...props.children,
      ...(props.cite === undefined
        ? []
        : [
            h.cite(
              [
                h.DataAttribute('slot', 'blockquote-cite'),
                h.Class(className(styles.cite)),
              ],
              [props.cite],
            ),
          ]),
    ],
  )
