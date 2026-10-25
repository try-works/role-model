import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx TimeInput (packages/core/src/TimeInput) —
   examples and visual spec adapted to Crease UI tokens.

   Typed entry and optional styled segment selectors share a controlled ISO
   value. Astrx duration-fast (130ms) maps to
   interactionTokens.motionFast (150ms); accent/accent-muted map to
   tokens.ring + color-mix over Crease tokens. */

import * as stylex from '@stylexjs/stylex'
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

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'
import * as Select from './select'

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

const styles = stylex.create({
  picker: {
    gap: '0.125rem',
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 0,
  },
  pickerWrapper: { gap: '0.25rem', height: '2.25rem' },
  pickerSeparator: { color: tokens.mutedForeground },
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
    isolation: 'isolate',
    position: 'relative',
    zIndex: 0,
  },
  pickerStatusWrapperOpen: { zIndex: 50 },
  wrapper: {
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.background,
    display: 'flex',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
    zIndex: 1,
    width: '100%',
  },
  wrapperSm: {
    height: '1.75rem',
  },
  wrapperMd: {
    height: '2rem',
  },
  wrapperLg: {
    height: '2.25rem',
  },
  wrapperIdle: {
    borderColor: {
      default: tokens.input,
      ':focus-within': tokens.ring,
    },
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-within': `inset 0 0 0 2px color-mix(in srgb, ${tokens.ring} 20%, transparent)`,
      ':hover:not(:focus-within)': `inset 0 0 0 2px color-mix(in srgb, ${tokens.input} 30%, transparent)`,
    },
  },
  wrapperDisabled: {
    borderColor: tokens.input,
    boxShadow: tokens.shadowNone,
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
  },
  borderError: {
    borderColor: {
      default: tokens.destructive,
      ':focus-within': tokens.destructive,
    },
  },
  borderWarning: {
    borderColor: {
      default: tokens.alertWarning,
      ':focus-within': tokens.alertWarning,
    },
  },
  borderSuccess: {
    borderColor: {
      default: tokens.alertSuccess,
      ':focus-within': tokens.alertSuccess,
    },
  },
  icon: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    flexShrink: 0,
  },
  input: {
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: tokens.foreground,
    display: 'block',
    flexBasis: '0%',
    flexGrow: 1,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    minWidth: 0,
    '::placeholder': {
      color: tokens.mutedForeground,
    },
  },
  inputDisabled: {
    cursor: interactionTokens.cursorDefault,
  },
  inputInvalid: {
    color: tokens.mutedForeground,
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
    paddingBlockEnd: '0.5rem',
    pointerEvents: 'none',
  },
  statusAttachedSm: {
    marginBlockStart: '-0.875rem',
    paddingBlockStart: '1.375rem',
  },
  statusAttachedMd: {
    marginBlockStart: '-1rem',
    paddingBlockStart: '1.5rem',
  },
  statusAttachedLg: {
    marginBlockStart: '-1.125rem',
    paddingBlockStart: '1.625rem',
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
    flexGrow: 1,
  },
  statusIconRow: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: '1.25rem',
  },
  iconSm: {
    height: '0.75rem',
    width: '0.75rem',
  },
  iconMd: {
    height: '1rem',
    width: '1rem',
  },
})

const heightStyle = {
  sm: styles.wrapperSm,
  md: styles.wrapperMd,
  lg: styles.wrapperLg,
} as const

const attachedOverlap = {
  sm: styles.statusAttachedSm,
  md: styles.statusAttachedMd,
  lg: styles.statusAttachedLg,
} as const

export type TimeInputProps<Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
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
  layoutStyle?: ComponentLayoutStyle
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
  const pad2 = (n: number) => n.toString().padStart(2, '0')
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}${hasSeconds ? `:${pad2(now.getSeconds())}` : ''}`
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
        ...(props.isRequired === true && props.isOptional !== true
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

    const clockIcon = h.span(
      [
        h.DataAttribute('slot', 'time-input-icon'),
        h.Class(className(styles.icon)),
      ],
      [Icon.clock({ class: className(styles.iconMd) }, h)],
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
        className(
          reset.input,
          styles.input,
          props.isDisabled === true && styles.inputDisabled,
          pendingIsInvalid && styles.inputInvalid,
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
            h.Class(className(styles.picker)),
          ],
          parts.flatMap((part, index) => [
            ...(index > 0 && part !== 'period'
              ? [
                  h.span(
                    [
                      h.AriaHidden(true),
                      h.Class(className(styles.pickerSeparator)),
                    ],
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
              h.Class(className(reset.button, styles.clearButton)),
            ],
            [Icon.x({ class: className(styles.iconSm) }, h)],
          )
        : undefined

    const status = props.status
    const statusIcon =
      status !== undefined && props.statusVariant === 'tooltip'
        ? h.button(
            [
              h.Type('button'),
              h.AriaLabel(statusButtonLabel(status.type)),
              h.Title(status.message ?? ''),
              h.DataAttribute('slot', 'time-input-status-icon'),
              h.Class(className(reset.button, styles.statusIconButton)),
            ],
            [
              Icon.icon(
                statusIconName(status.type),
                {
                  class: className(
                    styles.iconMd,
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

    const wrapper = h.div(
      [
        h.DataAttribute('slot', 'time-input-wrapper'),
        h.Class(
          className(
            styles.wrapper,
            heightStyle[size],
            isSelect && styles.pickerWrapper,
            props.isDisabled === true
              ? styles.wrapperDisabled
              : status === undefined
                ? styles.wrapperIdle
                : status.type === 'error'
                  ? styles.borderError
                  : status.type === 'warning'
                    ? styles.borderWarning
                    : styles.borderSuccess,
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
      status?.message === undefined ||
      status === undefined ||
      props.statusVariant === 'tooltip'
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
                    { class: className(styles.iconSm) },
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
                          attachedOverlap[size],
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
                  h.DataAttribute('slot', 'time-input-description'),
                  h.Class(className(reset.text, styles.description)),
                ],
                [props.description],
              ),
            ]),
        h.div(
          [
            h.DataAttribute('slot', 'time-input-status-wrapper'),
            h.Class(
              className(
                styles.statusWrapper,
                isSelect &&
                  Object.values(model.parts).some(part => part.isOpen) &&
                  styles.pickerStatusWrapperOpen,
              ),
            ),
          ],
          [wrapper, ...statusLayer],
        ),
        ...(pendingIsInvalid
          ? [
              h.div(
                [
                  h.Class(className(styles.srOnly)),
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
    viewInputs: { ...props, layoutStyle: props.layoutStyle },
    toParentMessage: props.toParentMessage,
  })
