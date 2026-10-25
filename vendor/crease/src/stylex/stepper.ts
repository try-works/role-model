import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx Stepper (packages/core/src/Stepper/Stepper.tsx, Step.tsx) — examples and visual spec adapted to Crease UI tokens. */

import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import {
  fillTiming,
  isCompact as stepperIsCompact,
  Message,
  Model,
  type OutMessage,
  previousActiveStep,
  progressFor,
  init,
  update,
  rootMount,
  stepAriaLabel,
  stepStatusText,
  OT_ARRIVAL_SHARE_HORIZONTAL,
  OT_ARRIVAL_SHARE_VERTICAL,
  OT_RAIL_SHARE_OF_LEAVING,
  type StepperProgress,
  type StepperStatus,
  type StepperTiming,
} from '@/lib/stepper'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { tokens } from './tokens.stylex'
import { className } from './style'
import { button } from './button'

export { Message, Model, init, update }
export type { OutMessage }

/* PORT-NOTE: needs token 'overlayHover' = rgba(5,54,89,0.05) light /
   rgba(255,255,255,0.05) dark — the hover wash on clickable steps; nearest
   available token (foregroundSoft, 10% foreground) is applied instead. */

export type StepperOrientation = 'horizontal' | 'vertical'
export type StepperIndicatorPosition = 'separated' | 'on-track'
export type StepperDensity = 'compact' | 'balanced' | 'spacious'
export type StepperCollapsedVariant =
  | 'withLabelAndControls'
  | 'withLabel'
  | 'hiddenLabel'
export type StepperStepStatus = StepperStatus

export type StepperStep<Msg> = Readonly<{
  label: string
  description?: string
  status?: StepperStepStatus
  isDisabled?: boolean
  isOptional?: boolean
  /** 'auto' (default): number while upcoming, check once completed, current
      ring while active. 'number': always a number badge. 'none': no
      indicator. Pass an Html element for a custom indicator node. */
  indicator?: 'number' | 'auto' | 'none' | Html
  endContent?: Html
  /** Rich content slot rendered below the label row (stays mounted, hidden
      while collapsed). */
  content?: Html | ReadonlyArray<Html | string>
}>

export type StepperProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Zero-based active step (controlled by the parent). */
  activeStep: number
  steps: ReadonlyArray<StepperStep<Msg>>
  orientation?: StepperOrientation
  /** 'separated': bar segment per step above/beside the label.
      'on-track': indicator slotted into the connector line. */
  indicatorPosition?: StepperIndicatorPosition
  density?: StepperDensity
  /** When true, steps render as buttons and clicks emit ClickedStep.
      Astryx derives this from the presence of onStepClick. */
  hasStepButtons?: boolean
  /** Accessible label on the ordered list. Defaults to 'Progress'. */
  label?: string
  /** Per-step pixel width below which a horizontal stepper collapses. */
  minimumStepWidth?: number
  collapsedVariant?: StepperCollapsedVariant
  layoutStyle?: ComponentLayoutStyle
}>

const CONNECTOR_CLIP_EXPR = 'max(0px,min(var(--step-connector-gap,0px),8px))'

const timingAttrs = <Msg>(
  h: HtmlBuilder<Msg>,
  timing: StepperTiming,
): ReadonlyArray<ReturnType<typeof h.Style>> => [
  h.Style({
    '--stepper-seg-duration': timing.duration,
    '--stepper-seg-delay': timing.delay,
  }),
]

