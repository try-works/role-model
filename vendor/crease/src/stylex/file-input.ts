import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx FileInput (packages/core/src/FileInput) —
   examples and visual spec adapted to Crease UI tokens.

   PORT-NOTE: astryx duration-fast (130ms) maps to interactionTokens.motionFast
   (150ms); accent/accent-muted map to tokens.ring + color-mix over Crease
   tokens. */

import * as stylex from '@stylexjs/stylex'
import { Option } from 'effect'
import { FileDrop } from '@foldkit/ui'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import {
  renderAttachedStatus,
  renderDetachedStatus,
  statusButtonLabel,
  statusIconName,
  type FieldStatusVariant,
  type InputStatus,
} from '@/lib/input-status'
import { Message, type Model } from '@/lib/file-input'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

export {
  formatFileSize,
  init,
  Model,
  Message,
  OutMessage,
  update,
  validateFiles,
} from '@/lib/file-input'
export type { FileInputMode } from '@/lib/file-input'
export type { InputStatus } from '@/lib/input-status'

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
})

const styles = stylex.create({
  field: {
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  labelDisabled: {
    opacity: 0.5,
  },
  srOnly: {
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  labelIndicator: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  },
  statusWrapper: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 0,
  },
  container: {
    borderRadius: foundationTokens.radiusMd,
    backgroundColor: tokens.background,
    cursor: {
      default: interactionTokens.cursorAction,
      ':is(:disabled,[aria-disabled="true"],[data-disabled])':
        interactionTokens.cursorDefault,
    },
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'border-color, box-shadow, background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    zIndex: 1,
    width: '100%',
  },
  dropzone: {
    borderColor: {
      default: tokens.input,
      ':focus-within': tokens.ring,
      ':is([data-drag-over])': tokens.ring,
    },
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '1.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    boxShadow: {
      default: tokens.shadowNone,
      ':hover:not(:focus-within):not([data-drag-over])': `inset 0 0 0 2px color-mix(in srgb, ${tokens.ring} 20%, transparent)`,
    },
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  dropzoneActive: {
    backgroundColor: `color-mix(in oklab, ${tokens.primary} 10%, transparent)`,
  },
  compact: {
    borderColor: {
      default: tokens.input,
      ':focus-within': tokens.ring,
    },
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    boxShadow: {
      default: tokens.shadowNone,
      ':hover:not(:focus-within)': `inset 0 0 0 2px color-mix(in srgb, ${tokens.ring} 20%, transparent)`,
    },
    display: 'flex',
    height: '2rem',
  },
  containerDisabled: {
    borderColor: tokens.input,
    boxShadow: tokens.shadowNone,
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
  },
  borderError: {
    borderColor: {
      default: tokens.destructive,
      ':focus-within': tokens.destructive,
      ':is([data-drag-over])': tokens.destructive,
    },
  },
  borderWarning: {
    borderColor: {
      default: tokens.alertWarning,
      ':focus-within': tokens.alertWarning,
      ':is([data-drag-over])': tokens.alertWarning,
    },
  },
  borderSuccess: {
    borderColor: {
      default: tokens.alertSuccess,
      ':focus-within': tokens.alertSuccess,
      ':is([data-drag-over])': tokens.alertSuccess,
    },
  },
  triggerWrapper: {
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  namesDropzone: {
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    textAlign: 'center',
  },
  namesCompact: {
    overflow: 'hidden',
    color: tokens.foreground,
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  placeholderText: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  placeholderCompact: {
    overflow: 'hidden',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  iconMd: {
    color: tokens.mutedForeground,
    height: '1.25rem',
    width: '1.25rem',
  },
  iconSm: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    height: '1rem',
    width: '1rem',
  },
  iconXs: {
    height: '0.75rem',
    width: '0.75rem',
  },
  spinner: {
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: spin,
    animationTimingFunction: interactionTokens.easingLinear,
    color: tokens.mutedForeground,
  },
  statusIconButton: {
    alignItems: 'center',
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    flexShrink: 0,
  },
  statusIconError: {
    color: tokens.destructive,
  },
  statusIconWarning: {
    color: tokens.alertWarning,
  },
  statusIconSuccess: {
    color: tokens.alertSuccess,
  },
  statusIconMd: {
    height: '1rem',
    width: '1rem',
  },
  clearButton: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.muted,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1.25rem',
    width: '1.25rem',
  },
  statusDetached: {
    padding: '0.5rem',
    borderRadius: foundationTokens.radiusLg,
    gap: '0.25rem',
    alignItems: 'flex-start',
    display: 'flex',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    marginBlockStart: '0.25rem',
  },
  statusAttached: {
    paddingInline: '0.5rem',
    borderEndEndRadius: foundationTokens.radiusMd,
    borderEndStartRadius: foundationTokens.radiusMd,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    marginBlockStart: '-1rem',
    paddingBlockEnd: '0.5rem',
    paddingBlockStart: '1.5rem',
    pointerEvents: 'none',
  },
  statusError: {
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
    color: tokens.destructive,
  },
  statusWarning: {
    backgroundColor: `color-mix(in oklab, ${tokens.alertWarning} 15%, transparent)`,
    color: tokens.alertWarning,
  },
  statusSuccess: {
    backgroundColor: `color-mix(in oklab, ${tokens.alertSuccess} 15%, transparent)`,
    color: tokens.alertSuccess,
  },
  statusText: {
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
  },
  statusIconRow: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: '1.25rem',
  },
})

