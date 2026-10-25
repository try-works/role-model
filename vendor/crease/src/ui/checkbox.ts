import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { type CheckboxBehaviorProps, renderCheckbox } from '@/lib/checkbox'
import { cn } from '@/lib/utils'

const CHECKBOX_CLASS =
  'peer group size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[checked]:bg-primary'

const INDICATOR_CLASS =
  'hidden place-content-center text-current transition-none group-data-[checked]:grid group-data-[indeterminate]:grid'

const LABEL_CLASS =
  'text-sm leading-none font-medium select-none peer-data-[disabled]:cursor-not-allowed peer-data-[disabled]:opacity-50'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

export type CheckboxProps<Msg> = CheckboxBehaviorProps<Msg> &
  Readonly<{ class?: string; tabindex?: number }>

export const checkbox = <Msg>(
  props: CheckboxProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return renderCheckbox(
    props,
    {
      root: [h.Class('flex items-start gap-2')],
      control: [
        h.Class(cn(CHECKBOX_CLASS, props.class)),
        ...(props.tabindex === undefined ? [] : [h.Tabindex(props.tabindex)]),
      ],
      indicator: [h.Class(INDICATOR_CLASS)],
      text: [h.Class('grid gap-1.5')],
      label: [h.Class(LABEL_CLASS)],
      description: [h.Class(DESCRIPTION_CLASS)],
    },
    props.isIndeterminate === true
      ? Icon.minus<Msg>({ class: 'size-3.5' }, h)
      : Icon.check<Msg>({ class: 'size-3.5' }, h),
    h,
  )
}

/*
Model: { acceptedTerms: S.Boolean }
Update: ToggledTerms: ({ isChecked }) => [evo(model, { acceptedTerms: () => isChecked }), []]
View: Checkbox.checkbox({ id: 'terms', isChecked: model.acceptedTerms, onToggle: isChecked => ToggledTerms({ isChecked }), label: 'Accept terms' })
*/