const styles = stylex.create({
  frame: {
    gap: 0,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  root: {
    margin: 0,
    padding: 0,
    display: 'flex',
    listStyleType: 'none',
    width: '100%',
  },
  horizontal: {
    gap: '0.25rem',
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  vertical: {
    gap: '0.25rem',
    flexDirection: 'column',
  },
  horizontalOnTrack: {
    gap: 0,
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  verticalOnTrack: {
    gap: 0,
    flexDirection: 'column',
  },
  summary: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  summaryBody: {
    gap: '0.125rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    textAlign: 'center',
    minWidth: 0,
  },
  verticalRoot: {
    gap: '0.125rem',
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  },
  verticalBar: {
    borderRadius: foundationTokens.radiusFull,
    alignSelf: 'stretch',
    flexShrink: 0,
    width: '0.25rem',
  },
  verticalBody: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
  },
  horizontalStep: {
    alignItems: 'stretch',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    minWidth: 0,
  },
  horizontalBar: {
    borderRadius: foundationTokens.radiusFull,
    flexShrink: 0,
    marginBlockEnd: '0.125rem',
    height: '0.25rem',
    width: '100%',
  },
  connectorTrack: {
    backgroundColor: tokens.border,
    position: 'relative',
    '::before': {
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
      inset: 0,
      borderRadius: 'inherit',
      transition:
        'transform var(--stepper-seg-duration,0s) linear var(--stepper-seg-delay,0s)',
      backgroundColor: tokens.primary,
      content: '""',
      position: 'absolute',
    },
  },
  connectorFillV: {
    '::before': { transform: 'scaleY(1)', transformOrigin: 'center top' },
  },
  connectorEmptyV: {
    '::before': { transform: 'scaleY(0)', transformOrigin: 'center top' },
  },
  connectorFillH: {
    '::before': {
      transform: 'scaleX(1)',
      transformOrigin: 'left center',
    },
  },
  connectorEmptyH: {
    '::before': {
      transform: 'scaleX(0)',
      transformOrigin: 'left center',
    },
  },
  // Horizontal connector segments mirror as a unit under dir="rtl" (the same
  // mechanism as astryx's rtlStyles.mirror): one flip covers the fill origin
  // and the seg-gap clip hole.
  connectorMirrorH: {
    transform: { default: null, ':is([dir="rtl"] *)': 'scaleX(-1)' },
  },
  segHidden: {
    visibility: 'hidden',
  },
  iconLabelRow: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    minWidth: 0,
  },
  icon: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1rem',
    width: '1rem',
  },
  iconSvg: { flexShrink: 0, height: '1rem', width: '1rem' },
  iconInProgress: { color: tokens.primary },
  iconNotStarted: { color: tokens.mutedForeground },
  iconDisabled: { color: tokens.mutedForeground, opacity: 0.5 },
  iconAccent: { color: tokens.primary },
  iconSuccess: { color: tokens.alertSuccess },
  iconWarning: { color: tokens.alertWarning },
  iconError: { color: tokens.destructive },
  numberBadge: {
    borderRadius: foundationTokens.radiusFull,
    placeItems: 'center',
    display: 'grid',
    flexShrink: 0,
    fontSize: '0.625rem',
    fontWeight: 600,
    textAlign: 'center',
    height: '1rem',
    width: '1rem',
  },
  numberCompleted: {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  numberInProgress: {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  numberNotStarted: {
    backgroundColor: tokens.muted,
    color: tokens.mutedForeground,
  },
  numberDisabled: {
    backgroundColor: tokens.muted,
    color: tokens.mutedForeground,
    opacity: 0.5,
  },
  numberAccent: {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  numberSuccess: {
    backgroundColor: tokens.alertSuccess,
    color: tokens.statusPlateInk,
  },
  numberWarning: {
    backgroundColor: tokens.alertWarning,
    color: tokens.statusWarningInk,
  },
  numberError: {
    backgroundColor: tokens.destructive,
    color: tokens.destructiveForeground,
  },
  label: {
    overflow: 'hidden',
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.4286,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  labelInProgress: { fontWeight: 600 },
  labelNotStarted: { color: tokens.mutedForeground },
  labelDisabled: { color: tokens.mutedForeground },
  optionalText: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  description: {
    color: tokens.mutedForeground,
    display: 'block',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  stepContent: { paddingBlockStart: '0.5rem' },
  interactive: {
    margin: 0,
    padding: 0,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'none',
    borderWidth: 0,
    alignItems: 'stretch',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      ':hover': foundationTokens.foregroundSoft,
    },
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: {
      default: interactionTokens.cursorAction,
      ':is(:disabled,[aria-disabled="true"])': interactionTokens.cursorDefault,
    },
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    outlineColor: { default: null, ':focus-visible': tokens.ring },
    outlineOffset: { default: null, ':focus-visible': '2px' },
    outlineStyle: { default: null, ':focus-visible': 'solid' },
    outlineWidth: { default: null, ':focus-visible': '2px' },
    textAlign: 'start',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    width: '100%',
  },
  otVerticalRoot: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  otHorizontalRoot: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    minWidth: 0,
  },
  otRowWrap: {
    gap: '0.5rem',
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
  otColWrap: {
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  otIndicatorColV: {
    alignItems: 'center',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: '1rem',
  },
  otSegBaseV: {
    borderRadius: '0px',
    flexShrink: 0,
    width: '0.25rem',
  },
  otSegFlexV: {
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    minHeight: '0.5rem',
  },
  otSegGapLeadV: { clipPath: `inset(0 0 ${CONNECTOR_CLIP_EXPR} 0)` },
  otSegGapRailV: { clipPath: `inset(${CONNECTOR_CLIP_EXPR} 0 0 0)` },
  otSegGapLeadH: { clipPath: `inset(0 ${CONNECTOR_CLIP_EXPR} 0 0)` },
  otSegGapRailH: { clipPath: `inset(0 0 0 ${CONNECTOR_CLIP_EXPR})` },
  otTrackRowH: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
  otSegH: {
    borderRadius: '0px',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    height: '0.25rem',
    minWidth: '0.5rem',
  },
  otBodyV: {
    gap: '0.125rem',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  otLabelWrapH: {
    gap: '0.125rem',
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  },
  otLabelRowStart: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  otLabelRowCenter: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  otContent: { paddingBlockStart: '0.5rem' },
  otContentWrapV: { position: 'relative' },
  densityCompact: { paddingBlock: '0.25rem' },
  densityBalanced: { paddingBlock: '0.5rem' },
  densitySpacious: { paddingBlock: '0.75rem' },
  visuallyHidden: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
})

const densitySpaceOf = (density: StepperDensity): number =>
  density === 'compact' ? 4 : density === 'spacious' ? 12 : 8
const separatedInlinePad = (density: StepperDensity): number =>
  density === 'spacious' ? 12 : 8

const densityStyle = (density: StepperDensity) =>
  density === 'compact'
    ? styles.densityCompact
    : density === 'spacious'
      ? styles.densitySpacious
      : styles.densityBalanced

const iconTintStyle = (
  progress: StepperProgress,
  status: StepperStatus | undefined,
  isDisabled: boolean,
  hasStatusGlyph: boolean,
) => {
  if (isDisabled) return styles.iconDisabled
  if (hasStatusGlyph)
    return status === 'success'
      ? styles.iconSuccess
      : status === 'warning'
        ? styles.iconWarning
        : status === 'error'
          ? styles.iconError
          : styles.iconAccent
  if (status === 'accent') return styles.iconAccent
  if (status === 'success') return styles.iconSuccess
  if (status === 'warning') return styles.iconWarning
  if (status === 'error') return styles.iconError
  return progress === 'not-started'
    ? styles.iconNotStarted
    : styles.iconInProgress
}

const numberBadgeStyle = (
  progress: StepperProgress,
  status: StepperStatus | undefined,
  isDisabled: boolean,
) => {
  if (isDisabled) return styles.numberDisabled
  const isReached = progress !== 'not-started'
  if (isReached && status === 'accent') return styles.numberAccent
  if (isReached && status === 'success') return styles.numberSuccess
  if (isReached && status === 'warning') return styles.numberWarning
  if (isReached && status === 'error') return styles.numberError
  if (progress === 'completed') return styles.numberCompleted
  if (progress === 'in-progress') return styles.numberInProgress
  return styles.numberNotStarted
}

export const stepper = <Msg>(
  props: StepperProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'horizontal'
  const isHorizontal = orientation === 'horizontal'
  const isOnTrack = (props.indicatorPosition ?? 'separated') === 'on-track'
  const density = props.density ?? 'balanced'
  const hasStepButtons = props.hasStepButtons ?? false
  const collapsedVariant = props.collapsedVariant ?? 'withLabelAndControls'
  const minimumStepWidth = props.minimumStepWidth ?? 112
  const steps = props.steps
  const stepCount = steps.length
  const activeStep = props.activeStep
  const previousStep = previousActiveStep(props.model, activeStep)
  const isSingleAdvance = activeStep === previousStep + 1
  const animatedSpan = previousStep
  const compact =
    isHorizontal && stepperIsCompact(props.model, stepCount, minimumStepWidth)
  const label = props.label ?? 'Progress'
  const densitySpace = densitySpaceOf(density)
  const inlinePad = separatedInlinePad(density)

  const timing = (spanIndex: number, offset: number, share: number) =>
    fillTiming(isSingleAdvance, animatedSpan, spanIndex, offset, share)

  const srOnly = (text: string): Html =>
    h.span([h.Class(className(styles.visuallyHidden))], [text])

  const statusGlyphIcon = (
    step: StepperStep<Msg>,
    isActive: boolean,
    indicatorMode: string,
    custom: Html | undefined,
  ): 'success' | 'warning' | 'error' | null =>
    indicatorMode === 'auto' &&
    custom === undefined &&
    !isActive &&
    (step.status === 'success' ||
      step.status === 'warning' ||
      step.status === 'error')
      ? step.status
      : null

  const indicatorNode = (
    step: StepperStep<Msg>,
    index: number,
    progress: StepperProgress,
    isActive: boolean,
  ): Html => {
    const indicatorProp = step.indicator ?? 'auto'
    const custom = typeof indicatorProp === 'string' ? undefined : indicatorProp
    const indicatorMode =
      typeof indicatorProp === 'string' ? indicatorProp : 'auto'
    if (indicatorMode === 'none') return h.empty
    const isDisabled = step.isDisabled === true
    const statusGlyph = statusGlyphIcon(step, isActive, indicatorMode, custom)
    const showNumber =
      custom === undefined &&
      statusGlyph === null &&
      (indicatorMode === 'number' ||
        (indicatorMode === 'auto' && progress === 'not-started'))
    if (showNumber) {
      return h.div(
        [
          h.AriaHidden(true),
          h.Class(
            className(
              styles.numberBadge,
              numberBadgeStyle(progress, step.status, isDisabled),
            ),
          ),
        ],
        [String(index + 1)],
      )
    }
    const glyph: Html =
      custom !== undefined
        ? custom
        : statusGlyph === 'success'
          ? Icon.icon('circle-check', {}, h)
          : statusGlyph === 'warning'
            ? Icon.icon('triangle-alert', {}, h)
            : statusGlyph === 'error'
              ? Icon.icon('circle-x', {}, h)
              : progress === 'completed'
                ? Icon.icon('circle-check', {}, h)
                : Icon.icon('circle-dot', {}, h)
    return h.div(
      [
        h.AriaHidden(true),
        h.Class(
          className(
            styles.icon,
            iconTintStyle(
              progress,
              step.status,
              isDisabled,
              statusGlyph !== null,
            ),
          ),
        ),
      ],
      [glyph],
    )
  }

  const labelStyle = (
    step: StepperStep<Msg>,
    progress: StepperProgress,
    isActive: boolean,
  ) =>
    step.isDisabled === true
      ? styles.labelDisabled
      : progress === 'not-started'
        ? styles.labelNotStarted
        : isActive
          ? styles.labelInProgress
          : null

  const optionalNodes = (
    step: StepperStep<Msg>,
  ): ReadonlyArray<Html | string> =>
    step.isOptional === true
      ? [
          h.span([h.Class(className(styles.optionalText))], ['•']),
          h.span([h.Class(className(styles.optionalText))], ['Optional']),
        ]
      : []

  const statusTextNode = (statusText: string | null): Html =>
    statusText === null ? h.empty : srOnly(statusText)

  const iconLabelNode = (
    step: StepperStep<Msg>,
    index: number,
    progress: StepperProgress,
    isActive: boolean,
    statusText: string | null,
  ): Html =>
    h.div(
      [h.Class(className(styles.iconLabelRow))],
      [
        ...(compact && isOnTrack
          ? []
          : [indicatorNode(step, index, progress, isActive)]),
        h.span(
          [
            h.Class(
              className(styles.label, labelStyle(step, progress, isActive)),
            ),
          ],
          [step.label],
        ),
        statusTextNode(statusText),
        ...optionalNodes(step),
        ...(step.endContent === undefined ? [] : [step.endContent]),
      ],
    )

  const descriptionNode = (
    step: StepperStep<Msg>,
    hasIndicator: boolean,
  ): Html =>
    step.description === undefined
      ? h.empty
      : h.div(
          [
            h.Class(className()),
            h.Style({
              paddingInlineStart: hasIndicator ? '24px' : '0px',
            }),
          ],
          [
            h.span(
              [h.Class(className(styles.description))],
              [step.description],
            ),
          ],
        )

  const compactNameNode = (
    step: StepperStep<Msg>,
    statusText: string | null,
  ): ReadonlyArray<Html> =>
    compact ? [srOnly(step.label), statusTextNode(statusText)] : []

  const interactiveWrap = (
    step: StepperStep<Msg>,
    index: number,
    statusText: string | null,
    extraStyles: ReadonlyArray<StaticStyles>,
    extraAttrs: ReadonlyArray<ReturnType<typeof h.Style>>,
    children: ReadonlyArray<Html | string>,
  ): Html => {
    const isClickable = step.isDisabled !== true && hasStepButtons && !compact
    if (!isClickable) {
      return h.div(
        [h.Class(className(...extraStyles)), ...extraAttrs],
        children,
      )
    }
    return h.button(
      [
        h.Type('button'),
        h.AriaLabel(stepAriaLabel(index, step.label, statusText)),
        h.Class(className(reset.button, styles.interactive, ...extraStyles)),
        ...extraAttrs,
        h.OnClick(props.toParentMessage(Message.ClickedStep({ step: index }))),
      ],
      children,
    )
  }

  const liAttrs = (
    step: StepperStep<Msg>,
    progress: StepperProgress,
    isActive: boolean,
  ) => [
    h.DataAttribute('slot', 'step'),
    h.DataAttribute('progress', progress),
    ...(step.status === undefined
      ? []
      : [h.DataAttribute('status', step.status)]),
    ...(isActive ? [h.AriaCurrent('step')] : []),
  ]

  const li = (index: number): Html => {
    const step = steps[index]!
    const progress = progressFor(index, activeStep)
    const isActive = progress === 'in-progress'
    const statusText = stepStatusText(step.status, progress)
    const indicatorProp = step.indicator ?? 'auto'
    const hasIndicator = !(
      typeof indicatorProp === 'string' && indicatorProp === 'none'
    )
    const isBarFilled = progress !== 'not-started'
    const barTiming = timing(index - 1, 0, 1)

    if (isOnTrack) {
      const beforeFilled = index <= activeStep
      const afterFilled = index < activeStep
      const arrivalShare = isHorizontal
        ? OT_ARRIVAL_SHARE_HORIZONTAL
        : OT_ARRIVAL_SHARE_VERTICAL
      const leavingShare = 1 - arrivalShare
      const hasContentSeg = !isHorizontal && step.content !== undefined
      const railShare =
        leavingShare * (hasContentSeg ? OT_RAIL_SHARE_OF_LEAVING : 1)
      const contentShare = leavingShare - railShare
      const beforeTiming = timing(index - 1, leavingShare, arrivalShare)
      const railTiming = timing(index, 0, railShare)
      const contentTiming = timing(index, railShare, contentShare)
      const fillStyle = isHorizontal
        ? styles.connectorFillH
        : styles.connectorFillV
      const emptyStyle = isHorizontal
        ? styles.connectorEmptyH
        : styles.connectorEmptyV
      const segGapLead = isHorizontal
        ? styles.otSegGapLeadH
        : styles.otSegGapLeadV
      const segGapRail = isHorizontal
        ? styles.otSegGapRailH
        : styles.otSegGapRailV

      const labelLineNode = h.div(
        [
          h.Class(
            className(
              isHorizontal ? styles.otLabelRowCenter : styles.otLabelRowStart,
            ),
          ),
        ],
        [
          h.span(
            [
              h.Class(
                className(styles.label, labelStyle(step, progress, isActive)),
              ),
            ],
            [step.label],
          ),
          statusTextNode(statusText),
          ...optionalNodes(step),
          ...(step.endContent === undefined ? [] : [step.endContent]),
        ],
      )
      const otDescriptionNode =
        step.description === undefined
          ? h.empty
          : h.span([h.Class(className(styles.description))], [step.description])

      const contentChildren =
        step.content === undefined
          ? []
          : Array.isArray(step.content)
            ? [...step.content]
            : [step.content]

      const otContentNode =
        step.content === undefined
          ? []
          : isHorizontal
            ? [
                h.div(
                  [
                    h.Class(className(styles.otContent)),
                    ...(compact ? [h.Hidden(true)] : []),
                  ],
                  contentChildren,
                ),
              ]
            : [
                h.div(
                  [h.Class(className(styles.otContentWrapV))],
                  [
                    h.div(
                      [
                        h.AriaHidden(true),
                        h.DataAttribute('slot', 'step-connector'),
                        h.Class(
                          className(
                            styles.connectorTrack,
                            afterFilled ? fillStyle : emptyStyle,
                            index === stepCount - 1 ? styles.segHidden : null,
                          ),
                        ),
                        h.Style({
                          insetBlock: '0px',
                          insetInlineStart: `calc(${densitySpace}px + (1rem - 0.25rem) / 2)`,
                          position: 'absolute',
                          width: '0.25rem',
                          '--stepper-seg-duration': contentTiming.duration,
                          '--stepper-seg-delay': contentTiming.delay,
                        }),
                      ],
                      [],
                    ),
                    h.div(
                      [
                        h.Class(className(styles.otContent)),
                        h.Style({
                          paddingInlineStart: `calc(${densitySpace}px + 24px)`,
                          paddingInlineEnd: `${densitySpace}px`,
                        }),
                      ],
                      contentChildren,
                    ),
                  ],
                ),
              ]

      if (!isHorizontal) {
        const inner = [
          h.div(
            [
              h.Class(className(styles.otIndicatorColV)),
              h.Style({ marginBlock: `calc(-1 * ${densitySpace}px)` }),
            ],
            [
              h.div(
                [
                  h.AriaHidden(true),
                  h.DataAttribute('slot', 'step-connector'),
                  h.Class(
                    className(
                      styles.connectorTrack,
                      styles.otSegBaseV,
                      hasIndicator && segGapLead,
                      beforeFilled ? fillStyle : emptyStyle,
                      index === 0 ? styles.segHidden : null,
                    ),
                  ),
                  h.Style({
                    height: `${densitySpace}px`,
                    '--stepper-seg-duration': beforeTiming.duration,
                    '--stepper-seg-delay': beforeTiming.delay,
                  }),
                ],
                [],
              ),
              indicatorNode(step, index, progress, isActive),
              h.div(
                [
                  h.AriaHidden(true),
                  h.DataAttribute('slot', 'step-connector'),
                  h.Class(
                    className(
                      styles.connectorTrack,
                      styles.otSegBaseV,
                      styles.otSegFlexV,
                      hasIndicator && segGapRail,
                      afterFilled ? fillStyle : emptyStyle,
                      index === stepCount - 1 ? styles.segHidden : null,
                    ),
                  ),
                  ...timingAttrs(h, railTiming),
                ],
                [],
              ),
            ],
          ),
          h.div(
            [h.Class(className(styles.otBodyV))],
            [labelLineNode, otDescriptionNode],
          ),
        ]
        return h.li(
          [
            ...liAttrs(step, progress, isActive),
            h.Class(className(styles.otVerticalRoot)),
          ],
          [
            interactiveWrap(
              step,
              index,
              statusText,
              [styles.otRowWrap],
              [
                h.Style({
                  paddingBlock: `${densitySpace}px`,
                  paddingInline: `${densitySpace}px`,
                }),
              ],
              inner,
            ),
            ...otContentNode,
          ],
        )
      }

      // horizontal on-track
      const innerH = [
        h.div(
          [h.Class(className(styles.otTrackRowH))],
          [
            h.div(
              [
                h.AriaHidden(true),
                h.DataAttribute('slot', 'step-connector'),
                h.Class(
                  className(
                    styles.connectorTrack,
                    styles.connectorMirrorH,
                    styles.otSegH,
                    hasIndicator && segGapLead,
                    beforeFilled ? fillStyle : emptyStyle,
                    index === 0 ? styles.segHidden : null,
                  ),
                ),
                ...timingAttrs(h, beforeTiming),
              ],
              [],
            ),
            indicatorNode(step, index, progress, isActive),
            h.div(
              [
                h.AriaHidden(true),
                h.DataAttribute('slot', 'step-connector'),
                h.Class(
                  className(
                    styles.connectorTrack,
                    styles.connectorMirrorH,
                    styles.otSegH,
                    hasIndicator && segGapRail,
                    afterFilled ? fillStyle : emptyStyle,
                    index === stepCount - 1 ? styles.segHidden : null,
                  ),
                ),
                ...timingAttrs(h, railTiming),
              ],
              [],
            ),
          ],
        ),
        ...(compact
          ? []
          : [
              h.div(
                [
                  h.Class(className(styles.otLabelWrapH)),
                  h.Style({ marginBlockStart: `${densitySpace}px` }),
                ],
                [labelLineNode, otDescriptionNode],
              ),
            ]),
      ]
      return h.li(
        [
          ...liAttrs(step, progress, isActive),
          h.Class(className(styles.otHorizontalRoot)),
        ],
        [
          interactiveWrap(
            step,
            index,
            statusText,
            [styles.otColWrap],
            [h.Style({ paddingBlock: `${densitySpace}px` })],
            innerH,
          ),
          ...compactNameNode(step, statusText),
          ...otContentNode,
        ],
      )
    }

    // ===== separated =====
    const connectorFill = isHorizontal
      ? isBarFilled
        ? styles.connectorFillH
        : styles.connectorEmptyH
      : isBarFilled
        ? styles.connectorFillV
        : styles.connectorEmptyV

    const summaryContentNode =
      step.content === undefined
        ? []
        : [
            h.div(
              [
                h.Class(className(styles.stepContent)),
                h.Style({
                  paddingInlineStart: `calc(${inlinePad}px + ${hasIndicator ? 24 : 0}px)`,
                  paddingInlineEnd: `${inlinePad}px`,
                }),
                ...(compact ? [h.Hidden(true)] : []),
              ],
              Array.isArray(step.content) ? [...step.content] : [step.content],
            ),
          ]

    if (!isHorizontal) {
      return h.li(
        [
          ...liAttrs(step, progress, isActive),
          h.Class(className(styles.verticalRoot)),
        ],
        [
          h.div(
            [
              h.AriaHidden(true),
              h.DataAttribute('slot', 'step-bar'),
              h.Class(
                className(
                  styles.connectorTrack,
                  styles.verticalBar,
                  connectorFill,
                ),
              ),
              ...timingAttrs(h, barTiming),
            ],
            [],
          ),
          h.div(
            [h.Class(className(styles.verticalBody))],
            [
              interactiveWrap(
                step,
                index,
                statusText,
                [densityStyle(density)],
                [h.Style({ paddingInline: `${inlinePad}px` })],
                [
                  iconLabelNode(step, index, progress, isActive, statusText),
                  descriptionNode(step, hasIndicator),
                ],
              ),
              ...summaryContentNode,
            ],
          ),
        ],
      )
    }

    // separated horizontal
    return h.li(
      [
        ...liAttrs(step, progress, isActive),
        h.Class(className(styles.horizontalStep)),
      ],
      [
        h.div(
          [
            h.AriaHidden(true),
            h.DataAttribute('slot', 'step-bar'),
            h.Class(
              className(
                styles.connectorTrack,
                styles.connectorMirrorH,
                styles.horizontalBar,
                connectorFill,
              ),
            ),
            ...timingAttrs(h, barTiming),
          ],
          [],
        ),
        ...(compact
          ? compactNameNode(step, statusText)
          : [
              interactiveWrap(
                step,
                index,
                statusText,
                [densityStyle(density)],
                [h.Style({ paddingInline: `${inlinePad}px` })],
                [
                  iconLabelNode(step, index, progress, isActive, statusText),
                  descriptionNode(step, hasIndicator),
                ],
              ),
            ]),
        ...summaryContentNode,
      ],
    )
  }

  const adjacentEnabledStep = (delta: -1 | 1): number | undefined => {
    let target: number | undefined
    steps.forEach((step, index) => {
      if (step.isDisabled === true) return
      if (
        delta === -1
          ? index < activeStep && (target === undefined || index > target)
          : index > activeStep && (target === undefined || index < target)
      ) {
        target = index
      }
    })
    return target
  }

  const controlButton = (delta: -1 | 1): Html => {
    const name = delta === -1 ? 'Previous step' : 'Next step'
    const target = adjacentEnabledStep(delta)
    return button<Msg>(
      {
        variant: 'ghost',
        size: 'icon-sm',
        ariaLabel: name,
        isDisabled: target === undefined,
        ...(target === undefined
          ? {}
          : {
              onClick: props.toParentMessage(
                Message.ClickedStep({ step: target }),
              ),
            }),
        leadingIcon: Icon.icon(
          delta === -1 ? 'chevron-left' : 'chevron-right',
          { class: className(styles.iconSvg) },
          h,
        ),
        children: [],
      },
      h,
    )
  }

  const showsControls =
    collapsedVariant === 'withLabelAndControls' && hasStepButtons
  const showsSummary = compact && collapsedVariant !== 'hiddenLabel'

  const active = steps[activeStep]
  const summaryNode = (): Html => {
    if (active === undefined) return h.empty
    const progress = progressFor(activeStep, activeStep)
    const statusText = stepStatusText(active.status, progress)
    return h.div(
      [h.AriaHidden(true), h.Class(className(styles.summaryBody))],
      [
        iconLabelNode(active, activeStep, progress, true, statusText),
        ...(active.description === undefined
          ? []
          : [
              h.span(
                [h.Class(className(styles.description))],
                [active.description],
              ),
            ]),
      ],
    )
  }

  const olChildren = steps.map((_, index) => li(index))

  const olAttrs = [
    h.DataAttribute('slot', 'stepper'),
    h.DataAttribute('orientation', orientation),
    h.DataAttribute('indicator-position', isOnTrack ? 'on-track' : 'separated'),
    h.AriaLabel(label),
    h.Style({ '--step-connector-gap': '0px' }),
    h.Class(
      className(
        styles.root,
        isHorizontal
          ? isOnTrack
            ? styles.horizontalOnTrack
            : styles.horizontal
          : isOnTrack
            ? styles.verticalOnTrack
            : styles.vertical,
        ...(!isHorizontal && props.layoutStyle !== undefined
          ? [props.layoutStyle]
          : []),
      ),
    ),
  ]

  const list = h.ol(
    isHorizontal
      ? [...olAttrs, h.OnMount(rootMount(props.toParentMessage))]
      : olAttrs,
    olChildren,
  )

  if (!isHorizontal) return list

  return h.div(
    [
      h.DataAttribute('slot', 'stepper-frame'),
      h.Style({ '--step-connector-gap': '0px' }),
      h.Class(className(styles.frame, props.layoutStyle)),
    ],
    [
      list,
      ...(showsSummary
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'stepper-summary'),
                h.Class(className(styles.summary)),
              ],
              [
                showsControls ? controlButton(-1) : h.empty,
                summaryNode(),
                showsControls ? controlButton(1) : h.empty,
              ],
            ),
          ]
        : []),
    ],
  )
}
