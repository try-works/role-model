import type { Html, HtmlBuilder } from 'foldkit/html'

import { Popover as PopoverPrimitive } from '@foldkit/ui'

import { themedAnchor, themedPopoverPanel } from '@/lib/overlay-boundary'

import { cn } from '@/lib/utils'

/* Ported from shadcn/ui popover.tsx on top of the foldkit Popover submodel.
   Radix keyframe animations are finite transitions driven by foldkit's
   data-closed phase. Pass isAnimated: true to init. */

export const Model = PopoverPrimitive.Model
export type Model = typeof Model.Type
export const Message = PopoverPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = PopoverPrimitive.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = PopoverPrimitive.init
export const update = PopoverPrimitive.update
export const open = PopoverPrimitive.open
export const close = PopoverPrimitive.close
export const RequestedOpen = PopoverPrimitive.Message.RequestedOpen
export const RequestedClose = PopoverPrimitive.Message.RequestedClose

const CONTENT_CLASS =
  'z-50 w-max max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 transition duration-200 ease-out motion-reduce:transition-none data-[closed]:opacity-0 data-[closed]:scale-95'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left'
export type PopoverAlign = 'start' | 'center' | 'end'

type Placement = NonNullable<PopoverPrimitive.AnchorConfig['placement']>

const PLACEMENTS: Readonly<
  Record<PopoverSide, Readonly<Record<PopoverAlign, Placement>>>
> = {
  top: { start: 'top-start', center: 'top', end: 'top-end' },
  right: { start: 'right-start', center: 'right', end: 'right-end' },
  bottom: { start: 'bottom-start', center: 'bottom', end: 'bottom-end' },
  left: { start: 'left-start', center: 'left', end: 'left-end' },
}

export type PopoverProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  trigger: Html | string
  triggerClass?: string
  content: Html | string
  align?: PopoverAlign
  side?: PopoverSide
  class?: string
  direction?: 'ltr' | 'rtl'
  focusSelector?: string
}>

export const popover = <Msg>(
  props: PopoverProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const placement = PLACEMENTS[props.side ?? 'bottom'][props.align ?? 'center']

  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: PopoverPrimitive.view,
    viewInputs: {
      // Portaled panels must keep the owning theme scope (e.g. a `.dark`
      // subtree), so the portal binds inherited variables at the detached root.
      anchor: themedAnchor({ placement, gap: 4 }),
      ...(props.focusSelector === undefined
        ? {}
        : { focusSelector: props.focusSelector }),
      toView: ({ button, panel, backdrop, isVisible }) => {
        const hp = h

        return hp.div(
          [hp.DataAttribute('slot', 'popover')],
          [
            hp.button(
              [
                ...button,
                hp.DataAttribute('slot', 'popover-trigger'),
                hp.AriaHasPopup('dialog'),
                ...(props.triggerClass === undefined
                  ? []
                  : [hp.Class(cn(props.triggerClass))]),
              ],
              [props.trigger],
            ),
            ...(isVisible
              ? [
                  hp.div(
                    [
                      ...backdrop,
                      hp.DataAttribute('slot', 'popover-backdrop'),
                      hp.Class(BACKDROP_CLASS),
                    ],
                    [],
                  ),
                  hp.div(
                    [
                      ...panel,
                      hp.OnMount(
                        themedPopoverPanel(
                          `${props.model.id}-button`,
                          { placement, gap: 4 },
                          props.toParentMessage,
                          props.focusSelector,
                          PopoverPrimitive.arrowId(props.model.id),
                        ),
                      ),
                      hp.DataAttribute('slot', 'popover-content'),
                      ...(props.direction === undefined
                        ? []
                        : [hp.Dir(props.direction)]),
                      hp.Class(cn(CONTENT_CLASS, props.class)),
                    ],
                    [props.content],
                  ),
                ]
              : []),
          ],
        )
      },
    },
    toParentMessage: props.toParentMessage,
  })
}

/*
Minimal wiring:
const model = init({ id: 'profile-popover', isAnimated: true })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
    const maybeVisibility = Option.fromNullishOr(nextModelOp__.outMessage);
popover({
  model,
  toParentMessage: message => GotPopoverMessage({ message }),
  trigger: 'Open profile',
  content: profileView,
  align: 'center',
  side: 'bottom',
})
*/
