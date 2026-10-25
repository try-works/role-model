/* Ported from Meta Astryx TimeInput (packages/core/src/TimeInput) —
   examples and visual spec adapted to Crease UI tokens.

   Typed entry and the optional hour/minute selector use the same controlled
   ISO time value; selector interaction is owned by Foldkit Listbox. */

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
  adjustTime,
  commitResolutionOf,
  formatDisplayTime,
  isTimeInRange,
  Message,
  parseISOTime,
  pickerButtonId,
  resolveTimePart,
  timePartOptions,
  timePartValue,
  resolveTimeDraft,
  resolveTimeInputCommit,
  type Model,
  type TimeInputCommit,
  type TimePart,
} from '@/lib/time-input'
import { cn } from '@/lib/utils'
import * as Select from '@/ui/select'

export {
  init,
  Model,
  Message,
  OutMessage,
  update,
  pickerButtonId,
} from '@/lib/time-input'
export type { TimeValue } from '@/lib/time-input'
export type { InputStatus } from '@/lib/input-status'

const heightStyles = { sm: 'h-7', md: 'h-8', lg: 'h-9' } as const
const attachedOverlap = {
  sm: '-mt-3.5 pt-[22px]',
  md: '-mt-4 pt-6',
  lg: '-mt-[18px] pt-[26px]',
} as const

export type TimeInputProps<Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
  /** The committed value owned by the parent, as "HH:MM" / "HH:MM:SS". */
  value?: string | null
  /** Styled segment selectors, or flexible typed entry (default). */
  presentation?: 'input' | 'select'
  isLabelHidden?: boolean
  description?: Html | string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  placeholder?: string
  min?: string
  max?: string
  /** Minutes per arrow-key step (astryx `increment`, default 1). */
  increment?: number
  hourFormat?: '12h' | '24h'
  hasSeconds?: boolean
  hasClear?: boolean
  isLoading?: boolean
  status?: InputStatus
  statusVariant?: FieldStatusVariant
  size?: 'sm' | 'md' | 'lg'
  name?: string
  autocomplete?: string
  isAutofocus?: boolean
  'aria-label'?: string
  class?: string
}>

export type TimeInputViewInputs = Omit<
  TimeInputProps<never>,
  'model' | 'toParentMessage'
>

const ids = (id: string) => ({
  input: `${id}-input`,
  label: `${id}-label`,
  description: `${id}-description`,
  status: `${id}-status`,
})

const commitResolution = (
  props: TimeInputViewInputs,
  model: Model,
): TimeInputCommit =>
  resolveTimeInputCommit(Option.getOrUndefined(model.pendingInput), {
    includeSeconds: props.hasSeconds === true,
    hasClear: props.hasClear,
    min: props.min,
    max: props.max,
  })

const displayValue = (props: TimeInputViewInputs, model: Model): string =>
  Option.match(model.pendingInput, {
    onSome: text => text,
    onNone: () => {
      const value = props.value
      if (value === undefined || value === null || value === '') return ''
      return formatDisplayTime(value, {
        hourFormat: props.hourFormat ?? '12h',
        hasSeconds: props.hasSeconds,
      })
    },
  })

const nowTime = (hasSeconds: boolean): string => {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const seconds = now.getSeconds()
  const pad2 = (n: number) => n.toString().padStart(2, '0')
  return `${pad2(now.getHours())}:${pad2(minutes % 60)}${hasSeconds ? `:${pad2(seconds)}` : ''}`
}

