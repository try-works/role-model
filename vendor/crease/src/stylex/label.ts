import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

const styles = stylex.create({
  root: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  },
  disabled: { opacity: 0.5 },
})
export type LabelProps = Readonly<{
  for?: string
  id?: string
  isRequired?: boolean
  isDisabled?: boolean
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>
export const label = <Msg>(props: LabelProps, h: HtmlBuilder<Msg>): Html =>
  h.label(
    [
      h.DataAttribute('slot', 'label'),
      h.DataAttribute('required', String(props.isRequired ?? false)),
      h.DataAttribute('disabled', String(props.isDisabled ?? false)),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
      ...(props.for === undefined ? [] : [h.For(props.for)]),
      ...((props.isDisabled ?? false) ? [h.AriaDisabled(true)] : []),
      h.Class(
        className(
          styles.root,
          props.isDisabled && styles.disabled,
          props.layoutStyle,
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
