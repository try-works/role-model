import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx NumberInput (packages/core/src/NumberInput) —
   examples and visual spec adapted to Crease UI tokens.

   PORT-NOTE: astryx's `isWheelEnabled` scroll-stepping runs DOM-side —
   foldkit's `OnWheel` carries no delta, so the inline `onwheel` handler
   (focused input only) dispatches the ArrowUp/ArrowDown the keydown path
   already turns into Stepped. Astrx
   duration-fast (130ms) maps to interactionTokens.motionFast (150ms);
   accent/accent-muted map to tokens.ring + color-mix over Crease tokens. */

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

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

export { init, Model, Message, OutMessage, update } from '@/lib/number-input'
export type { NumberInputSize } from '@/lib/number-input'
export type { InputStatus } from '@/lib/input-status'

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
      /* astryx: hover shows a 2px inset tint of the border color; focus-within
         shows the accent-muted inset. Crease maps accent→ring. */
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
  input: {
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: tokens.foreground,
    display: 'block',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
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
  units: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
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
  steppers: {
    overflow: 'hidden',
    alignSelf: 'stretch',
    borderEndEndRadius: '5px',
    borderInlineStartColor: tokens.input,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: 1,
    borderStartEndRadius: '5px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    marginBlockEnd: '-0.25rem',
    marginBlockStart: '-0.25rem',
    marginInlineEnd: '-0.5rem',
    width: '1.75rem',
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: {
      default: tokens.background,
      ':hover': tokens.accent,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.accentForeground,
    },
    cursor: {
      default: interactionTokens.cursorAction,
      ':disabled': interactionTokens.cursorDefault,
    },
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    minHeight: 0,
  },
  stepperDecrement: {
    borderBlockStartColor: tokens.input,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: 1,
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
    flexGrow: '1',
    flexShrink: '1',
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
  stepperIcon: {
    height: '0.875rem',
    width: '0.875rem',
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

export type NumberInputProps<Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
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
  layoutStyle?: ComponentLayoutStyle
}>

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
      h.Class(
        className(
          reset.input,
          styles.input,
          props.isDisabled === true && styles.inputDisabled,
        ),
      ),
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
              h.Class(className(reset.button, styles.clearButton)),
            ],
            [Icon.x({ class: className(styles.iconSm) }, h)],
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
              h.Class(className(reset.button, styles.statusIconButton)),
            ],
            [
              Icon.icon(
                statusIconName(props.status.type),
                {
                  class: className(
                    styles.iconMd,
                    props.status.type === 'error' && styles.statusIconError,
                    props.status.type === 'warning' && styles.statusIconWarning,
                    props.status.type === 'success' && styles.statusIconSuccess,
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
              h.Class(className(styles.steppers)),
            ],
            [
              {
                delta: 1 as const,
                label: `Increment ${typeof props.label === 'string' ? props.label : 'value'}`,
                icon: 'chevron-up',
                extra: undefined as stylex.StaticStyles | undefined,
              },
              {
                delta: -1 as const,
                label: `Decrement ${typeof props.label === 'string' ? props.label : 'value'}`,
                icon: 'chevron-down',
                extra: styles.stepperDecrement as
                  | stylex.StaticStyles
                  | undefined,
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
                  h.Class(className(reset.button, styles.stepperButton, extra)),
                ],
                [Icon.icon(icon, { class: className(styles.stepperIcon) }, h)],
              ),
            ),
          )
        : undefined

    const status = props.status
    const wrapper = h.div(
      [
        h.DataAttribute('slot', 'number-input-wrapper'),
        h.Class(
          className(
            styles.wrapper,
            heightStyle[size],
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
        input,
        ...(props.units === undefined
          ? []
          : [
              h.span(
                [
                  h.DataAttribute('slot', 'number-input-units'),
                  h.Class(className(styles.units)),
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
        h.DataAttribute('slot', 'number-input'),
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
                  h.DataAttribute('slot', 'number-input-description'),
                  h.Class(className(reset.text, styles.description)),
                ],
                [props.description],
              ),
            ]),
        h.div(
          [
            h.DataAttribute('slot', 'number-input-status-wrapper'),
            h.Class(className(styles.statusWrapper)),
          ],
          [wrapper, ...statusLayer],
        ),
        ...(pendingIsInvalid(props, model)
          ? [
              h.span(
                [h.Class(className(styles.srOnly)), h.AriaLive('polite')],
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
    viewInputs: { ...props, layoutStyle: props.layoutStyle },
    toParentMessage: props.toParentMessage,
  })
