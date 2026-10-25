import type { Html, HtmlBuilder } from 'foldkit/html'

import { type TextareaBehaviorProps, renderTextarea } from '@/lib/textarea'
import { cn } from '@/lib/utils'

/* Ported from shadcn/ui textarea.tsx. The textarea class string is verbatim.
   The foldkit Textarea primitive sets the native disabled attribute, so
   shadcn's `disabled:` variants work unchanged. It also wires the optional
   label and description to the textarea through its attribute groups. */

const TEXTAREA_CLASS =
  'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40'

const LABEL_CLASS =
  'flex items-center gap-2 text-sm leading-none font-medium select-none'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

const RESIZE_CLASS = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
} as const

export type TextareaProps<Msg> = TextareaBehaviorProps<Msg> &
  Readonly<{
    class?: string
  }>

export const textarea = <Msg>(
  props: TextareaProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return renderTextarea(
    props,
    {
      field: [h.Class('grid gap-2')],
      label: [h.Class(LABEL_CLASS)],
      textarea: [
        h.Class(
          cn(
            TEXTAREA_CLASS,
            RESIZE_CLASS[props.resize ?? 'vertical'],
            props.class,
          ),
        ),
      ],
      description: [h.Class(DESCRIPTION_CLASS)],
    },
    h,
  )
}
