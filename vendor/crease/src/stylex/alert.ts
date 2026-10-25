import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import {
  alertSemantics,
  type AlertAnnouncement,
  type AlertSeverity,
} from '@/lib/alert'
export * from '@/lib/alert'

export type AlertVariants = Readonly<{
  variant?: 'default' | 'destructive' | null
}>
type Slot = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>
const styles = stylex.create({
  root: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
    alignItems: 'start',
    backgroundColor: tokens.card,
    columnGap: '0.75rem',
    display: 'grid',
    fontSize: '0.875rem',
    gridTemplateColumns: '1rem 1fr',
    lineHeight: '1.25rem',
    position: 'relative',
    rowGap: '0.125rem',
    width: '100%',
  },
  default: { color: tokens.cardForeground },
  destructive: { color: tokens.destructive },
  info: { color: tokens.alertInfo },
  success: { color: tokens.alertSuccess },
  warning: { color: tokens.alertWarning },
  error: { color: tokens.destructive },
  icon: {
    gridColumnStart: '1',
    gridRowEnd: 'span 2',
    gridRowStart: 'span 2',
    height: '1rem',
    width: '1rem',
  },
  title: {
    fontWeight: 500,
    gridColumnStart: '2',
    letterSpacing: '-0.025em',
    minHeight: '1rem',
  },
  description: {
    gap: '0.25rem',
    color: tokens.mutedForeground,
    display: 'grid',
    fontSize: '0.875rem',
    gridColumnStart: '2',
    justifyItems: 'start',
    lineHeight: '1.25rem',
  },
})
export const alertVariants = (options: AlertVariants = {}): string =>
  className(styles.root, styles[options.variant ?? 'default'])
export type AlertProps = Slot &
  Readonly<{
    variant?: AlertVariants['variant']
    severity?: AlertSeverity
    announcement: AlertAnnouncement
  }>
export const alert = <Msg>(props: AlertProps, h: HtmlBuilder<Msg>): Html => {
  const severity =
    props.severity ?? (props.variant === 'destructive' ? 'error' : 'info')
  const semantics = alertSemantics(props.announcement)
  return h.div(
    [
      h.DataAttribute('slot', 'alert'),
      h.DataAttribute('severity', severity),
      ...(semantics.role === undefined ? [] : [h.Role(semantics.role)]),
      ...(semantics.live === undefined ? [] : [h.AriaLive(semantics.live)]),
      h.Class(className(styles.root, styles[severity], props.layoutStyle)),
    ],
    [...props.children],
  )
}
export const alertIcon = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'alert-icon'),
      h.AriaHidden(true),
      h.Class(className(styles.icon, props.layoutStyle)),
    ],
    [...props.children],
  )
export const alertTitle = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'alert-title'),
      h.Class(className(styles.title, props.layoutStyle)),
    ],
    [...props.children],
  )
export const alertDescription = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'alert-description'),
      h.Class(className(styles.description, props.layoutStyle)),
    ],
    [...props.children],
  )
