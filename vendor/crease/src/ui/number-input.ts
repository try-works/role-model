/* Ported from Meta Astryx NumberInput (packages/core/src/NumberInput) —
   examples and visual spec adapted to Crease UI tokens.

   PORT-NOTE: astryx's `isWheelEnabled` scroll-stepping runs DOM-side —
   foldkit's `OnWheel` carries no delta, so the inline `onwheel` handler
   (focused input only) dispatches the ArrowUp/ArrowDown the keydown path
   already turns into Stepped. */

import { Option } from 'effect'
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
import {
  canStep,
  commitResolutionOf,
  formatEditableNumber,
  getSteppedValue,
  Message,
  parseLocaleNumber,
  resolveNumberInputCommit,
  type Model,
  type NumberInputCommit,
} from '@/lib/number-input'
import { cn } from '@/lib/utils'

export { init, Model, Message, OutMessage, update } from '@/lib/number-input'
export type { NumberInputSize } from '@/lib/number-input'
export type { InputStatus } from '@/lib/input-status'

const heightStyles = { sm: 'h-7', md: 'h-8', lg: 'h-9' } as const
/* astryx attaches the status box under the input, overlapped by half the
   control height (field-status-overlap = size / 2). */
const attachedOverlap = {
  sm: '-mt-3.5 pt-[22px]',
  md: '-mt-4 pt-6',
  lg: '-mt-[18px] pt-[26px]',
} as const

export type NumberInputProps<Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
  /** The committed value owned by the parent (`null`/`undefined` = empty). */
  value?: number | null
  isLabelHidden?: boolean
  description?: Html | string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  placeholder?: string
  units?: string
  min?: number
  max?: number
  step?: number
  isIntegerOnly?: boolean
  /** Formats the committed value when the input is not focused. */
  formatValue?: (value: number) => string
  hasClear?: boolean
  hasNumberSteppers?: boolean
  status?: InputStatus
  statusVariant?: FieldStatusVariant
  size?: 'sm' | 'md' | 'lg'
  name?: string
  autocomplete?: string
  isAutofocus?: boolean
  'aria-label'?: string
  class?: string
}>

/** Everything the submodel view needs except the model and the message lift —
    both already parameters of `h.submodel`'s config. */
export type NumberInputViewInputs = Omit<
  NumberInputProps<never>,
  'model' | 'toParentMessage'
>

const ids = (id: string) => ({
  input: `${id}-input`,
  label: `${id}-label`,
  description: `${id}-description`,
  status: `${id}-status`,
})

const commitResolution = (
  props: NumberInputViewInputs,
  model: Model,
): NumberInputCommit =>
  resolveNumberInputCommit(Option.getOrUndefined(model.pendingInput), {
    value: props.value ?? undefined,
    min: props.min,
    max: props.max,
    isIntegerOnly: props.isIntegerOnly,
    hasClear: props.hasClear,
  })

const displayValue = (props: NumberInputViewInputs, model: Model): string =>
  Option.match(model.pendingInput, {
    onSome: text => text,
    onNone: () => {
      if (props.value === undefined || props.value === null) return ''
      return model.isFocused
        ? formatEditableNumber(props.value)
        : (props.formatValue ?? formatEditableNumber)(props.value)
    },
  })

const pendingIsInvalid = (
  props: NumberInputViewInputs,
  model: Model,
): boolean =>
  Option.match(model.pendingInput, {
    onSome: text =>
      text.trim() !== '' &&
      (parseLocaleNumber(text) === null ||
        (props.isIntegerOnly === true &&
          !Number.isInteger(parseLocaleNumber(text) ?? NaN))),
    onNone: () => false,
  })

const inputText =
  'flex-1 min-w-0 border-0 bg-transparent p-0 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground'

