import type { Html, HtmlBuilder } from 'foldkit/html'

import { type InputBehaviorProps, renderInput } from '@/lib/input'
import { cn } from '@/lib/utils'

/* Ported from shadcn/ui input.tsx + label.tsx. Class strings verbatim — the
   foldkit Input primitive sets the native disabled attribute as well as
   data-disabled, so shadcn's `disabled:` variants work unchanged. The primitive
   also wires label/description ids for free via its attribute groups. */

const INPUT_CLASS =
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-8 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'

const LABEL_CLASS =
  'flex items-center gap-2 text-sm leading-none font-medium select-none'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

export type InputProps<Msg> = InputBehaviorProps<Msg> &
  Readonly<{
    class?: string
  }>

export const input = <Msg>(
  props: InputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return renderInput(
    props,
    {
      field: [h.Class('grid gap-2')],
      label: [h.Class(LABEL_CLASS)],
      input: [h.Class(cn(INPUT_CLASS, props.class))],
      description: [h.Class(DESCRIPTION_CLASS)],
    },
    h,
  )
}
