import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export type LabelProps = Readonly<{
  for?: string
  id?: string
  isRequired?: boolean
  isDisabled?: boolean
  class?: string
  children: ReadonlyArray<Html | string>
}>

export const label = <Msg>(props: LabelProps, h: HtmlBuilder<Msg>): Html => {
  return h.label(
    [
      h.DataAttribute('slot', 'label'),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
      ...(props.for === undefined ? [] : [h.For(props.for)]),
      h.DataAttribute('required', String(props.isRequired ?? false)),
      h.DataAttribute('disabled', String(props.isDisabled ?? false)),
      ...((props.isDisabled ?? false) ? [h.AriaDisabled(true)] : []),
      h.Class(
        cn(
          'flex items-center gap-2 text-sm leading-none font-medium select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          props.class,
        ),
      ),
    ],
    [
      ...props.children,
      ...((props.isRequired ?? false)
        ? [h.span([h.AriaHidden(true)], ['*'])]
        : []),
    ],
  )
}
