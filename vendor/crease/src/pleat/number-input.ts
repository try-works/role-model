import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
/* Ported from Meta Astryx NumberInput (packages/core/src/NumberInput) —
   examples and visual spec adapted to Crease UI tokens.

   PORT-NOTE: astryx's `isWheelEnabled` scroll-stepping runs DOM-side —
   foldkit's `OnWheel` carries no delta, so the inline `onwheel` handler
   (focused input only) dispatches the ArrowUp/ArrowDown the keydown path
   already turns into Stepped. Astrx
   duration-fast (130ms) maps to interactionTokens.motionFast (150ms);
   accent/accent-muted map to tokens.ring + color-mix over Crease tokens. */

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
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

export { init, Model, Message, OutMessage, update } from '@/lib/number-input'
export type { NumberInputSize } from '@/lib/number-input'
export type { InputStatus } from '@/lib/input-status'

const styles = {
  field: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  label: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  labelDisabled: Style.make({ opacity: 0.5 }),
  srOnly: Style.make({
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  }),
  labelIndicator: Style.make({
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  }),
  statusWrapper: Style.make({
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 0,
  }),
  wrapper: Style.make({
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
  }),
  wrapperSm: Style.make({ height: '1.75rem' }),
  wrapperMd: Style.make({ height: '2rem' }),
  wrapperLg: Style.make({ height: '2.25rem' }),
  wrapperIdle: Style.make({
    borderColor: tokens.input,
    boxShadow: tokens.shadowNone,
  }).pipe(
    Style.when(When.focusWithin, {
      borderColor: tokens.ring,
      boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${tokens.ring} 20%, transparent)`,
    }),
    Style.when(When.all(When.hover, When.not(When.focusWithin)), {
      boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${tokens.input} 30%, transparent)`,
    }),
  ),
  wrapperDisabled: Style.make({
    borderColor: tokens.input,
    boxShadow: tokens.shadowNone,
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
  }),
  borderError: Style.make({ borderColor: tokens.destructive }).pipe(
    Style.when(When.focusWithin, { borderColor: tokens.destructive }),
  ),
  borderWarning: Style.make({ borderColor: tokens.alertWarning }).pipe(
    Style.when(When.focusWithin, { borderColor: tokens.alertWarning }),
  ),
  borderSuccess: Style.make({ borderColor: tokens.alertSuccess }).pipe(
    Style.when(When.focusWithin, { borderColor: tokens.alertSuccess }),
  ),
  input: Style.make({
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
  }).pipe(Style.when(When.placeholder, { color: tokens.mutedForeground })),
  inputDisabled: Style.make({ cursor: interactionTokens.cursorDefault }),
  units: Style.make({
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  clearButton: Style.make({
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1.25rem',
    width: '1.25rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
  ),
  statusIconButton: Style.make({
    alignItems: 'center',
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    flexShrink: 0,
  }),
  statusIconError: Style.make({ color: tokens.destructive }),
  statusIconWarning: Style.make({ color: tokens.alertWarning }),
  statusIconSuccess: Style.make({ color: tokens.alertSuccess }),
  steppers: Style.make({
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
  }),
  stepperButton: Style.make({
    alignItems: 'center',
    backgroundColor: tokens.background,
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    minHeight: 0,
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.disabled, { cursor: interactionTokens.cursorDefault }),
  ),
  stepperDecrement: Style.make({
    borderBlockStartColor: tokens.input,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: 1,
  }),
  statusDetached: Style.make({
    padding: '0.5rem',
    borderRadius: foundationTokens.radiusLg,
    gap: '0.25rem',
    alignItems: 'flex-start',
    display: 'flex',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    marginBlockStart: '0.25rem',
  }),
  statusAttached: Style.make({
    paddingInline: '0.5rem',
    borderEndEndRadius: foundationTokens.radiusMd,
    borderEndStartRadius: foundationTokens.radiusMd,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    paddingBlockEnd: '0.5rem',
    pointerEvents: 'none',
  }),
  statusAttachedSm: Style.make({
    marginBlockStart: '-0.875rem',
    paddingBlockStart: '1.375rem',
  }),
  statusAttachedMd: Style.make({
    marginBlockStart: '-1rem',
    paddingBlockStart: '1.5rem',
  }),
  statusAttachedLg: Style.make({
    marginBlockStart: '-1.125rem',
    paddingBlockStart: '1.625rem',
  }),
  statusError: Style.make({
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
    color: tokens.destructive,
  }),
  statusWarning: Style.make({
    backgroundColor: `color-mix(in oklab, ${tokens.alertWarning} 15%, transparent)`,
    color: tokens.alertWarning,
  }),
  statusSuccess: Style.make({
    backgroundColor: `color-mix(in oklab, ${tokens.alertSuccess} 15%, transparent)`,
    color: tokens.alertSuccess,
  }),
  statusText: Style.make({ flexBasis: '0%', flexGrow: '1', flexShrink: '1' }),
  statusIconRow: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: '1.25rem',
  }),
  iconSm: Style.make({ height: '0.75rem', width: '0.75rem' }),
  iconMd: Style.make({ height: '1rem', width: '1rem' }),
  stepperIcon: Style.make({ height: '0.875rem', width: '0.875rem' }),
}

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
  layoutStyle?: ComponentLayoutStyle | undefined
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
                extra: undefined as Style.Style | undefined,
              },
              {
                delta: -1 as const,
                label: `Decrement ${typeof props.label === 'string' ? props.label : 'value'}`,
                icon: 'chevron-down',
                extra: styles.stepperDecrement as Style.Style | undefined,
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
