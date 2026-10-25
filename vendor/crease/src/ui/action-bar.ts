/* Ported from diceui ActionBar (diceui.com/docs/components/base/action-bar):
   a floating toolbar for bulk actions on a selection — DOM and styling kept
   1:1 with the reference. Roving-tabindex arrow navigation inside the group
   reuses lib/toolbar's mount; Escape dismissal reuses lib/action-bar's. */

import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '@/lib/action-bar'
import { escapeActionBarMount } from '@/lib/action-bar'
import type { ActionBarAlign, ActionBarSide } from '@/lib/action-bar'
import type { Message as ToolbarMessage } from '@/lib/toolbar'
import { focusToolbarItemsMount } from '@/lib/toolbar'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/ui/button'

export type { ActionBarAlign, ActionBarSide }

export type ActionBarProps<Msg> = Readonly<{
  open: boolean
  side?: ActionBarSide
  align?: ActionBarAlign
  alignOffset?: number
  sideOffset?: number
  /** Lifts mount messages (Escape listener + roving focus install). */
  toParentMessage?: (message: Message | ToolbarMessage) => Msg
  children: ReadonlyArray<Html | string>
  class?: string
}>

export const actionBar = <Msg>(
  props: ActionBarProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const side = props.side ?? 'bottom'
  const align = props.align ?? 'center'
  const sideOffset = props.sideOffset ?? 16
  const alignOffset = props.alignOffset ?? 0

  if (!props.open) return h.empty

  return h.div(
    [
      h.Role('toolbar'),
      h.AriaOrientation('horizontal'),
      h.DataAttribute('slot', 'action-bar'),
      h.DataAttribute('side', side),
      h.DataAttribute('align', align),
      h.DataAttribute('orientation', 'horizontal'),
      ...(props.toParentMessage === undefined
        ? []
        : [
            h.OnMount(escapeActionBarMount(props.toParentMessage)),
            h.OnMount(
              focusToolbarItemsMount(props.toParentMessage, 'horizontal'),
            ),
          ]),
      h.Class(
        cn(
          'fixed z-50 rounded-lg border bg-card shadow-lg outline-none',
          'crease-action-bar-in',
          'motion-reduce:animate-none',
          'flex flex-row items-center gap-2 px-2 py-1.5',
          props.class,
        ),
      ),
      h.Style({
        [side]: `${String(sideOffset)}px`,
        ...(align === 'center' ? { left: '50%', translate: '-50% 0' } : {}),
        ...(align === 'start' ? { left: `${String(alignOffset)}px` } : {}),
        ...(align === 'end' ? { right: `${String(alignOffset)}px` } : {}),
      }),
    ],
    [...props.children],
  )
}

export const actionBarSelection = <Msg>(
  props: Readonly<{
    children: ReadonlyArray<Html | string>
    class?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'action-bar-selection'),
      h.Class(
        cn(
          'flex items-center gap-1 rounded-sm border px-2 py-1 text-sm font-medium tabular-nums',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )

export const actionBarGroup = <Msg>(
  props: Readonly<{
    children: ReadonlyArray<Html | string>
    class?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'action-bar-group'),
      h.DataAttribute('orientation', 'horizontal'),
      h.Class(cn('flex items-center gap-2 outline-none', props.class)),
    ],
    [...props.children],
  )

export const actionBarItem = <Msg>(
  props: Readonly<{
    onSelect?: Msg
    variant?: 'default' | 'destructive'
    isDisabled?: boolean
    children: ReadonlyArray<Html | string>
    class?: string
    ariaLabel?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.DataAttribute('slot', 'action-bar-item'),
      ...(props.isDisabled === true ? [h.Attribute('disabled', '')] : []),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.onSelect === undefined ? [] : [h.OnClick(props.onSelect)]),
      h.Class(
        cn(
          buttonVariants({ variant: 'secondary' }),
          props.variant === 'destructive' &&
            'text-destructive hover:bg-destructive/10 hover:text-destructive',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )

export const actionBarClose = <Msg>(
  props: Readonly<{
    onClose?: Msg
    children?: ReadonlyArray<Html | string>
    class?: string
    ariaLabel?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.DataAttribute('slot', 'action-bar-close'),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.onClose === undefined ? [] : [h.OnClick(props.onClose)]),
      h.Class(
        cn(
          "rounded-xs opacity-70 outline-none hover:opacity-100 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
          props.class,
        ),
      ),
    ],
    props.children === undefined ? [] : [...props.children],
  )

export const actionBarSeparator = <Msg>(
  props: Readonly<{
    class?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Role('separator'),
      h.AriaOrientation('horizontal'),
      h.AriaHidden(true),
      h.DataAttribute('slot', 'action-bar-separator'),
      h.Class(
        cn(
          'h-6 w-px bg-border in-data-[slot=action-bar-selection]:ml-0.5 in-data-[slot=action-bar-selection]:h-4 in-data-[slot=action-bar-selection]:w-px',
          props.class,
        ),
      ),
    ],
    [],
  )
