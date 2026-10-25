import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import {
  type RadioGroupBehaviorProps,
  Message,
  Model,
  type OutMessage,
  init,
  renderRadioGroup,
  update,
} from '@/lib/radio-group'
import { cn } from '@/lib/utils'

const GROUP_CLASS = 'grid gap-3'

const ITEM_CLASS =
  'group aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40'

const INDICATOR_CLASS =
  'relative hidden items-center justify-center group-data-[checked]:flex'

const LABEL_CLASS = 'text-sm leading-none font-medium select-none'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

export type { RadioGroupOption } from '@/lib/radio-group'

export type RadioGroupProps<Msg> = RadioGroupBehaviorProps<Msg> &
  Readonly<{
    class?: string
  }>

export { Message, Model, init, update }
export type { OutMessage }

export const radioGroup = <Msg>(
  props: RadioGroupProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return renderRadioGroup(
    props,
    {
      group: [h.Class(cn(GROUP_CLASS, props.class))],
      row: [h.Class('flex items-start gap-2')],
      item: () => [h.Class(ITEM_CLASS)],
      indicator: [h.Class(INDICATOR_CLASS)],
      text: [h.Class('grid gap-1.5')],
      label: [h.Class(LABEL_CLASS)],
      description: [h.Class(DESCRIPTION_CLASS)],
    },
    (isSelected, indicatorH) =>
      isSelected
        ? Icon.circleIcon<Msg>(
            {
              class:
                'absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary',
            },
            indicatorH,
          )
        : indicatorH.empty,
    h,
  )
}

/*
Model: { selectedPlan: 'basic' }
Update: store the value emitted by onSelect in selectedPlan
View: RadioGroup.radioGroup({ model: model.plan, toParentMessage: GotRadioMessage, ariaLabel: 'Plan', options: [{ value: 'basic', label: 'Basic' }] })
*/
