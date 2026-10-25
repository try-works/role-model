import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure as DisclosurePrimitive } from '@foldkit/ui'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { interactionTokens } from './interaction-tokens'
import { complexTokens } from './complex-tokens'
import { tokens } from './tokens'
import { sidebarScope } from './sidebar.markers'

const styles = {
  content: Style.make({ overflow: 'hidden' }),
  root: Style.make({ display: 'block' }),
  trigger: Style.make({ cursor: interactionTokens.cursorAction }),
  sidebarTrigger: Style.make({
    padding: '0.5rem',
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: '100%',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
    Style.when(When.active, { backgroundColor: complexTokens.sidebarAccent }),
    Style.when(When.within(sidebarScope, When.data('collapsible', 'icon')), {
      width: '2rem',
    }),
  ),
  sidebarLabelTrigger: Style.make({
    borderRadius: tokens.controlRadius,
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: complexTokens.sidebarForeground,
    display: 'flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    height: '2rem',
    width: 'fit-content',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: complexTokens.sidebarAccent,
      color: complexTokens.sidebarAccentForeground,
    }),
  ),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* shadcn/ui Collapsible is a thin composition over foldkit Disclosure.
   animatePanel keeps the content mounted and smoothly transitions its height. */

export type CollapsibleProps<Msg> = Readonly<{
  id: string
  isOpen: boolean
  onToggle: (isOpen: boolean) => Msg
  trigger: Html | string
  content: Html | string
  isDisabled?: boolean
  ariaLabel?: string
  variant?: 'default' | 'sidebar' | 'sidebarLabel'
  layoutStyle?: ComponentLayoutStyle | undefined
  triggerLayoutStyle?: ComponentLayoutStyle | undefined
  contentLayoutStyle?: ComponentLayoutStyle | undefined
}>

export const collapsible = <Msg>(
  props: CollapsibleProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return DisclosurePrimitive.view(
    {
      id: props.id,
      isOpen: props.isOpen,
      onToggle: props.onToggle,
      ...(props.isDisabled === undefined
        ? {}
        : { isDisabled: props.isDisabled }),
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      toView: ({ button, panel, animatePanel }) => {
        return h.div(
          [
            h.DataAttribute('slot', 'collapsible'),
            h.Class(cn(styles.root, props.layoutStyle)),
          ],
          [
            h.button(
              [
                ...button,
                h.Type('button'),
                h.DataAttribute('slot', 'collapsible-trigger'),
                h.Class(
                  cn(
                    reset.button,
                    styles.trigger,
                    props.variant === 'sidebar' && styles.sidebarTrigger,
                    props.variant === 'sidebarLabel' &&
                      styles.sidebarLabelTrigger,
                    props.triggerLayoutStyle,
                  ),
                ),
              ],
              [props.trigger],
            ),
            animatePanel(
              h.div(
                [
                  ...panel,
                  h.DataAttribute('slot', 'collapsible-content'),
                  h.Class(cn(styles.content, props.contentLayoutStyle)),
                ],
                [props.content],
              ),
            ),
          ],
        )
      },
    },
    h,
  )
}

/*
Minimal wiring:
const model = init({ id: 'details' })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
    const maybeToggle = Option.fromNullishOr(nextModelOp__.outMessage);
collapsible({
  model,
  toParentMessage: message => GotCollapsibleMessage({ message }),
  trigger: 'Show details',
  content: detailsView,
})
*/
