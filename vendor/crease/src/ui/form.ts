import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Field from '@/ui/field'
import {
  type ErrorSummaryProps as SharedErrorSummaryProps,
  type FormBehaviorProps,
  renderErrorSummary,
  renderForm,
} from '@/lib/form'
import { cn } from '@/lib/utils'

export type { FormError, FormMethod } from '@/lib/form'
export { formControlIds } from '@/lib/form'

type Slot = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
}>

export type FormProps<Msg> = FormBehaviorProps<Msg> &
  Readonly<{ class?: string }>

export const form = <Msg>(props: FormProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  return renderForm(props, [h.Class(cn('space-y-6', props.class))], h)
}

export type ErrorSummaryProps<Msg> = SharedErrorSummaryProps<Msg> &
  Readonly<{ class?: string }>

export const errorSummary = <Msg>(
  props: ErrorSummaryProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  renderErrorSummary(
    props,
    {
      root: [
        h.Class(
          cn(
            'rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm',
            props.class,
          ),
        ),
      ],
      title: [h.Class('font-medium text-foreground')],
      list: [h.Class('mt-2 list-disc space-y-1 pl-5')],
      link: [h.Class('text-foreground underline underline-offset-4')],
    },
    h,
  )

export type FormItemProps = Slot &
  Readonly<{ id: string; isInvalid?: boolean; isDisabled?: boolean }>

export const formItem = <Msg>(
  props: FormItemProps,
  h: HtmlBuilder<Msg>,
): Html =>
  Field.field<Msg>(
    {
      ...(props.isInvalid === undefined ? {} : { isInvalid: props.isInvalid }),
      ...(props.isDisabled === undefined
        ? {}
        : { isDisabled: props.isDisabled }),
      ...(props.class === undefined ? {} : { class: props.class }),
      children: props.children,
    },
    h,
  )

export type FormLabelProps = Slot & Readonly<{ for: string }>

export const formLabel = <Msg>(
  props: FormLabelProps,
  h: HtmlBuilder<Msg>,
): Html =>
  Field.fieldLabel<Msg>(
    {
      for: props.for,
      ...(props.class === undefined ? {} : { class: props.class }),
      children: props.children,
    },
    h,
  )

export type FormDescriptionProps = Slot & Readonly<{ id?: string }>

export const formDescription = <Msg>(
  props: FormDescriptionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.p(
    [
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
      h.DataAttribute('slot', 'form-description'),
      h.Class(cn('text-sm text-muted-foreground', props.class)),
    ],
    [...props.children],
  )
}

export type FormMessageProps = Readonly<{
  id?: string
  class?: string
  message?: string
  errors?: ReadonlyArray<Field.FieldError>
}>

export const formMessage = <Msg>(
  props: FormMessageProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const content = Field.fieldError<Msg>(
    {
      ...(props.class === undefined ? {} : { class: props.class }),
      children: props.message === undefined ? [] : [props.message],
      ...(props.errors === undefined ? {} : { errors: props.errors }),
    },
    h,
  )

  return props.id === undefined
    ? content
    : h.div(
        [h.Id(props.id), h.DataAttribute('slot', 'form-message')],
        [content],
      )
}
