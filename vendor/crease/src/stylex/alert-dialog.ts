import { reset } from '@/stylex/reset'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Dialog as DialogPrimitive } from '@foldkit/ui'

import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { buttonVisualStyles } from './button'
import { overlayStyles } from './overlay-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'
import {
  type Message,
  type Model,
  Message as AlertDialogMessages,
} from '@/lib/alert-dialog'
export * from '@/lib/alert-dialog'

const styles = stylex.create({
  media: {
    backgroundColor: tokens.muted,
    marginBottom: '0.5rem',
  },
  defaultMedia: {
    gridRow: {
      default: 'auto',
      '@media (min-width: 640px)': 'span 2',
    },
  },
  header: {
    gap: '0.375rem',
    alignItems: 'center',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    justifyItems: 'center',
    textAlign: 'center',
  },
  headerWithMedia: {
    columnGap: '1.5rem',
    gridTemplateRows: 'auto auto 1fr',
  },
  defaultHeader: {
    alignItems: {
      default: 'center',
      '@media (min-width: 640px)': 'start',
    },
    justifyItems: {
      default: 'center',
      '@media (min-width: 640px)': 'start',
    },
    textAlign: {
      default: 'center',
      '@media (min-width: 640px)': 'left',
    },
  },
  defaultHeaderWithMedia: {
    gridTemplateRows: {
      default: 'auto auto 1fr',
      '@media (min-width: 640px)': 'auto 1fr',
    },
  },
  title: {
    lineHeight: '1.75rem',
  },
  defaultTitleWithMedia: {
    gridColumnStart: {
      default: 'auto',
      '@media (min-width: 640px)': '2',
    },
  },
  smallFooter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  mediaDestructive: {
    backgroundColor: tokens.softDestructiveSurface,
    color: tokens.destructive,
  },
  content: {
    padding: '1.5rem',
    gap: '1rem',
    display: 'grid',
    maxWidth: {
      default: 'calc(100% - 2rem)',
      '@media (min-width: 640px)': '32rem',
    },
  },
  smallContent: {
    maxWidth: '20rem',
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* Ported from shadcn/ui alert-dialog.tsx on top of the foldkit Dialog
   submodel. Positioning and animations use the native fullscreen <dialog>
   wrapper and foldkit's data-closed transition phase. Unlike a regular dialog,
   the overlay intentionally omits the primitive backdrop click handler so an
   alert dialog can only be dismissed by an explicit action or Escape. */

const DIALOG_CLASS = overlayStyles.dialog

const OVERLAY_CLASS = overlayStyles.overlay

const CONTENT_CLASS = styles.content

const HEADER_CLASS = overlayStyles.header

const FOOTER_CLASS = overlayStyles.footer

const TITLE_CLASS = overlayStyles.title

const DESCRIPTION_CLASS = overlayStyles.description

const MEDIA_CLASS = overlayStyles.media

export type AlertDialogSlots = Readonly<{
  closeButton: ReadonlyArray<ChildAttribute>
}>

export type AlertDialogProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  title: string
  description: string
  media?: ReadonlyArray<Html | string>
  mediaVariant?: 'muted' | 'destructive'
  actionLabel: string
  cancelLabel?: string
  pendingLabel?: string
  isPending?: boolean
  size?: 'default' | 'sm'
  actionVariant?: 'default' | 'destructive'
  actionLayoutStyle?: ComponentLayoutStyle
  cancelLayoutStyle?: ComponentLayoutStyle
  layoutStyle?: ComponentLayoutStyle
}>

export const alertDialog = <Msg>(
  props: AlertDialogProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'default'

  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: DialogPrimitive.view,
    viewInputs: {
      toView: ({
        dialog: dialogAttributes,
        panel,
        initialFocus,
        isVisible,
      }: DialogPrimitive.RenderInfo) => {
        const hd = h
        const transitionState = props.model.animation.transitionState
        const overlayAnimationAttributes =
          transitionState === 'EnterStart'
            ? [
                hd.DataAttribute('closed', ''),
                hd.DataAttribute('enter', ''),
                hd.DataAttribute('transition', ''),
              ]
            : transitionState === 'EnterAnimating'
              ? [
                  hd.DataAttribute('enter', ''),
                  hd.DataAttribute('transition', ''),
                ]
              : transitionState === 'LeaveStart'
                ? [
                    hd.DataAttribute('leave', ''),
                    hd.DataAttribute('transition', ''),
                  ]
                : transitionState === 'LeaveAnimating'
                  ? [
                      hd.DataAttribute('closed', ''),
                      hd.DataAttribute('leave', ''),
                      hd.DataAttribute('transition', ''),
                    ]
                  : []

        return hd.dialog(
          [
            ...dialogAttributes,
            hd.DataAttribute('slot', 'alert-dialog'),
            hd.Class(className(DIALOG_CLASS)),
          ],
          isVisible
            ? [
                hd.div(
                  [
                    hd.Style({ minHeight: '100vh' }),
                    ...overlayAnimationAttributes,
                    hd.DataAttribute('slot', 'alert-dialog-overlay'),
                    hd.Class(className(OVERLAY_CLASS)),
                  ],
                  [],
                ),
                hd.div(
                  [
                    ...panel,
                    hd.Role('alertdialog'),
                    hd.DataAttribute('slot', 'alert-dialog-content'),
                    hd.DataAttribute('size', size),
                    hd.Class(
                      cn(
                        overlayStyles.panel,
                        CONTENT_CLASS,
                        overlayStyles.modal,
                        size === 'sm' && styles.smallContent,
                        props.layoutStyle,
                      ),
                    ),
                  ],
                  [
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'alert-dialog-header'),
                        hd.Class(
                          cn(
                            HEADER_CLASS,
                            styles.header,
                            props.media !== undefined && styles.headerWithMedia,
                            size === 'default' && styles.defaultHeader,
                            size === 'default' &&
                              props.media !== undefined &&
                              styles.defaultHeaderWithMedia,
                          ),
                        ),
                      ],
                      [
                        ...(props.media === undefined
                          ? []
                          : [
                              hd.div(
                                [
                                  hd.DataAttribute(
                                    'slot',
                                    'alert-dialog-media',
                                  ),
                                  hd.Class(
                                    cn(
                                      MEDIA_CLASS,
                                      styles.media,
                                      size === 'default' && styles.defaultMedia,
                                      props.mediaVariant === 'destructive' &&
                                        styles.mediaDestructive,
                                    ),
                                  ),
                                ],
                                [...props.media],
                              ),
                            ]),
                        hd.h2(
                          [
                            hd.Id(DialogPrimitive.titleId(props.model)),
                            hd.DataAttribute('slot', 'alert-dialog-title'),
                            hd.Class(
                              cn(
                                reset.text,
                                TITLE_CLASS,
                                styles.title,
                                size === 'default' &&
                                  props.media !== undefined &&
                                  styles.defaultTitleWithMedia,
                              ),
                            ),
                          ],
                          [props.title],
                        ),
                        hd.p(
                          [
                            hd.Id(DialogPrimitive.descriptionId(props.model)),
                            hd.DataAttribute(
                              'slot',
                              'alert-dialog-description',
                            ),
                            hd.Class(className(reset.text, DESCRIPTION_CLASS)),
                          ],
                          [props.description],
                        ),
                      ],
                    ),
                    hd.div(
                      [
                        hd.DataAttribute('slot', 'alert-dialog-footer'),
                        hd.Class(
                          cn(FOOTER_CLASS, size === 'sm' && styles.smallFooter),
                        ),
                      ],
                      [
                        hd.button(
                          [
                            ...initialFocus,
                            hd.OnClick(
                              props.toParentMessage(
                                AlertDialogMessages.RequestedAlertDialogCancel(),
                              ),
                            ),
                            hd.Type('button'),
                            hd.Disabled(props.isPending ?? false),
                            hd.DataAttribute('slot', 'alert-dialog-cancel'),
                            hd.Class(
                              cn(
                                ...buttonVisualStyles({ variant: 'outline' }),
                                props.cancelLayoutStyle,
                              ),
                            ),
                          ],
                          [props.cancelLabel ?? 'Cancel'],
                        ),
                        hd.button(
                          [
                            hd.OnClick(
                              props.toParentMessage(
                                AlertDialogMessages.RequestedAlertDialogConfirm(),
                              ),
                            ),
                            hd.Type('button'),
                            hd.Disabled(props.isPending ?? false),
                            hd.AriaBusy(props.isPending ?? false),
                            hd.DataAttribute('slot', 'alert-dialog-action'),
                            hd.Class(
                              cn(
                                ...buttonVisualStyles({
                                  variant: props.actionVariant ?? 'default',
                                }),
                                props.actionLayoutStyle,
                              ),
                            ),
                          ],
                          [
                            props.isPending === true
                              ? (props.pendingLabel ?? props.actionLabel)
                              : props.actionLabel,
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : [],
        )
      },
    },
    toParentMessage: message =>
      props.toParentMessage(
        AlertDialogMessages.GotAlertDialogPrimitiveMessage({ message }),
      ),
  })
}

/*
Minimal wiring:
const model = init({ id: 'delete-alert', isAnimated: true })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
alertDialog({
  model,
  toParentMessage: message => GotAlertDialogMessage({ message }),
  title: 'Are you absolutely sure?',
  description: 'This action cannot be undone.',
  actionLabel: 'Continue',
})
*/
