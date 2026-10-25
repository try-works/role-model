/* Ported from Meta Astryx Stepper (packages/core/src/Stepper/Stepper.tsx, Step.tsx) — examples and visual spec adapted to Crease UI tokens. */

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
import { cn } from '@/lib/utils'
import { button } from '@/ui/button'

export { Message, Model, init, update }
export type { OutMessage }

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
  class?: string
}>

const SR_ONLY = 'sr-only'
const CONNECTOR_CLIP_EXPR = 'max(0px,min(var(--step-connector-gap,0px),8px))'

const CONNECTOR_TRACK_CLASS =
  'relative bg-border before:absolute before:inset-0 before:rounded-[inherit] before:bg-primary before:transition-[transform] before:ease-linear before:duration-[var(--stepper-seg-duration,0s)] before:delay-[var(--stepper-seg-delay,0s)] motion-reduce:before:duration-[0s] motion-reduce:before:delay-[0s]'

const FILL_V = 'before:origin-top'
const FILL_H = 'before:origin-left rtl:before:origin-right'
const SCALE_V = (filled: boolean): string =>
  filled ? 'before:scale-y-100' : 'before:scale-y-0'
const SCALE_H = (filled: boolean): string =>
  filled ? 'before:scale-x-100' : 'before:scale-x-0'

const ICON_LABEL_ROW_CLASS = 'flex min-w-0 flex-row items-center gap-2'
const LABEL_CLASS =
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-5 font-normal text-foreground'
const OPTIONAL_CLASS = 'text-sm text-muted-foreground'
const DESCRIPTION_CLASS = 'block text-xs leading-4 text-muted-foreground'
const STEP_CONTENT_CLASS = 'pt-2'

const INDICATOR_BOX_CLASS = 'flex size-4 shrink-0 items-center justify-center'
const NUMBER_BADGE_CLASS =
  'grid size-4 shrink-0 place-items-center rounded-full text-center text-[10px] font-semibold'

const INTERACTIVE_STEP_CLASS =
  'm-0 box-border flex w-full cursor-pointer appearance-none flex-col items-stretch rounded-lg border-0 bg-transparent p-0 [font-family:inherit] [font-size:inherit] [line-height:inherit] text-start outline-hidden transition-colors duration-150 ease-in-out hover:bg-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default'

const DENSITY_BLOCK_CLASS: Readonly<Record<StepperDensity, string>> = {
  compact: 'py-1',
  balanced: 'py-2',
  spacious: 'py-3',
}
const DENSITY_PAD_CLASS: Readonly<Record<StepperDensity, string>> = {
  compact: 'p-1',
  balanced: 'p-2',
  spacious: 'p-3',
}
const DENSITY_INLINE_CLASS: Readonly<Record<'dense' | 'spacious', string>> = {
  dense: 'px-2',
  spacious: 'px-3',
}

const timingAttrs = <Msg>(
  h: HtmlBuilder<Msg>,
  timing: StepperTiming,
): ReadonlyArray<ReturnType<typeof h.Style>> => [
  h.Style({
    '--stepper-seg-duration': timing.duration,
    '--stepper-seg-delay': timing.delay,
  }),
]

const densityBlockPadding = (density: StepperDensity): number =>
  density === 'compact' ? 4 : density === 'spacious' ? 12 : 8
const separatedInlinePadding = (density: StepperDensity): number =>
  density === 'spacious' ? 12 : 8

type StepColor = 'completed' | 'in-progress' | 'not-started' | 'disabled'

const iconTintClass = (
  progress: StepperProgress,
  status: StepperStatus | undefined,
  isDisabled: boolean,
  hasStatusGlyph: boolean,
): string => {
  if (isDisabled) return 'text-muted-foreground opacity-50'
  if (hasStatusGlyph)
    return status === 'success'
      ? 'text-success'
      : status === 'warning'
        ? 'text-warning'
        : status === 'error'
          ? 'text-destructive'
          : 'text-primary'
  if (status === 'accent') return 'text-primary'
  if (status === 'success') return 'text-success'
  if (status === 'warning') return 'text-warning'
  if (status === 'error') return 'text-destructive'
  return progress === 'not-started' ? 'text-muted-foreground' : 'text-primary'
}