export type FileInputProps<Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
  value?: ReadonlyArray<File>
  isLabelHidden?: boolean
  description?: Html | string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  mode?: 'dropzone' | 'input'
  placeholder?: string
  dropHint?: string
  status?: InputStatus
  statusVariant?: FieldStatusVariant
  name?: string
  'aria-label'?: string
  layoutStyle?: ComponentLayoutStyle
}>

export type FileInputViewInputs = Omit<
  FileInputProps<never>,
  'model' | 'toParentMessage'
>

const ids = (id: string) => ({
  label: `${id}-label`,
  description: `${id}-description`,
  status: `${id}-status`,
  required: `${id}-required`,
})

const view = defineView<Model, Message, FileInputViewInputs>(
  (model, props, h) => {
    const fieldIds = ids(props.id)
    const mode = props.mode ?? 'input'
    const isDropzone = mode === 'dropzone'
    const files = props.value ?? []
    const hasFiles = files.length > 0
    const fileNames = hasFiles ? files.map(file => file.name).join(', ') : null
    const status =
      props.status ??
      (Option.isSome(model.validationError)
        ? {
            type: 'error' as const,
            message: Option.getOrThrow(model.validationError),
          }
        : undefined)
    const labelText = typeof props.label === 'string' ? props.label : 'file'
    const conveysRequired =
      props.isRequired === true && props.isOptional !== true

    const describedBy =
      [
        props.description === undefined ? null : fieldIds.description,
        status?.message !== undefined && props.statusVariant !== 'tooltip'
          ? fieldIds.status
          : null,
        conveysRequired ? fieldIds.required : null,
      ]
        .filter(Boolean)
        .join(' ') || undefined

    const fieldLabel = h.label(
      [
        h.For(`${model.fileDrop.id}`),
        h.Id(fieldIds.label),
        h.DataAttribute('slot', 'file-input-label'),
        h.Class(
          className(
            styles.label,
            props.isLabelHidden === true && styles.srOnly,
            props.isDisabled === true && styles.labelDisabled,
          ),
        ),
      ],
      [
        props.label,
        ...(props.isOptional === true
          ? [
              h.span(
                [
                  h.Attribute('aria-hidden', 'true'),
                  h.Class(className(styles.labelIndicator)),
                ],
                [' ∙ Optional'],
              ),
            ]
          : []),
        ...(conveysRequired
          ? [
              h.span(
                [
                  h.Attribute('aria-hidden', 'true'),
                  h.Class(className(styles.labelIndicator)),
                ],
                [' ∙ Required'],
              ),
            ]
          : []),
      ],
    )

    const statusIcon =
      status !== undefined && props.statusVariant === 'tooltip'
        ? h.button(
            [
              h.Type('button'),
              h.AriaLabel(statusButtonLabel(status.type)),
              h.Title(status.message ?? ''),
              h.OnClick(Message.Noop(), {
                defaultAction: 'Prevent',
                propagation: 'Stop',
              }),
              h.DataAttribute('slot', 'file-input-status-icon'),
              h.Class(className(reset.button, styles.statusIconButton)),
            ],
            [
              Icon.icon(
                statusIconName(status.type),
                {
                  class: className(
                    styles.statusIconMd,
                    status.type === 'error' && styles.statusIconError,
                    status.type === 'warning' && styles.statusIconWarning,
                    status.type === 'success' && styles.statusIconSuccess,
                  ),
                  ariaLabel: statusButtonLabel(status.type),
                },
                h,
              ),
            ],
          )
        : undefined

    const trigger = h.span(
      [
        h.Class(className(styles.triggerWrapper)),
        h.DataAttribute('slot', 'file-input-trigger-wrapper'),
      ],
      [
        h.button(
          [
            h.Class(className(reset.button)),
            h.Type('button'),
            h.Tabindex(props.isDisabled === true ? -1 : 0),
            h.AriaLabel(
              hasFiles && fileNames !== null
                ? `${labelText}, ${fileNames}`
                : labelText,
            ),
            h.AriaBusy(props.isLoading === true),
            h.AriaInvalid(status?.type === 'error'),
            ...(describedBy === undefined
              ? []
              : [h.AriaDescribedBy(describedBy)]),
            h.OnClick(Message.TriggerClicked(), { propagation: 'Stop' }),
          ],
          [],
        ),
      ],
    )

    const clearButton =
      hasFiles && props.isDisabled !== true && props.isLoading !== true
        ? h.button(
            [
              h.Type('button'),
              h.Tabindex(-1),
              h.AriaLabel(`Clear ${labelText}`),
              h.OnClick(Message.ClearRequested(), {
                defaultAction: 'Prevent',
                propagation: 'Stop',
              }),
              h.DataAttribute('slot', 'file-input-clear'),
              h.Class(className(reset.button, styles.clearButton)),
            ],
            [Icon.x({ class: className(styles.iconXs) }, h)],
          )
        : undefined

    const dropzoneContent =
      props.isLoading === true
        ? [
            Icon.loaderCircle(
              {
                class: className(styles.spinner, styles.iconMd),
              },
              h,
            ),
          ]
        : hasFiles
          ? [
              h.div(
                [
                  h.DataAttribute('slot', 'file-input-names'),
                  h.Class(className(styles.namesDropzone)),
                ],
                [fileNames ?? ''],
              ),
            ]
          : [
              Icon.arrowUp({ class: className(styles.iconMd) }, h),
              h.span(
                [
                  h.DataAttribute('slot', 'file-input-placeholder'),
                  h.Class(className(styles.placeholderText)),
                ],
                [
                  model.fileDrop.isDragOver
                    ? (props.dropHint ?? 'Drop files here')
                    : (props.placeholder ??
                      (model.isMultiple ? 'Choose files' : 'Choose file')),
                ],
              ),
            ]

    const compactContent =
      props.isLoading === true
        ? [
            h.span(
              [
                h.DataAttribute('slot', 'file-input-names'),
                h.Class(
                  className(
                    hasFiles ? styles.namesCompact : styles.placeholderText,
                    styles.placeholderCompact,
                  ),
                ),
              ],
              [fileNames ?? props.placeholder ?? 'Choose file'],
            ),
            Icon.loaderCircle(
              {
                class: className(styles.spinner, styles.iconSm),
              },
              h,
            ),
          ]
        : [
            Icon.arrowUp({ class: className(styles.iconSm) }, h),
            h.span(
              [
                h.DataAttribute('slot', 'file-input-placeholder'),
                h.Class(
                  className(
                    hasFiles ? styles.namesCompact : styles.placeholderText,
                    styles.placeholderCompact,
                  ),
                ),
              ],
              [
                fileNames ??
                  props.placeholder ??
                  (model.isMultiple ? 'Choose files' : 'Choose file'),
              ],
            ),
          ]

    const toView = (attributes: FileDrop.FileDropAttributes): Html =>
      h.div(
        [
          ...attributes.root,
          h.DataAttribute('slot', 'file-input-dropzone'),
          h.DataAttribute('mode', mode),
          h.OnClick(Message.TriggerClicked()),
          h.Class(
            className(
              styles.container,
              isDropzone ? styles.dropzone : styles.compact,
              props.isDisabled === true
                ? styles.containerDisabled
                : status !== undefined &&
                    (status.type === 'error'
                      ? styles.borderError
                      : status.type === 'warning'
                        ? styles.borderWarning
                        : styles.borderSuccess),
              isDropzone && model.fileDrop.isDragOver && styles.dropzoneActive,
            ),
          ),
        ],
        [
          trigger,
          h.input([
            ...attributes.input,
            h.Class(className(reset.input, styles.srOnly)),
            h.AriaHidden(true),
            h.Tabindex(-1),
            /* The TriggerClicked command activates this input with
               input.click() — stop that synthetic click from bubbling back
               to the dropzone's own OnClick, which would dispatch
               TriggerClicked again in a loop. */
            h.OnClick(Message.Noop(), { propagation: 'Stop' }),
            ...(props.name === undefined ? [] : [h.Name(props.name)]),
          ]),
          ...(isDropzone ? dropzoneContent : compactContent),
          ...(statusIcon === undefined ? [] : [statusIcon]),
          ...(clearButton === undefined ? [] : [clearButton]),
        ],
      )

    const dropzone = h.submodel({
      slotId: `${model.id}-file-drop`,
      model: model.fileDrop,
      view: FileDrop.view,
      viewInputs: {
        toView,
        ...(Option.isSome(model.accept)
          ? {
              accept: Option.getOrThrow(model.accept)
                .split(',')
                .map(entry => entry.trim()),
            }
          : {}),
        multiple: model.isMultiple,
        isDisabled: props.isDisabled === true,
      },
      toParentMessage: (message: FileDrop.Message) =>
        Message.GotFileDropMessage({ message }),
    })

    const statusLayer =
      status?.message === undefined || props.statusVariant === 'tooltip'
        ? []
        : [
            props.statusVariant === 'detached'
              ? renderDetachedStatus(
                  status,
                  {
                    root: type => [
                      h.Class(
                        className(
                          styles.statusDetached,
                          type === 'error' && styles.statusError,
                          type === 'warning' && styles.statusWarning,
                          type === 'success' && styles.statusSuccess,
                        ),
                      ),
                    ],
                    icon: [h.Class(className(styles.statusIconRow))],
                    text: [h.Class(className(styles.statusText))],
                  },
                  Icon.icon(
                    statusIconName(status.type),
                    { class: className(styles.iconXs) },
                    h,
                  ),
                  h,
                  fieldIds.status,
                )
              : renderAttachedStatus(
                  status,
                  {
                    root: type => [
                      h.Class(
                        className(
                          styles.statusAttached,
                          type === 'error' && styles.statusError,
                          type === 'warning' && styles.statusWarning,
                          type === 'success' && styles.statusSuccess,
                        ),
                      ),
                    ],
                    icon: [],
                    text: [h.Class(className(styles.statusText))],
                  },
                  h,
                  fieldIds.status,
                ),
          ]

    return h.div(
      [
        h.DataAttribute('slot', 'file-input'),
        h.Class(className(styles.field, props.layoutStyle)),
      ],
      [
        fieldLabel,
        ...(props.description === undefined
          ? []
          : [
              h.p(
                [
                  h.Id(fieldIds.description),
                  h.DataAttribute('slot', 'file-input-description'),
                  h.Class(className(reset.text, styles.description)),
                ],
                [props.description],
              ),
            ]),
        h.div(
          [
            h.DataAttribute('slot', 'file-input-status-wrapper'),
            h.Class(className(styles.statusWrapper)),
          ],
          [dropzone, ...statusLayer],
        ),
        ...(conveysRequired
          ? [
              h.span(
                [h.Id(fieldIds.required), h.Class(className(styles.srOnly))],
                ['Required'],
              ),
            ]
          : []),
      ],
    )
  },
)

export const fileInput = <Msg>(
  props: FileInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view,
    viewInputs: { ...props, layoutStyle: props.layoutStyle },
    toParentMessage: props.toParentMessage,
  })
