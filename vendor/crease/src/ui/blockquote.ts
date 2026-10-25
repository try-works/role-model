import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Blockquote (packages/core/src/Blockquote/Blockquote.tsx)
   — examples and visual spec adapted to Crease UI tokens. */

export type BlockquoteProps = Readonly<{
  children: ReadonlyArray<Html | string>
  cite?: string
  class?: string
}>

/* PORT-NOTE: astryx's border-emphasized (light #CCD3DB / dark #494D53) maps to
   the nearest Crease UI border token. */
export const blockquote = <Msg>(
  props: BlockquoteProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.blockquote(
    [
      h.DataAttribute('slot', 'blockquote'),
      h.Class(
        cn(
          'm-0 border-s-2 border-border ps-4 break-words text-muted-foreground',
          props.class,
        ),
      ),
    ],
    [
      ...props.children,
      ...(props.cite === undefined
        ? []
        : [
            h.cite(
              [
                h.DataAttribute('slot', 'blockquote-cite'),
                h.Class('mt-2 block text-xs leading-5 not-italic'),
              ],
              [props.cite],
            ),
          ]),
    ],
  )