const view = defineView<Model, Message, NumberInputViewInputs>(
  (model, props, h) => {
    const fieldIds = ids(props.id)
    const size = props.size ?? 'md'
    const isInvalid =
      props.status?.type === 'error' || pendingIsInvalid(props, model)
    const value = props.value ?? undefined
    const commit = commitResolution(props, model)
    const stepValue = commit.kind === 'commit' ? commit.value : value
    const stepper = (direction: 1 | -1) =>
      getSteppedValue(direction, {
        value: stepValue,
        step: props.step,
        min: props.min,
        max: props.max,
        isIntegerOnly: props.isIntegerOnly,
      })

    const describedBy =
      [
        props.description === undefined ? null : fieldIds.description,
        props.status?.message !== undefined && props.statusVariant !== 'tooltip'
          ? fieldIds.status
          : null,
      ]
        .filter(Boolean)
        .join(' ') || undefined

    const fieldLabel = h.label(
      [
        h.For(fieldIds.input),
        h.Id(fieldIds.label),
        h.DataAttribute('slot', 'number-input-label'),
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
        ...(props.isRequired === true && props.isOptional !== true
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

    const input = h.input([
      h.Id(fieldIds.input),
      h.Type('text'),
      h.Attribute('inputmode', 'decimal'),
      h.Attribute('autocomplete', props.autocomplete ?? 'off'),
      h.Attribute('spellcheck', 'false'),
      h.Value(displayValue(props, model)),
      ...(props.placeholder === undefined
        ? []
        : [h.Placeholder(props.placeholder)]),
      h.AriaLabelledBy(fieldIds.label),
      ...(props['aria-label'] === undefined
        ? []
        : [h.AriaLabel(props['aria-label'])]),
      ...(describedBy === undefined ? [] : [h.AriaDescribedBy(describedBy)]),
      h.AriaInvalid(isInvalid),
      h.AriaRequired(props.isRequired === true && props.isOptional !== true),
      h.Disabled(props.isDisabled === true),
      h.Readonly(props.isReadOnly === true),
      ...(props.name === undefined ? [] : [h.Name(props.name)]),
      ...(props.isAutofocus === true ? [h.Autofocus(true)] : []),
      h.DataAttribute('slot', 'number-input-input'),
      h.Class(cn(inputText, props.isDisabled === true && 'cursor-default')),
      h.OnFocus(Message.FocusGained()),
      h.OnBlur(
        Message.CommitDecided({ resolution: commitResolutionOf(commit) }),
      ),
      h.OnInput(text => Message.DraftEdited({ text })),
      ...(props.isDisabled === true || props.isReadOnly === true
        ? []
        : [
            // foldkit's OnWheel has no delta — dispatch the ArrowUp/ArrowDown
            // the keydown handler already maps to Stepped, focused input only.
            h.Attribute(
              'onwheel',
              "if(document.activeElement===this){event.preventDefault();this.dispatchEvent(new KeyboardEvent('keydown',{key:event.deltaY<0?'ArrowUp':'ArrowDown',cancelable:true}))}",
            ),
            h.OnKeyDownPreventDefault(key => {
              if (key === 'ArrowUp') {
                return canStep(1, {
                  value: stepValue,
                  min: props.min,
                  max: props.max,
                })
                  ? Option.some(Message.Stepped({ value: stepper(1) }))
                  : Option.none()
              }
              if (key === 'ArrowDown') {
                return canStep(-1, {
                  value: stepValue,
                  min: props.min,
                  max: props.max,
                })
                  ? Option.some(Message.Stepped({ value: stepper(-1) }))
                  : Option.none()
              }
              if (key === 'Enter') {
                return Option.some(
                  Message.CommitDecided({
                    resolution: commitResolutionOf(commit),
                  }),
                )
              }
              return Option.none()
            }),
          ]),
    ])

    const clearButton =
      props.hasClear === true &&
      props.value !== undefined &&
      props.value !== null &&
      props.isDisabled !== true &&
      props.isReadOnly !== true
        ? h.button(
            [
              h.Type('button'),
              h.Tabindex(-1),
              h.AriaLabel(
                `Clear ${typeof props.label === 'string' ? props.label : 'value'}`,
              ),
              h.OnClick(Message.ClearRequested(), {
                propagation: 'Stop',
                focusSelector: `#${fieldIds.input}`,
              }),
              h.DataAttribute('slot', 'number-input-clear'),
              h.Class(
                'flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              ),
            ],
            [Icon.x({ class: 'size-3' }, h)],
          )
        : undefined

    const statusIcon =
      props.status !== undefined && props.statusVariant === 'tooltip'
        ? h.button(
            [
              h.Type('button'),
              h.AriaLabel(statusButtonLabel(props.status.type)),
              h.Title(props.status.message ?? ''),
              h.DataAttribute('slot', 'number-input-status-icon'),
              h.Class('flex shrink-0 items-center'),
            ],
            [
              Icon.icon(
                statusIconName(props.status.type),
                {
                  class: cn(
                    'size-4',
                    props.status.type === 'error' && 'text-destructive',
                    props.status.type === 'warning' && 'text-warning',
                    props.status.type === 'success' && 'text-success',
                  ),
                  ariaLabel: statusButtonLabel(props.status.type),
                },
                h,
              ),
            ],
          )
        : undefined

    const steppers =
      props.hasNumberSteppers === true
        ? h.div(
            [
              h.DataAttribute('slot', 'number-input-steppers'),
              h.Class(
                '-my-1 -me-2 flex w-7 shrink-0 flex-col self-stretch overflow-hidden rounded-r-[5px] border-l border-input',
              ),
            ],
            [
              {
                delta: 1 as const,
                label: `Increment ${typeof props.label === 'string' ? props.label : 'value'}`,
                icon: 'chevron-up',
                extra: '',
              },
              {
                delta: -1 as const,
                label: `Decrement ${typeof props.label === 'string' ? props.label : 'value'}`,
                icon: 'chevron-down',
                extra: 'border-t border-input',
              },
            ].map(({ delta, label, icon, extra }) =>
              h.button(
                [
                  h.Type('button'),
                  h.Tabindex(-1),
                  h.AriaLabel(label),
                  h.Disabled(
                    props.isDisabled === true ||
                      props.isReadOnly === true ||
                      !canStep(delta, {
                        value: stepValue,
                        min: props.min,
                        max: props.max,
                      }),
                  ),
                  // Stepping edits the focused input; do not blur it on press.
                  h.Attribute('onmousedown', 'event.preventDefault()'),
                  h.OnClick(Message.Stepped({ value: stepper(delta) }), {
                    propagation: 'Stop',
                    focusSelector: `#${fieldIds.input}`,
                  }),
                  h.Class(
                    cn(
                      'flex min-h-0 flex-1 cursor-pointer items-center justify-center bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:text-muted-foreground/50 disabled:hover:bg-background',
                      extra,
                    ),
                  ),
                ],
                [Icon.icon(icon, { class: 'size-3.5' }, h)],
              ),
            ),
          )
        : undefined

    const wrapper = h.div(
      [
        h.DataAttribute('slot', 'number-input-wrapper'),
        h.Class(
          cn(
            'relative z-[1] flex w-full items-center gap-2 rounded-md border bg-background px-2 py-1 transition-[border-color,box-shadow] duration-150',
            heightStyles[size],
            props.status?.type === 'error'
              ? 'border-destructive'
              : props.status?.type === 'warning'
                ? 'border-warning'
                : props.status?.type === 'success'
                  ? 'border-success'
                  : 'border-input',
            props.isDisabled === true
              ? 'cursor-default opacity-50 shadow-none'
              : cn(
                  'focus-within:border-ring focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_20%,transparent)]',
                  'not-focus-within:hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--input)_30%,transparent)]',
                ),
          ),
        ),
      ],
      [
        input,
        ...(props.units === undefined
          ? []
          : [
              h.span(
                [
                  h.DataAttribute('slot', 'number-input-units'),
                  h.Class('shrink-0 text-sm leading-5 text-muted-foreground'),
                ],
                [props.units],
              ),
            ]),
        ...(clearButton === undefined ? [] : [clearButton]),
        ...(statusIcon === undefined ? [] : [statusIcon]),
        ...(steppers === undefined ? [] : [steppers]),
      ],
    )

    const statusLayer =
      props.status?.message === undefined ||
      props.status === undefined ||
      props.statusVariant === 'tooltip'
        ? []
        : [
            props.statusVariant === 'detached'
              ? renderDetachedStatus(
                  props.status,
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
                    statusIconName(props.status.type),
                    { class: 'size-3' },
                    h,
                  ),
                  h,
                  fieldIds.status,
                )
              : renderAttachedStatus(
                  props.status,
                  {
                    root: type => [
                      h.Class(
                        cn(
                          'pointer-events-none rounded-b-md px-2 pb-2 text-xs leading-5',
                          attachedOverlap[size],
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
        h.DataAttribute('slot', 'number-input'),
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
                  h.DataAttribute('slot', 'number-input-description'),
                  h.Class('text-xs leading-5 text-muted-foreground'),
                ],
                [props.description],
              ),
            ]),
        h.div(
          [
            h.DataAttribute('slot', 'number-input-status-wrapper'),
            h.Class('relative z-0 flex flex-col'),
          ],
          [wrapper, ...statusLayer],
        ),
        ...(pendingIsInvalid(props, model)
          ? [
              h.span(
                [h.Class('sr-only'), h.AriaLive('polite')],
                ['Invalid number'],
              ),
            ]
          : []),
      ],
    )
  },
)

export const numberInput = <Msg>(
  props: NumberInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view,
    viewInputs: props,
    toParentMessage: props.toParentMessage,
  })
