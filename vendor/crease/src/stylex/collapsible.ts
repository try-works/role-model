import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure as DisclosurePrimitive } from '@foldkit/ui'

import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { complexTokens } from './complex-tokens.stylex'
import { tokens } from './tokens.stylex'
import { sidebarScope } from './sidebar.markers.stylex'

const styles = stylex.create({
  content: { overflow: 'hidden' },
  root: { display: 'block' },
  trigger: { cursor: interactionTokens.cursorAction },
  /* TW triggerClass: sidebarMenuButtonVariants() — full menu-button look. */
  sidebarTrigger: {
    padding: '0.5rem',
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
      ':active': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: {
      default: '100%',
      [stylex.when.ancestor('[data-collapsible="icon"]', sidebarScope)]: '2rem',
    },
  },
  /* TW GROUP_LABEL_CLASS (sidebar-02): group-label styled collapsible trigger. */
  sidebarLabelTrigger: {
    borderRadius: tokens.controlRadius,
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': complexTokens.sidebarAccent,
    },
    color: {
      default: complexTokens.sidebarForeground,
      ':hover': complexTokens.sidebarAccentForeground,
    },
    display: 'flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'left',
    height: '2rem',
    /* TW GROUP_LABEL_CLASS is content-width ('flex h-8 shrink-0 ...' with
       no w-full); TW-15 calendar labels pass 'w-full' via layoutStyle. */
    width: 'fit-content',
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
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
  layoutStyle?: ComponentLayoutStyle
  triggerLayoutStyle?: ComponentLayoutStyle
  contentLayoutStyle?: ComponentLayoutStyle
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
