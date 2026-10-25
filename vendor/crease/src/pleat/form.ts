import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  type ErrorSummaryProps as SharedErrorSummaryProps,
  type FormBehaviorProps,
  renderErrorSummary,
  renderForm,
} from '@/lib/form'
import * as Field from './field'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { foundationTokens } from './foundations-tokens'
import { tokens } from './tokens'
export type { FormError, FormMethod } from '@/lib/form'
export { formControlIds } from '@/lib/form'
type Slot = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
  children: ReadonlyArray<Html | string>
}>
const styles = {
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  summary: Style.make({
    padding: '1rem',
    borderColor: foundationTokens.destructiveEdge40,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.destructiveFaint,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }).pipe(
    Style.when(When.pseudo(':where([data-slot="form"] > *:not(:last-child))'), {
      marginBlockEnd: '1.5rem',
    }),
  ),
  summaryTitle: Style.make({ color: tokens.foreground, fontWeight: 500 }),
  summaryList: Style.make({
    listStyleType: 'disc',
    paddingInlineStart: '1.25rem',
    marginTop: '0.5rem',
  }),
  summaryLink: Style.make({
    textDecoration: 'underline',
    color: tokens.foreground,
    textUnderlineOffset: '4px',
  }),
}
export type FormProps<Msg> = FormBehaviorProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle | undefined }>
export const form = <Msg>(p: FormProps<Msg>, h: HtmlBuilder<Msg>): Html =>
  renderForm(p, [h.Class(className(p.layoutStyle))], h)
export type ErrorSummaryProps<Msg> = SharedErrorSummaryProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle | undefined }>
export const errorSummary = <Msg>(
  p: ErrorSummaryProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  renderErrorSummary(
    p,
    {
      root: [h.Class(className(styles.summary, p.layoutStyle))],
      title: [h.Class(className(reset.text, styles.summaryTitle))],
      list: [h.Class(className(reset.list, styles.summaryList))],
      link: [h.Class(className(reset.link, styles.summaryLink))],
    },
    h,
  )
export type FormItemProps = Slot &
  Readonly<{ id: string; isInvalid?: boolean; isDisabled?: boolean }>
export const formItem = <Msg>(p: FormItemProps, h: HtmlBuilder<Msg>): Html =>
  Field.field({ ...p }, h)
export type FormLabelProps = Slot & Readonly<{ for: string }>
export const formLabel = <Msg>(p: FormLabelProps, h: HtmlBuilder<Msg>): Html =>
  Field.fieldLabel({ ...p }, h)
export type FormDescriptionProps = Slot & Readonly<{ id?: string }>
export const formDescription = <Msg>(
  p: FormDescriptionProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.p(
    [
      ...(p.id === undefined ? [] : [h.Id(p.id)]),
      h.DataAttribute('slot', 'form-description'),
      h.Class(className(reset.text, styles.description, p.layoutStyle)),
    ],
    [...p.children],
  )
export type FormMessageProps = Readonly<{
  id?: string
  layoutStyle?: ComponentLayoutStyle | undefined
  message?: string
  errors?: ReadonlyArray<Field.FieldError>
}>
export const formMessage = <Msg>(
  p: FormMessageProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const content = Field.fieldError(
    {
      layoutStyle: p.layoutStyle,
      children: p.message === undefined ? [] : [p.message],
      ...(p.errors === undefined ? {} : { errors: p.errors }),
    },
    h,
  )
  return p.id === undefined
    ? content
    : h.div([h.Id(p.id), h.DataAttribute('slot', 'form-message')], [content])
}