const view = defineView<Model, Message, TimeInputViewInputs>(
  (model, props, h) => {
    const fieldIds = ids(props.id)
    const size = props.size ?? 'md'
    const value = props.value === '' ? undefined : (props.value ?? undefined)
    const pending = Option.getOrUndefined(model.pendingInput)
    const pendingIsInvalid =
      pending !== undefined &&
      pending.trim() !== '' &&
      Option.isNone(
        resolveTimeDraft(pending, {
          includeSeconds: props.hasSeconds === true,
          min: props.min,
          max: props.max,
        }),
      )
    const isInvalid = props.status?.type === 'error' || pendingIsInvalid
    const commit = commitResolution(props, model)
    const includeSeconds = props.hasSeconds === true
    const hourFormat = props.hourFormat ?? '12h'
    const isSelect = props.presentation === 'select'
    const focusId = isSelect ? pickerButtonId(model) : fieldIds.input

    const describedBy =
      [
        props.description === undefined ? null : fieldIds.description,
        props.status?.message !== undefined && props.statusVariant !== 'tooltip'
          ? fieldIds.status
          : null,
      ]
        .filter(Boolean)
        .join(' ') || undefined

    const displayPlaceholder =
      model.isFocused && value === undefined && pending === undefined
        ? `e.g., ${hourFormat === '24h' ? '14:30' : '2:30 PM'}${includeSeconds ? (hourFormat === '24h' ? ':45' : ':30') : ''}`
        : props.placeholder

    const fieldLabel = h.label(
      [
        h.For(focusId),
        h.Id(fieldIds.label),
        h.DataAttribute('slot', 'time-input-label'),
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

    const clockIcon = h.span(
      [
        h.DataAttribute('slot', 'time-input-icon'),
        h.Class('flex shrink-0 items-center text-muted-foreground'),
      ],
      [Icon.clock({ class: 'size-4' }, h)],
    )

    const stepValue = (direction: 1 | -1): string | null => {
      const base = value ?? nowTime(includeSeconds)
      const next = adjustTime(base, direction * (props.increment ?? 1))
      return next !== null && isTimeInRange(next, props.min, props.max)
        ? next
        : null
    }

    const input = h.input([
      h.Id(fieldIds.input),
      h.Type('text'),
      h.Attribute('inputmode', 'numeric'),
      h.Attribute('autocomplete', props.autocomplete ?? 'off'),
      h.Attribute('spellcheck', 'false'),
      h.Value(displayValue(props, model)),
      ...(displayPlaceholder === undefined
        ? []
        : [h.Placeholder(displayPlaceholder)]),
      h.AriaLabelledBy(fieldIds.label),
      ...(props['aria-label'] === undefined
        ? []
        : [h.AriaLabel(props['aria-label'])]),
      ...(describedBy === undefined ? [] : [h.AriaDescribedBy(describedBy)]),
      h.AriaInvalid(isInvalid),
      h.AriaRequired(props.isRequired === true && props.isOptional !== true),
      h.AriaBusy(props.isLoading === true),
      h.Disabled(props.isDisabled === true),
      h.Readonly(props.isReadOnly === true),
      ...(props.name === undefined ? [] : [h.Name(props.name)]),
      ...(props.isAutofocus === true ? [h.Autofocus(true)] : []),
      h.DataAttribute('slot', 'time-input-input'),
      h.Class(
        cn(
          'flex-1 min-w-0 border-0 bg-transparent p-0 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground',
          props.isDisabled === true && 'cursor-default',
          pendingIsInvalid && 'text-muted-foreground',
        ),
      ),
      h.OnFocus(Message.FocusGained()),
      h.OnBlur(
        Message.CommitDecided({ resolution: commitResolutionOf(commit) }),
      ),
      h.OnInput(text =>
        Message.DraftEdited({
          text,
          resolved: resolveTimeDraft(text, {
            includeSeconds,
            min: props.min,
            max: props.max,
          }),
        }),
      ),
      ...(props.isDisabled === true || props.isReadOnly === true
        ? []
        : [
            h.OnKeyDownPreventDefault(key => {
              if (key === 'ArrowUp' || key === 'ArrowDown') {
                const next = stepValue(key === 'ArrowUp' ? 1 : -1)
                return next === null
                  ? Option.none()
                  : Option.some(Message.Stepped({ value: next }))
              }
              return Option.none()
            }),
          ]),
    ])

    const parts: ReadonlyArray<TimePart> = [
      'hour',
      'minute',
      ...(includeSeconds ? ['second' as const] : []),
      ...(hourFormat === '12h' ? ['period' as const] : []),
    ]
    const picker = isSelect
      ? h.div(
          [
            h.DataAttribute('slot', 'time-input-picker'),
            h.Class('flex min-w-0 flex-1 items-center gap-0.5 tabular-nums'),
          ],
          parts.flatMap((part, index) => [
            ...(index > 0 && part !== 'period'
              ? [
                  h.span(
                    [h.AriaHidden(true), h.Class('text-muted-foreground')],
                    [':'],
                  ),
                ]
              : []),
            Select.select(
              {
                model: model.parts[part],
                maybeSelectedValue: timePartValue(value, part, hourFormat),
                toParentMessage: message =>
                  Message.GotPartMessage({
                    part,
                    message,
                    context: {
                      value: value ?? null,
                      hourFormat,
                      hasSeconds: includeSeconds,
                      min: props.min ?? null,
                      max: props.max ?? null,
                    },
                  }),
                items: timePartOptions(part, hourFormat),
                itemToValue: item => item,
                itemToLabel: item => item,
                itemToConfig: item => ({
                  isDisabled:
                    resolveTimePart(value, part, item, {
                      hourFormat,
                      hasSeconds: includeSeconds,
                      min: props.min,
                      max: props.max,
                    }) === null,
                }),
                itemGroupKey: () => part,
                groupToHeading: () =>
                  part === 'period'
                    ? 'AM / PM'
                    : `${part[0]?.toUpperCase()}${part.slice(1)}`,
                placeholder: '--',
                ariaLabel: `${props['aria-label'] ?? (typeof props.label === 'string' ? props.label : 'Time')} ${part === 'period' ? 'AM or PM' : part}`,
                isDisabled:
                  props.isDisabled === true || props.isLoading === true,
                isReadOnly: props.isReadOnly ?? false,
                isInvalid,
                variant: 'ghost',
              },
              h,
            ),
          ]),
        )
      : input

    const clearButton =
      props.hasClear === true &&
      value !== undefined &&
      props.isDisabled !== true &&
      props.isReadOnly !== true
        ? h.button(
            [
              h.Type('button'),
              h.Tabindex(isSelect ? 0 : -1),
              h.AriaLabel(
                `Clear ${typeof props.label === 'string' ? props.label : 'time'}`,
              ),
              h.OnClick(Message.ClearRequested(), {
                propagation: 'Stop',
                focusSelector: `#${focusId}`,
              }),
              h.DataAttribute('slot', 'time-input-clear'),
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
              h.DataAttribute('slot', 'time-input-status-icon'),
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

    const wrapper = h.div(
      [
        h.DataAttribute('slot', 'time-input-wrapper'),
        h.Class(
          cn(
            'relative z-[1] flex w-full items-center gap-2 rounded-md border bg-background px-2 py-1 transition-[border-color,box-shadow] duration-150',
            heightStyles[size],
            isSelect && 'h-9 gap-1',
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
        clockIcon,
        isSelect ? picker : input,
        ...(isSelect && props.name !== undefined
          ? [
              h.input([
                h.Type('hidden'),
                h.Name(props.name),
                h.Value(
                  value === undefined
                    ? ''
                    : formatDisplayTime(value, {
                        hourFormat: '24h',
                        hasSeconds: includeSeconds,
                      }),
                ),
                h.Disabled(props.isDisabled === true),
                h.DataAttribute('slot', 'time-input-value'),
              ]),
            ]
          : []),
        ...(clearButton === undefined ? [] : [clearButton]),
        ...(statusIcon === undefined ? [] : [statusIcon]),
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
        h.DataAttribute('slot', 'time-input'),
        ...(isSelect
          ? [
              h.Role('group'),
              h.AriaLabelledBy(fieldIds.label),
              ...(describedBy === undefined
                ? []
                : [h.AriaDescribedBy(describedBy)]),
            ]
          : []),
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
                  h.DataAttribute('slot', 'time-input-description'),
                  h.Class('text-xs leading-5 text-muted-foreground'),
                ],
                [props.description],
              ),
            ]),
        h.div(
          [
            h.DataAttribute('slot', 'time-input-status-wrapper'),
            h.Class(
              cn(
                'relative z-0 flex flex-col',
                isSelect &&
                  Object.values(model.parts).some(part => part.isOpen) &&
                  'z-50',
              ),
            ),
          ],
          [wrapper, ...statusLayer],
        ),
        ...(pendingIsInvalid
          ? [
              h.div(
                [
                  h.Class('sr-only'),
                  h.Attribute('role', 'alert'),
                  h.AriaLive('assertive'),
                ],
                ['Invalid time'],
              ),
            ]
          : []),
      ],
    )
  },
)

export const timeInput = <Msg>(
  props: TimeInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view,
    viewInputs: props,
    toParentMessage: props.toParentMessage,
  })
