import type { Html, HtmlBuilder } from 'foldkit/html'

import { Select as SelectPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

/* Ported from shadcn/ui native-select.tsx over foldkit's native Select
   rendering helper. The wrapper is a span as required by this port; its
   classes, the select classes, and the option/optgroup classes are copied
   verbatim from shadcn. */

const WRAPPER_CLASS =
  'group/native-select relative w-fit has-[select:disabled]:opacity-50'

const SELECT_CLASS =
  'h-8 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-2.5 py-1.5 pr-8 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'

const ICON_CLASS =
  'pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none'

const OPTION_CLASS = 'bg-[Canvas] text-[CanvasText]'

const LABEL_CLASS =
  'flex items-center gap-2 text-sm leading-none font-medium select-none'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

export type NativeSelectOption = Readonly<{
  value: string
  label: string
  isDisabled?: boolean
}>

export type NativeSelectGroup = Readonly<{
  label: string
  options: ReadonlyArray<NativeSelectOption>
  isDisabled?: boolean
}>

export type NativeSelectOptionProps = NativeSelectOption &
  Readonly<{
    class?: string
  }>

export const nativeSelectOption = <Msg>(
  props: NativeSelectOptionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.option(
    [
      h.DataAttribute('slot', 'native-select-option'),
      h.Value(props.value),
      ...(props.isDisabled === undefined ? [] : [h.Disabled(props.isDisabled)]),
      h.Class(cn(OPTION_CLASS, props.class)),
    ],
    [props.label],
  )
}

export type NativeSelectOptGroupProps = NativeSelectGroup &
  Readonly<{
    class?: string
  }>

export const nativeSelectOptGroup = <Msg>(
  props: NativeSelectOptGroupProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.optgroup(
    [
      h.DataAttribute('slot', 'native-select-optgroup'),
      h.LabelAttr(props.label),
      ...(props.isDisabled === undefined ? [] : [h.Disabled(props.isDisabled)]),
      h.Class(cn(OPTION_CLASS, props.class)),
    ],
    props.options.map(option => nativeSelectOption<Msg>(option, h)),
  )
}

export type NativeSelectProps<Msg> = Readonly<{
  id: string
  value: string
  onChange: (value: string) => Msg
  options: ReadonlyArray<NativeSelectOption>
  groups?: ReadonlyArray<NativeSelectGroup>
  label?: string
  description?: string
  name?: string
  size?: 'sm' | 'default'
  isDisabled?: boolean
  isInvalid?: boolean
  direction?: 'ltr' | 'rtl'
  class?: string
}>

export const nativeSelect = <Msg>(
  props: NativeSelectProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return SelectPrimitive.view(
    {
      id: props.id,
      value: props.value,
      onChange: props.onChange,
      isDisabled: props.isDisabled ?? false,
      isInvalid: props.isInvalid ?? false,
      ...(props.name === undefined ? {} : { name: props.name }),
      hasDescription: props.description !== undefined,
      toView: ({ select: selectAttributes, label, description }) => {
        const selectElement = h.span(
          [
            h.DataAttribute('slot', 'native-select-wrapper'),
            h.Class(WRAPPER_CLASS),
          ],
          [
            h.select(
              [
                ...selectAttributes,
                ...(props.direction === undefined
                  ? []
                  : [h.Dir(props.direction)]),
                h.DataAttribute('slot', 'native-select'),
                h.DataAttribute('size', props.size ?? 'default'),
                h.Class(cn(SELECT_CLASS, props.class)),
              ],
              [
                ...props.options.map(option =>
                  nativeSelectOption<Msg>(option, h),
                ),
                ...(props.groups ?? []).map(group =>
                  nativeSelectOptGroup<Msg>(group, h),
                ),
              ],
            ),
            h.span(
              [
                h.DataAttribute('slot', 'native-select-icon'),
                h.Class(ICON_CLASS),
              ],
              [Icon.chevronDown<Msg>({ class: 'size-4' }, h)],
            ),
          ],
        )

        if (props.label === undefined && props.description === undefined) {
          return selectElement
        }

        return h.div(
          [h.Class('grid gap-2')],
          [
            ...(props.label === undefined
              ? []
              : [h.label([...label, h.Class(LABEL_CLASS)], [props.label])]),
            selectElement,
            ...(props.description === undefined
              ? []
              : [
                  h.p(
                    [...description, h.Class(DESCRIPTION_CLASS)],
                    [props.description],
                  ),
                ]),
          ],
        )
      },
    },
    h,
  )
}
