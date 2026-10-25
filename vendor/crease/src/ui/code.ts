import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Code (packages/core/src/Code/Code.tsx) — examples
   and visual spec adapted to Crease UI tokens. */

/** Text color for `code`, mirroring the primary/secondary/inherit subset of Text. */
export type CodeColor = 'primary' | 'secondary' | 'inherit'

/** Font size for `code`. `'inherit'` adopts the surrounding text size. */
export type CodeSize = 'inherit'

const colorClass: Record<CodeColor, string> = {
  primary: 'text-foreground',
  secondary: 'text-muted-foreground',
  inherit: 'text-inherit',
}

export type CodeProps = Readonly<{
  children: ReadonlyArray<Html | string>
  color?: CodeColor
  size?: CodeSize
  class?: string
}>

export const code = <Msg>(props: CodeProps, h: HtmlBuilder<Msg>): Html =>
  h.code(
    [
      h.DataAttribute('slot', 'code'),
      h.DataAttribute('color', props.color ?? 'primary'),
      h.Class(
        cn(
          'font-mono text-sm leading-[inherit] bg-muted px-1 py-0 rounded-[4px] break-words',
          colorClass[props.color ?? 'primary'],
          props.size === 'inherit' && 'text-[inherit] leading-inherit',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
