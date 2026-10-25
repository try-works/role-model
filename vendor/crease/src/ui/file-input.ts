/* Ported from Meta Astryx FileInput (packages/core/src/FileInput) —
   examples and visual spec adapted to Crease UI tokens. */

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
import { cn } from '@/lib/utils'

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

export type FileInputProps<Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
  /** The accepted files owned by the parent. */
  value?: ReadonlyArray<File>
  isLabelHidden?: boolean
  description?: Html | string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  /** 'dropzone' (dashed, drag-and-drop) or compact 'input' row. */
  mode?: 'dropzone' | 'input'
  placeholder?: string
  dropHint?: string
  status?: InputStatus
  statusVariant?: FieldStatusVariant
  name?: string
  'aria-label'?: string
  class?: string
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
          cn(
            'text-sm leading-5 font-medium text-muted-foreground',
            props.isLabelHidden === true && 'sr-only',
            props.isDisabled === true && 'opacity-50',
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
                  h.Class('text-xs font-normal'),
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
                  h.Class('text-xs font-normal'),
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
              h.Class('flex shrink-0 items-center'),
            ],
            [
              Icon.icon(
                statusIconName(status.type),
                {
                  class: cn(
                    'size-4',
                    status.type === 'error' && 'text-destructive',
                    status.type === 'warning' && 'text-warning',
                    status.type === 'success' && 'text-success',
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
        h.Class('sr-only'),
        h.DataAttribute('slot', 'file-input-trigger-wrapper'),
      ],
      [
        h.button(
          [
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
              h.Class(
                'flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              ),
            ],
            [Icon.x({ class: 'size-3' }, h)],
          )
        : undefined

    const dropzoneContent =
      props.isLoading === true
        ? [Icon.loaderCircle({ class: 'size-5 animate-spin' }, h)]
        : hasFiles
          ? [
              h.div(
                [
                  h.DataAttribute('slot', 'file-input-names'),
                  h.Class(
                    'text-sm leading-5 text-foreground font-medium text-center',
                  ),
                ],
                [fileNames ?? ''],
              ),
            ]
          : [
              Icon.arrowUp({ class: 'size-5 text-muted-foreground' }, h),
              h.span(
                [
                  h.DataAttribute('slot', 'file-input-placeholder'),
                  h.Class('text-sm leading-5 text-muted-foreground'),
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
                  cn(
                    'flex-1 truncate text-sm leading-5',
                    hasFiles
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                  ),
                ),
              ],
              [fileNames ?? props.placeholder ?? 'Choose file'],
            ),
            Icon.loaderCircle({ class: 'size-4 animate-spin' }, h),
          ]
        : [
            Icon.arrowUp({ class: 'size-4 shrink-0 text-muted-foreground' }, h),
            h.span(
              [
                h.DataAttribute('slot', 'file-input-placeholder'),
                h.Class(
                  cn(
                    'min-w-0 flex-1 truncate text-sm leading-5',
                    hasFiles
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
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
            cn(
              'relative z-[1] w-full cursor-pointer rounded-md bg-background transition-[border-color,box-shadow,background-color] duration-150',
              isDropzone
                ? cn(
                    'flex flex-col items-center justify-center gap-2 border border-dashed px-4 py-6',
                    'data-[drag-over]:border-ring data-[drag-over]:bg-primary/10',
                    'focus-within:border-ring hover:not(:focus-within):not([data-drag-over]):shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_20%,transparent)]',
                  )
                : cn(
                    'flex h-8 items-center gap-2 border border-solid px-2 py-1',
                    'focus-within:border-ring hover:not(:focus-within):shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_20%,transparent)]',
                  ),
              props.isDisabled === true
                ? 'cursor-default border-input opacity-50 shadow-none'
                : status?.type === 'error'
                  ? 'border-destructive'
                  : status?.type === 'warning'
                    ? 'border-warning'
                    : status?.type === 'success'
                      ? 'border-success'
                      : 'border-input',
            ),
          ),
        ],
        [
          trigger,
          h.input([
            ...attributes.input,
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
                        cn(
                          'mt-1 flex items-start gap-1 rounded-lg p-2 text-xs leading-5',
                          type === 'error' &&
                            'bg-destructive/10 text-destructive',
                          type === 'warning' && 'bg-warning/15 text-warning',
                          type === 'success' && 'bg-success/15 text-success',
                        ),
                      ),
                    ],
                    icon: [h.Class('flex h-5 shrink-0 items-center')],
                    text: [h.Class('flex-1')],
                  },
                  Icon.icon(
                    statusIconName(status.type),
                    { class: 'size-3' },
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
                        cn(
                          'pointer-events-none -mt-4 rounded-b-md px-2 pb-2 pt-6 text-xs leading-5',
                          type === 'error' &&
                            'bg-destructive/10 text-destructive',
                          type === 'warning' && 'bg-warning/15 text-warning',
                          type === 'success' && 'bg-success/15 text-success',
                        ),
                      ),
                    ],
                    icon: [],
                    text: [h.Class('flex-1')],
                  },
                  h,
                  fieldIds.status,
                ),
          ]

    return h.div(
      [
        h.DataAttribute('slot', 'file-input'),
        h.Class(cn('flex w-full flex-col gap-1', props.class)),
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
                  h.Class('text-xs leading-5 text-muted-foreground'),
                ],
                [props.description],
              ),
            ]),
        h.div(
          [
            h.DataAttribute('slot', 'file-input-status-wrapper'),
            h.Class('relative z-0 flex flex-col'),
          ],
          [dropzone, ...statusLayer],
        ),
        ...(conveysRequired
          ? [
              h.span(
                [h.Id(fieldIds.required), h.Class('sr-only')],
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
    viewInputs: props,
    toParentMessage: props.toParentMessage,
  })