const numberBadgeColorClass = (
  progress: StepperProgress,
  status: StepperStatus | undefined,
  isDisabled: boolean,
): string => {
  if (isDisabled) return 'bg-muted text-muted-foreground opacity-50'
  const isReached = progress !== 'not-started'
  if (isReached && status === 'accent')
    return 'bg-primary text-primary-foreground'
  if (isReached && status === 'success')
    return 'bg-success text-primary-foreground'
  if (isReached && status === 'warning')
    return 'bg-warning text-secondary-foreground'
  if (isReached && status === 'error')
    return 'bg-destructive text-primary-foreground'
  if (progress === 'completed' || progress === 'in-progress')
    return 'bg-primary text-primary-foreground'
  return 'bg-muted text-muted-foreground'
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
  const densitySpace = densityBlockPadding(density)
  const inlinePad = separatedInlinePadding(density)

  const densityClass = DENSITY_BLOCK_CLASS[density]
  const rowPadClass = DENSITY_PAD_CLASS[density]
  const inlinePadClass =
    DENSITY_INLINE_CLASS[density === 'spacious' ? 'spacious' : 'dense']

  const timing = (spanIndex: number, offset: number, share: number) =>
    fillTiming(isSingleAdvance, animatedSpan, spanIndex, offset, share)

  const srOnly = (text: string): Html => h.span([h.Class(SR_ONLY)], [text])

  const statusGlyphIcon = (
    step: StepperStep<Msg>,
    progress: StepperProgress,
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
    const statusGlyph = statusGlyphIcon(
      step,
      progress,
      isActive,
      indicatorMode,
      custom,
    )
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
            cn(
              NUMBER_BADGE_CLASS,
              numberBadgeColorClass(progress, step.status, isDisabled),
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
          ? Icon.icon('circle-check', { class: 'size-4' }, h)
          : statusGlyph === 'warning'
            ? Icon.icon('triangle-alert', { class: 'size-4' }, h)
            : statusGlyph === 'error'
              ? Icon.icon('circle-x', { class: 'size-4' }, h)
              : progress === 'completed'
                ? Icon.icon('circle-check', { class: 'size-4' }, h)
                : Icon.icon('circle-dot', { class: 'size-4' }, h)
    return h.div(
      [
        h.AriaHidden(true),
        h.Class(
          cn(
            INDICATOR_BOX_CLASS,
            iconTintClass(
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

  const labelColorClass = (
    step: StepperStep<Msg>,
    progress: StepperProgress,
    isActive: boolean,
  ): string =>
    step.isDisabled === true
      ? 'text-muted-foreground/60'
      : progress === 'not-started'
        ? 'text-muted-foreground'
        : isActive
          ? 'font-semibold'
          : ''

  const optionalNodes = (
    step: StepperStep<Msg>,
  ): ReadonlyArray<Html | string> =>
    step.isOptional === true
      ? [
          h.span([h.Class(OPTIONAL_CLASS)], ['•']),
          h.span([h.Class(OPTIONAL_CLASS)], ['Optional']),
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
      [h.Class(ICON_LABEL_ROW_CLASS)],
      [
        ...(compact && isOnTrack
          ? []
          : [indicatorNode(step, index, progress, isActive)]),
        h.span(
          [h.Class(cn(LABEL_CLASS, labelColorClass(step, progress, isActive)))],
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
            h.Style({
              paddingInlineStart: hasIndicator ? '24px' : '0px',
            }),
          ],
          [h.span([h.Class(DESCRIPTION_CLASS)], [step.description])],
        )

  const contentIndentStyle = (hasIndicator: boolean) => ({
    paddingInlineStart: `calc(${inlinePad}px + ${hasIndicator ? '24px' : '0px'})`,
    paddingInlineEnd: `${inlinePad}px`,
  })

  const compactNameNode = (
    step: StepperStep<Msg>,
    statusText: string | null,
  ): ReadonlyArray<Html> =>
    compact ? [srOnly(step.label), statusTextNode(statusText)] : []

  const interactiveWrap = (
    step: StepperStep<Msg>,
    index: number,
    statusText: string | null,
    extraClass: string,
    children: ReadonlyArray<Html | string>,
  ): Html => {
    const isClickable = step.isDisabled !== true && hasStepButtons && !compact
    if (!isClickable) {
      return h.div([h.Class(extraClass)], children)
    }
    return h.button(
      [
        h.Type('button'),
        h.AriaLabel(stepAriaLabel(index, step.label, statusText)),
        h.Class(cn(INTERACTIVE_STEP_CLASS, extraClass)),
        h.OnClick(props.toParentMessage(Message.ClickedStep({ step: index }))),
      ],
      children,
    )
  }

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
    const isDisabled = step.isDisabled === true

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
      const fillScale = isHorizontal ? SCALE_H : SCALE_V
      const fillOrigin = isHorizontal ? FILL_H : FILL_V
      const segClass = isHorizontal
        ? 'h-1 min-w-2 flex-1 rounded-none'
        : 'w-1 shrink-0 rounded-none'

      const leadClipClass = isHorizontal
        ? '[clip-path:inset(0_var(--stepper-clip)_0_0)] rtl:[clip-path:inset(0_0_0_var(--stepper-clip))]'
        : '[clip-path:inset(0_0_var(--stepper-clip)_0)]'
      const railClipClass = isHorizontal
        ? '[clip-path:inset(0_0_0_var(--stepper-clip))] rtl:[clip-path:inset(0_var(--stepper-clip)_0_0)]'
        : '[clip-path:inset(var(--stepper-clip)_0_0_0)]'

      const labelLineNode = h.div(
        [
          h.Class(
            isHorizontal
              ? 'flex flex-row flex-wrap items-center justify-center gap-1'
              : 'flex flex-row items-center gap-2',
          ),
        ],
        [
          h.span(
            [
              h.Class(
                cn(LABEL_CLASS, labelColorClass(step, progress, isActive)),
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
          : h.span([h.Class(DESCRIPTION_CLASS)], [step.description])

      const otContentNode =
        step.content === undefined
          ? []
          : isHorizontal
            ? [
                h.div(
                  [
                    h.Class(STEP_CONTENT_CLASS),
                    ...(compact ? [h.Hidden(true)] : []),
                  ],
                  Array.isArray(step.content)
                    ? [...step.content]
                    : [step.content],
                ),
              ]
            : [
                h.div(
                  [h.Class('relative')],
                  [
                    h.div(
                      [
                        h.AriaHidden(true),
                        h.DataAttribute('slot', 'step-connector'),
                        h.Class(
                          cn(
                            CONNECTOR_TRACK_CLASS,
                            'absolute inset-y-0 w-1 rounded-none',
                            fillOrigin,
                            fillScale(afterFilled),
                            index === stepCount - 1 ? 'invisible' : '',
                          ),
                        ),
                        h.Style({
                          insetInlineStart: `calc(${densitySpace}px + (16px - 4px) / 2)`,
                          '--stepper-seg-duration': contentTiming.duration,
                          '--stepper-seg-delay': contentTiming.delay,
                        }),
                      ],
                      [],
                    ),
                    h.div(
                      [
                        h.Class('pt-2'),
                        h.Style({
                          paddingInlineStart: `calc(${densitySpace}px + 24px)`,
                          paddingInlineEnd: `${densitySpace}px`,
                        }),
                      ],
                      Array.isArray(step.content)
                        ? [...step.content]
                        : [step.content],
                    ),
                  ],
                ),
              ]

      if (!isHorizontal) {
        const inner = [
          h.div(
            [
              h.Class('flex w-4 shrink-0 flex-col items-center self-stretch'),
              h.Style({ marginBlock: `calc(-1 * ${densitySpace}px)` }),
            ],
            [
              h.div(
                [
                  h.AriaHidden(true),
                  h.DataAttribute('slot', 'step-connector'),
                  h.Class(
                    cn(
                      CONNECTOR_TRACK_CLASS,
                      segClass,
                      hasIndicator ? leadClipClass : '',
                      fillOrigin,
                      fillScale(beforeFilled),
                      index === 0 ? 'invisible' : '',
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
                    cn(
                      CONNECTOR_TRACK_CLASS,
                      segClass,
                      'min-h-2 flex-1',
                      hasIndicator ? railClipClass : '',
                      fillOrigin,
                      fillScale(afterFilled),
                      index === stepCount - 1 ? 'invisible' : '',
                    ),
                  ),
                  ...timingAttrs(h, railTiming),
                ],
                [],
              ),
            ],
          ),
          h.div(
            [h.Class('flex min-w-0 flex-1 flex-col gap-0.5 justify-start')],
            [labelLineNode, otDescriptionNode],
          ),
        ]
        return h.li(
          [
            h.DataAttribute('slot', 'step'),
            h.DataAttribute('progress', progress),
            ...(step.status === undefined
              ? []
              : [h.DataAttribute('status', step.status)]),
            ...(isActive ? [h.AriaCurrent('step')] : []),
            h.Class('relative flex flex-col'),
          ],
          [
            interactiveWrap(
              step,
              index,
              statusText,
              cn('flex w-full flex-row items-stretch gap-2', rowPadClass),
              inner,
            ),
            ...otContentNode,
          ],
        )
      }

      // horizontal on-track
      const innerH = [
        h.div(
          [h.Class('flex w-full flex-row items-center')],
          [
            h.div(
              [
                h.AriaHidden(true),
                h.DataAttribute('slot', 'step-connector'),
                h.Class(
                  cn(
                    CONNECTOR_TRACK_CLASS,
                    segClass,
                    hasIndicator ? leadClipClass : '',
                    fillOrigin,
                    fillScale(beforeFilled),
                    index === 0 ? 'invisible' : '',
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
                  cn(
                    CONNECTOR_TRACK_CLASS,
                    segClass,
                    hasIndicator ? railClipClass : '',
                    fillOrigin,
                    fillScale(afterFilled),
                    index === stepCount - 1 ? 'invisible' : '',
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
                  h.Class('flex flex-col items-stretch gap-0.5 text-center'),
                  h.Style({ marginBlockStart: `${densitySpace}px` }),
                ],
                [labelLineNode, otDescriptionNode],
              ),
            ]),
      ]
      return h.li(
        [
          h.DataAttribute('slot', 'step'),
          h.DataAttribute('progress', progress),
          ...(step.status === undefined
            ? []
            : [h.DataAttribute('status', step.status)]),
          ...(isActive ? [h.AriaCurrent('step')] : []),
          h.Class('flex min-w-0 flex-1 flex-col'),
        ],
        [
          interactiveWrap(
            step,
            index,
            statusText,
            cn('flex w-full flex-col items-stretch', densityClass),
            innerH,
          ),
          ...compactNameNode(step, statusText),
          ...otContentNode,
        ],
      )
    }

    // ===== separated =====
    const connectorFill = isHorizontal
      ? cn(FILL_H, SCALE_H(isBarFilled))
      : cn(FILL_V, SCALE_V(isBarFilled))

    const summaryContentNode =
      step.content === undefined
        ? []
        : [
            h.div(
              [
                h.Class(STEP_CONTENT_CLASS),
                h.Style(contentIndentStyle(hasIndicator)),
                ...(compact ? [h.Hidden(true)] : []),
              ],
              Array.isArray(step.content) ? [...step.content] : [step.content],
            ),
          ]

    if (!isHorizontal) {
      return h.li(
        [
          h.DataAttribute('slot', 'step'),
          h.DataAttribute('progress', progress),
          ...(step.status === undefined
            ? []
            : [h.DataAttribute('status', step.status)]),
          ...(isActive ? [h.AriaCurrent('step')] : []),
          h.Class('relative flex flex-row items-stretch gap-0.5'),
        ],
        [
          h.div(
            [
              h.AriaHidden(true),
              h.DataAttribute('slot', 'step-bar'),
              h.Class(
                cn(
                  CONNECTOR_TRACK_CLASS,
                  'w-1 shrink-0 self-stretch rounded-full',
                  connectorFill,
                ),
              ),
              ...timingAttrs(h, barTiming),
            ],
            [],
          ),
          h.div(
            [h.Class('flex flex-1 flex-col')],
            [
              interactiveWrap(
                step,
                index,
                statusText,
                cn(densityClass, inlinePadClass),
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
        h.DataAttribute('slot', 'step'),
        h.DataAttribute('progress', progress),
        ...(step.status === undefined
          ? []
          : [h.DataAttribute('status', step.status)]),
        ...(isActive ? [h.AriaCurrent('step')] : []),
        h.Class('flex min-w-0 flex-1 flex-col items-stretch'),
      ],
      [
        h.div(
          [
            h.AriaHidden(true),
            h.DataAttribute('slot', 'step-bar'),
            h.Class(
              cn(
                CONNECTOR_TRACK_CLASS,
                'mb-0.5 h-1 w-full shrink-0 rounded-full',
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
                cn(densityClass, inlinePadClass),
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
          {},
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
      [
        h.AriaHidden(true),
        h.Class('flex min-w-0 grow flex-col items-center gap-0.5 text-center'),
      ],
      [
        iconLabelNode(active, activeStep, progress, true, statusText),
        ...(active.description === undefined
          ? []
          : [h.span([h.Class(DESCRIPTION_CLASS)], [active.description])]),
      ],
    )
  }

  const olChildren = steps.map((_, index) => li(index))

  const olAttrs = [
    h.DataAttribute('slot', 'stepper'),
    h.DataAttribute('orientation', orientation),
    h.DataAttribute('indicator-position', isOnTrack ? 'on-track' : 'separated'),
    h.AriaLabel(label),
    h.Style({
      '--step-connector-gap': '0px',
      '--stepper-clip': CONNECTOR_CLIP_EXPR,
    }),
    h.Class(
      cn(
        'flex w-full list-none p-0 m-0',
        isHorizontal ? 'flex-row items-start' : 'flex-col',
        isOnTrack ? 'gap-0' : 'gap-1',
        isHorizontal ? '' : props.class,
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
      h.Class(cn('flex w-full flex-col gap-0', props.class)),
    ],
    [
      list,
      ...(showsSummary
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'stepper-summary'),
                h.Class('flex items-center justify-between gap-2 min-w-0'),
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
