import type { Update } from 'foldkit'
import { Effect, Option, Queue, Schema as S, Stream } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import { Dialog } from '@foldkit/ui'

/* Renderer-neutral state + pure geometry for the Drawer, ported from Base
   UI's drawer (base-ui/packages/react/src/drawer/**): a Dialog submodel plus
   a swipe engine with direction-aware displacement, square-root edge
   damping, velocity-weighted release decisions, snap points, sequential
   snapping, and nested-drawer stack tracking. The DOM-facing messages are
   emitted by pointer handlers + ResizeObserver/MutationObserver mounts in
   the view layer; every release decision is a pure function so the scene
   suite can drive the exact Base UI semantics. */

// ——— Constants (base-ui DrawerViewport/useSwipeDismiss values)

/** A drag shorter than this counts as a rest, not a swipe. */
export const MIN_SWIPE_THRESHOLD = 10
/** Release velocity (px/ms) above which the gesture always dismisses. */
export const FAST_SWIPE_VELOCITY = 0.5
/** Velocity magnitude that activates the 300ms snap projection. */
export const SNAP_VELOCITY_THRESHOLD = 0.5
/** Milliseconds of movement the snap target projection simulates. */
export const SNAP_VELOCITY_MULTIPLIER = 300
export const MAX_SNAP_VELOCITY = 4
export const MIN_SWIPE_RELEASE_VELOCITY = 0.2
export const MAX_SWIPE_RELEASE_VELOCITY = 4
export const MIN_SWIPE_RELEASE_DURATION_MS = 80
export const MAX_SWIPE_RELEASE_DURATION_MS = 360
export const MIN_SWIPE_RELEASE_SCALAR = 0.1
export const MAX_SWIPE_RELEASE_SCALAR = 1
/** Whole-gesture velocity floor so a tap-release doesn't explode velocity. */
const MIN_VELOCITY_DURATION_MS = 50
/** Minimum sample window when deriving release velocity (px/ms). */
const MIN_RELEASE_VELOCITY_DURATION_MS = 4
/** A drag sample older than this at release is ignored (stale velocity). */
const MAX_RELEASE_VELOCITY_AGE_MS = 80
/** Sub-pixel sample movement is treated as stationary. */
const MIN_VELOCITY_SAMPLE_DISTANCE = 1

// ——— Public shapes

/** Direction the drawer dismisses toward. `swipeDirection` in Base UI. */
export const SwipeDirection = S.Literals(['down', 'up', 'left', 'right'])
export type SwipeDirection = typeof SwipeDirection.Type

/** A snap point: a number ≤ 1 is a fraction of the viewport, a number > 1 is
    px, and a string is a `'NNNpx'` / `'NNrem'` length. */
export const SnapPoint = S.Union([S.Number, S.String])
export type SnapPoint = typeof SnapPoint.Type

/** `true` traps focus with an overlay, `false` keeps the page interactive,
    `'trap-focus'` keeps the overlay without page isolation. */
export const Modal = S.Union([S.Boolean, S.Literal('trap-focus')])
export type Modal = typeof Modal.Type

export const SwipePhase = S.Literals(['Idle', 'Swiping'])
export type SwipePhase = typeof SwipePhase.Type

/** Last moving drag sample — the release-velocity source in Base UI. */
export const DragSample = S.Struct({
  x: S.Number,
  y: S.Number,
  timeStamp: S.Number,
})
export type DragSample = typeof DragSample.Type

/** Ongoing swipe gesture. Positions are pointer client coordinates; the
    stored deltas are the *damped* offsets Base UI renders with. */
export const SwipeState = S.Struct({
  phase: SwipePhase,
  startX: S.Number,
  startY: S.Number,
  deltaX: S.Number,
  deltaY: S.Number,
  startTimeStamp: S.Number,
  lastSample: S.Option(DragSample),
  lastVelocityX: S.Number,
  lastVelocityY: S.Number,
  hasStationarySample: S.Boolean,
})
export type SwipeState = typeof SwipeState.Type

const idleSwipe: SwipeState = {
  phase: 'Idle',
  startX: 0,
  startY: 0,
  deltaX: 0,
  deltaY: 0,
  startTimeStamp: 0,
  lastSample: Option.none(),
  lastVelocityX: 0,
  lastVelocityY: 0,
  hasStationarySample: false,
}

export const Model = S.Struct({
  dialog: Dialog.Model,
  swipeDirection: SwipeDirection,
  snapPoints: S.Array(SnapPoint),
  snapToSequentialPoints: S.Boolean,
  modal: Modal,
  disablePointerDismissal: S.Boolean,
  activeSnapPoint: S.Option(S.Union([S.Number, S.String])),
  /** Snap point `open` restores on each open (null = first snap point). */
  defaultSnapPoint: S.Option(S.Union([S.Number, S.String])),
  popupWidth: S.Number,
  popupHeight: S.Number,
  viewportWidth: S.Number,
  viewportHeight: S.Number,
  rootFontSize: S.Number,
  swipe: SwipeState,
  /** 0..1 — drives overlay opacity and the parent stack lift. */
  swipeProgress: S.Number,
  /** Release-speed scalar (0.1–1) while a swipe dismissal animates out. */
  swipeStrength: S.Option(S.Number),
  /** True while the popup is being dismissed by a swipe. */
  swipeDismissed: S.Boolean,
  /** Open nested drawers keyed by drawer id → frontmost child height. */
  nestedDrawerHeights: S.Record(S.String, S.Number),
  /** A nested drawer is mid-swipe (parent shrinks instantly). */
  nestedSwiping: S.Boolean,
  /** Latest nested swipe progress a child reported (0..1). */
  nestedSwipeProgress: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotDrawerDialogMessage: { message: Dialog.Message },
  /** Pointer went down on the viewport outside ignored/content targets. */
  StartedSwipe: {
    x: S.Number,
    y: S.Number,
    timeStamp: S.Number,
  },
  DraggedSwipe: { x: S.Number, y: S.Number, timeStamp: S.Number },
  EndedSwipe: { x: S.Number, y: S.Number, timeStamp: S.Number },
  CancelledSwipe: {},
  /** ResizeObserver on the popup element. */
  MeasuredPopup: { width: S.Number, height: S.Number },
  /** ResizeObserver on the viewport element + root font size for `rem`. */
  MeasuredViewport: {
    width: S.Number,
    height: S.Number,
    rootFontSize: S.Number,
  },
  /** DOM observer watching nested `[data-slot="drawer-popup"]` children. */
  NestedDrawersChanged: {
    count: S.Number,
    frontmostHeight: S.Number,
    swiping: S.Boolean,
    progress: S.Number,
  },
  /** Programmatic snap-point change (e.g. a snap option button). */
  RequestedSnapPoint: { snapPoint: S.Union([S.Number, S.String]) },
})
export type Message = typeof Message.Type
export const OutMessage = Dialog.OutMessage
export type OutMessage = typeof OutMessage.Type

export type InitConfig = Dialog.InitConfig &
  Readonly<{
    swipeDirection?: SwipeDirection
    snapPoints?: ReadonlyArray<SnapPoint>
    defaultSnapPoint?: SnapPoint | null
    snapToSequentialPoints?: boolean
    modal?: Modal
    disablePointerDismissal?: boolean
  }>

export const init = (config: InitConfig): Model => {
  const snapPoints = config.snapPoints ?? []
  const defaultSnapPoint =
    config.defaultSnapPoint !== undefined
      ? config.defaultSnapPoint
      : (snapPoints[0] ?? null)
  return {
    dialog: Dialog.init(config),
    swipeDirection: config.swipeDirection ?? 'down',
    snapPoints: [...snapPoints],
    snapToSequentialPoints: config.snapToSequentialPoints ?? false,
    modal: config.modal ?? true,
    disablePointerDismissal: config.disablePointerDismissal ?? false,
    activeSnapPoint:
      defaultSnapPoint === null ? Option.none() : Option.some(defaultSnapPoint),
    defaultSnapPoint:
      defaultSnapPoint === null ? Option.none() : Option.some(defaultSnapPoint),
    popupWidth: 0,
    popupHeight: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    rootFontSize: 16,
    swipe: idleSwipe,
    swipeProgress: 0,
    swipeStrength: Option.none(),
    swipeDismissed: false,
    nestedDrawerHeights: {},
    nestedSwiping: false,
    nestedSwipeProgress: 0,
  }
}

// ——— Pure geometry (ported from useSwipeDismiss / useDrawerSnapPoints)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Signed pointer displacement along a swipe direction. */
export const getDisplacement = (
  direction: SwipeDirection,
  deltaX: number,
  deltaY: number,
): number => {
  switch (direction) {
    case 'up':
      return -deltaY
    case 'down':
      return deltaY
    case 'left':
      return -deltaX
    case 'right':
      return deltaX
  }
}

/** Snap-point drag: movement past the fully-open edge is square-root damped. */
export const getSnapPointSwipeMovement = (
  baseOffset: number,
  movementValue: number,
): number => {
  const nextOffset = baseOffset + movementValue
  if (nextOffset >= 0) return movementValue
  return -Math.sqrt(-nextOffset) - baseOffset
}

const sqrtDamp = (value: number): number =>
  Math.sign(value) * Math.abs(value) ** 0.5

/** Directions the gesture may travel: snap-point drawers on the vertical
    axis can also drag toward the opposite edge to reach taller snaps. */
export const swipeDirectionsFor = (
  swipeDirection: SwipeDirection,
  snapPoints: ReadonlyArray<SnapPoint>,
): ReadonlyArray<SwipeDirection> =>
  snapPoints.length > 0 &&
  (swipeDirection === 'down' || swipeDirection === 'up')
    ? [swipeDirection, swipeDirection === 'down' ? 'up' : 'down']
    : [swipeDirection]

/** Base UI's off-axis / over-edge drag damping: free travel toward allowed
    directions, sqrt damping everywhere else. */
export const applyDirectionalDamping = (
  directions: ReadonlyArray<SwipeDirection>,
  deltaX: number,
  deltaY: number,
): Readonly<{ x: number; y: number }> => {
  const allowLeft = directions.includes('left')
  const allowRight = directions.includes('right')
  const allowUp = directions.includes('up')
  const allowDown = directions.includes('down')
  const hasHorizontal = allowLeft || allowRight
  const hasVertical = allowUp || allowDown
  const dampAxis = (
    delta: number,
    allowNegative: boolean,
    allowPositive: boolean,
  ): number =>
    (!allowNegative && delta < 0) || (!allowPositive && delta > 0)
      ? sqrtDamp(delta)
      : delta
  return {
    x: hasHorizontal
      ? dampAxis(deltaX, allowLeft, allowRight)
      : sqrtDamp(deltaX),
    y: hasVertical ? dampAxis(deltaY, allowUp, allowDown) : sqrtDamp(deltaY),
  }
}

/** Resolves one snap point to px: fractions of the viewport, px, or rem. */
export const resolveSnapPointValue = (
  snapPoint: SnapPoint,
  viewportSize: number,
  rootFontSize: number,
): number | null => {
  if (!Number.isFinite(viewportSize) || viewportSize <= 0) return null
  if (typeof snapPoint === 'number') {
    if (!Number.isFinite(snapPoint)) return null
    if (snapPoint <= 1) return clamp(snapPoint, 0, 1) * viewportSize
    return snapPoint
  }
  const trimmed = snapPoint.trim()
  if (trimmed.endsWith('px')) {
    const value = Number.parseFloat(trimmed)
    return Number.isFinite(value) ? value : null
  }
  if (trimmed.endsWith('rem')) {
    const value = Number.parseFloat(trimmed)
    return Number.isFinite(value) ? value * rootFontSize : null
  }
  return null
}

export type ResolvedSnapPoint = Readonly<{
  value: SnapPoint
  height: number
  offset: number
}>

/** Resolves configured snap points against the measured popup + viewport.
    Heights clamp to min(popup, viewport); offsets are distance below the
    fully-open edge; duplicate heights within 1px collapse (later wins? —
    Base UI keeps the earlier declaration: it scans back-to-front and keeps
    the last-indexed of each height). */
export const resolveSnapPoints = (
  snapPoints: ReadonlyArray<SnapPoint>,
  popupHeight: number,
  viewportHeight: number,
  rootFontSize: number,
): ReadonlyArray<ResolvedSnapPoint> => {
  if (snapPoints.length === 0 || viewportHeight <= 0 || popupHeight <= 0) {
    return []
  }
  const maxHeight = Math.min(popupHeight, viewportHeight)
  const resolved: ResolvedSnapPoint[] = []
  for (const value of snapPoints) {
    const resolvedHeight = resolveSnapPointValue(
      value,
      viewportHeight,
      rootFontSize,
    )
    if (resolvedHeight === null) continue
    const clampedHeight = clamp(resolvedHeight, 0, maxHeight)
    resolved.push({
      value,
      height: clampedHeight,
      offset: Math.max(0, popupHeight - clampedHeight),
    })
  }
  if (resolved.length <= 1) return resolved
  const deduped: ResolvedSnapPoint[] = []
  const seenHeights: number[] = []
  for (let index = resolved.length - 1; index >= 0; index -= 1) {
    const point = resolved[index]
    if (point === undefined) continue
    if (seenHeights.some(height => Math.abs(height - point.height) <= 1))
      continue
    seenHeights.push(point.height)
    deduped.push(point)
  }
  deduped.reverse()
  return deduped
}

/** Index of the value closest to `target`, or -1 for an empty list. */
export const closestSnapPointIndex = (
  values: ReadonlyArray<number>,
  target: number,
): number => {
  let closestIndex = -1
  let closestDistance = Infinity
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === undefined) continue
    const distance = Math.abs(value - target)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  }
  return closestIndex
}

/** The active snap point resolved to a measured offset. Falls back to the
    closest resolved point when the configured value isn't in the list —
    Base UI's uncontrolled resolution. */
export const resolveActiveSnapPoint = (
  activeSnapPoint: Option.Option<SnapPoint>,
  resolvedSnapPoints: ReadonlyArray<ResolvedSnapPoint>,
  popupHeight: number,
  viewportHeight: number,
  rootFontSize: number,
): ResolvedSnapPoint | undefined => {
  if (Option.isNone(activeSnapPoint)) return undefined
  const active = activeSnapPoint.value
  const exactMatch = resolvedSnapPoints.find(point =>
    Object.is(point.value, active),
  )
  if (exactMatch !== undefined) return exactMatch
  const resolvedHeight = resolveSnapPointValue(
    active,
    viewportHeight,
    rootFontSize,
  )
  if (resolvedHeight === null) return undefined
  const clampedHeight = clamp(
    resolvedHeight,
    0,
    Math.min(popupHeight, viewportHeight),
  )
  return resolvedSnapPoints[
    closestSnapPointIndex(
      resolvedSnapPoints.map(point => point.height),
      clampedHeight,
    )
  ]
}

/** Offset of the active snap point (0 when snapped fully open / unset). */
export const activeSnapPointOffset = (model: Model): number | null => {
  if (model.snapPoints.length === 0) return null
  const resolved = resolveSnapPoints(
    model.snapPoints,
    model.popupHeight,
    model.viewportHeight,
    model.rootFontSize,
  )
  return (
    resolveActiveSnapPoint(
      model.activeSnapPoint,
      resolved,
      model.popupHeight,
      model.viewportHeight,
      model.rootFontSize,
    )?.offset ?? null
  )
}

export type SnapPointRange = Readonly<{ minOffset: number; range: number }>

/** Progress range across the two smallest snap offsets — only meaningful
    with at least two distinct snaps on a vertical drawer. */
export const snapPointRange = (model: Model): SnapPointRange | null => {
  if (
    model.snapPoints.length < 2 ||
    (model.swipeDirection !== 'down' && model.swipeDirection !== 'up')
  ) {
    return null
  }
  const resolved = resolveSnapPoints(
    model.snapPoints,
    model.popupHeight,
    model.viewportHeight,
    model.rootFontSize,
  )
  if (resolved.length < 2) return null
  const offsets = resolved.map(point => point.offset).sort((a, b) => a - b)
  const minOffset = offsets[0] ?? 0
  const nextOffset = offsets[1] ?? minOffset
  return { minOffset, range: nextOffset - minOffset }
}

/** Popup dimension along the swipe axis — the Base UI "swipe size". */
export const swipeSizeFor = (model: Model): number =>
  model.swipeDirection === 'left' || model.swipeDirection === 'right'
    ? model.popupWidth
    : model.popupHeight

/** Size-based dismiss threshold: half the popup, floored at 10px. */
export const swipeThresholdFor = (size: number): number =>
  Math.max(size * 0.5, MIN_SWIPE_THRESHOLD)

/** Release scalar (0.1–1) that scales the ending transition duration — Base
    UI's resolveSwipeRelease. `null` when the release wasn't swipe-driven. */
export const resolveSwipeStrength = (args: {
  size: number
  snapPointBaseOffset: number
  direction: SwipeDirection
  deltaX: number
  deltaY: number
  velocityX: number
  velocityY: number
  releaseVelocityX: number
  releaseVelocityY: number
}): number | null => {
  const { size } = args
  if (size <= 0) return null
  const translationAlongDirection =
    args.snapPointBaseOffset +
    getDisplacement(args.direction, args.deltaX, args.deltaY)
  const remainingDistance = Math.max(0, size - translationAlongDirection)
  if (remainingDistance <= 0) return null
  const releaseVelocity = getDisplacement(
    args.direction,
    args.releaseVelocityX,
    args.releaseVelocityY,
  )
  const directionalVelocity =
    Math.abs(releaseVelocity) > 0
      ? releaseVelocity
      : getDisplacement(args.direction, args.velocityX, args.velocityY)
  if (directionalVelocity <= MIN_SWIPE_RELEASE_VELOCITY) return null
  const clampedVelocity = clamp(
    directionalVelocity,
    MIN_SWIPE_RELEASE_VELOCITY,
    MAX_SWIPE_RELEASE_VELOCITY,
  )
  const durationMs = clamp(
    remainingDistance / clampedVelocity,
    MIN_SWIPE_RELEASE_DURATION_MS,
    MAX_SWIPE_RELEASE_DURATION_MS,
  )
  const normalizedDuration =
    (durationMs - MIN_SWIPE_RELEASE_DURATION_MS) /
    (MAX_SWIPE_RELEASE_DURATION_MS - MIN_SWIPE_RELEASE_DURATION_MS)
  return (
    MIN_SWIPE_RELEASE_SCALAR +
    normalizedDuration * (MAX_SWIPE_RELEASE_SCALAR - MIN_SWIPE_RELEASE_SCALAR)
  )
}

/** Rendered swipe movement for the gesture axis: snap-damped on the open
    edge for `down` + snap points, hook damping elsewhere (Base UI renders
    `up` snap drawers with raw deltas). */
export const swipeMovement = (model: Model): { x: number; y: number } => {
  const { deltaX, deltaY } = model.swipe
  if (model.swipeDirection === 'down' && model.snapPoints.length > 0) {
    return {
      x: deltaX,
      y: getSnapPointSwipeMovement(activeSnapPointOffset(model) ?? 0, deltaY),
    }
  }
  return { x: deltaX, y: deltaY }
}

// ——— Update

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/* `modal={false}` keeps the page interactive, so the drawer must never
   acquire foldkit's dialog resources (modal top-layer registration, sibling
   inert, scroll lock). The view renders the plain `<dialog open>` element and
   replaces the primitive's AcquireResources mount with ObserveNonModalEscape;
   the primitive's DOM-facing commands are dropped here so those resources
   can't be installed from any code path (open, RequestedClose, Unmounted,
   animated leave). */
const NON_MODAL_DROPPED_COMMANDS = new Set([
  'ShowDialog',
  'CloseDialog',
  'ReleaseDialogResources',
])

const mapDialogResult = (
  model: Model,
  result: ReturnType<typeof Dialog.update>,
): UpdateReturn => {
  const {
    model: dialog,
    commands: dialogCommands__,
    outMessage: dialogOut__,
  } = result
  const commands = (dialogCommands__ ?? []).filter(
    command =>
      model.modal !== false || !NON_MODAL_DROPPED_COMMANDS.has(command.name),
  )
  const out = dialogOut__
  return {
    model: { ...model, dialog },
    commands: Command.mapMessages(commands, message =>
      Message['GotDrawerDialogMessage']({ message }),
    ),
    ...(out === undefined ? {} : { outMessage: out }),
  }
}

const nestedCount = (model: Model): number =>
  Object.keys(model.nestedDrawerHeights).length

const frontmostHeight = (model: Model): number => {
  const heights = Object.values(model.nestedDrawerHeights)
  return heights.length > 0 ? Math.max(...heights) : 0
}

/** Base UI's valid-timestamp gate: scene-synthesized events report 0. */
const validTimeStamp = (timeStamp: number): number | null =>
  Number.isFinite(timeStamp) && timeStamp > 0 ? timeStamp : null

/** 0..1 progress driving overlay opacity + parent stack lift. */
const computeSwipeProgress = (model: Model): number => {
  const swiping = model.swipe.phase === 'Swiping'
  const range = snapPointRange(model)
  if (range !== null && model.popupHeight > 0) {
    const resolved = resolveSnapPoints(
      model.snapPoints,
      model.popupHeight,
      model.viewportHeight,
      model.rootFontSize,
    )
    const active = resolveActiveSnapPoint(
      model.activeSnapPoint,
      resolved,
      model.popupHeight,
      model.viewportHeight,
      model.rootFontSize,
    )
    const baseOffset = active?.offset ?? range.minOffset
    const offsetToProgress = (nextOffset: number) =>
      clamp((nextOffset - range.minOffset) / range.range, 0, 1)
    if (swiping && Number.isFinite(model.swipe.deltaY)) {
      return offsetToProgress(
        clamp(baseOffset + model.swipe.deltaY, 0, model.popupHeight),
      )
    }
    if (active !== undefined) {
      return offsetToProgress(active.offset)
    }
    return 0
  }
  if (!swiping) return 0
  const size = swipeSizeFor(model)
  if (size <= 0) return 0
  const displacement = getDisplacement(
    model.swipeDirection,
    model.swipe.deltaX,
    model.swipe.deltaY,
  )
  return displacement > 0 ? clamp(displacement / size, 0, 1) : 0
}

/** Record a drag sample and update the last moving velocity — the exact
    base-ui sample rules (one stationary sample per drag). */
const recordDragSample = (
  swipe: SwipeState,
  position: { x: number; y: number },
  timeStamp: number | null,
): SwipeState => {
  if (timeStamp === null) return swipe
  const last = Option.isSome(swipe.lastSample)
    ? swipe.lastSample.value
    : undefined
  let lastVelocityX = swipe.lastVelocityX
  let lastVelocityY = swipe.lastVelocityY
  let hasStationarySample = swipe.hasStationarySample
  if (last !== undefined && timeStamp > last.timeStamp) {
    const stationary =
      Math.abs(position.x - last.x) < MIN_VELOCITY_SAMPLE_DISTANCE &&
      Math.abs(position.y - last.y) < MIN_VELOCITY_SAMPLE_DISTANCE
    const skipSample = stationary && !hasStationarySample
    hasStationarySample = stationary
    if (skipSample) {
      return {
        ...swipe,
        hasStationarySample,
        lastSample: Option.some({ ...position, timeStamp }),
      }
    }
    const durationMs = Math.max(
      timeStamp - last.timeStamp,
      MIN_RELEASE_VELOCITY_DURATION_MS,
    )
    lastVelocityX = (position.x - last.x) / durationMs
    lastVelocityY = (position.y - last.y) / durationMs
  }
  return {
    ...swipe,
    hasStationarySample,
    lastSample: Option.some({ ...position, timeStamp }),
    lastVelocityX,
    lastVelocityY,
  }
}

/** Settle back on the resting state — clears gesture + progress. */
const settleInPlace = (model: Model): Model => ({
  ...model,
  swipe: idleSwipe,
  swipeProgress: 0,
  swipeStrength: Option.none(),
  swipeDismissed: false,
})

/** Release decision result. */
type ReleaseDecision =
  | Readonly<{ _tag: 'Dismiss'; swipeStrength: Option.Option<number> }>
  | Readonly<{ _tag: 'Settle'; snapPoint: Option.Option<SnapPoint> }>

const dismissDecision = (model: Model, release: ReleaseInput): UpdateReturn => {
  const size = swipeSizeFor(model)
  const snapBase =
    (model.swipeDirection === 'down' || model.swipeDirection === 'up') &&
    model.snapPoints.length > 0
      ? (activeSnapPointOffset(model) ?? 0)
      : 0
  const swipeStrength = resolveSwipeStrength({
    size,
    snapPointBaseOffset: snapBase,
    direction: Option.getOrElse(release.direction, () => model.swipeDirection),
    deltaX: release.deltaX,
    deltaY: release.deltaY,
    velocityX: release.velocityX,
    velocityY: release.velocityY,
    releaseVelocityX: release.releaseVelocityX,
    releaseVelocityY: release.releaseVelocityY,
  })
  const next: Model = {
    ...settleInPlace(model),
    swipeStrength:
      swipeStrength === null ? Option.none() : Option.some(swipeStrength),
    swipeDismissed: true,
    activeSnapPoint: Option.none(),
  }
  return mapDialogResult(next, Dialog.close(model.dialog))
}

type ReleaseInput = Readonly<{
  deltaX: number
  deltaY: number
  velocityX: number
  velocityY: number
  releaseVelocityX: number
  releaseVelocityY: number
  direction: Option.Option<SwipeDirection>
}>

/** The ported DrawerViewport.onRelease — pure. Returns the decision the
    gesture resolves to; the caller turns it into a model transition. */
const resolveRelease = (
  model: Model,
  release: ReleaseInput,
): ReleaseDecision => {
  const settle: ReleaseDecision = { _tag: 'Settle', snapPoint: Option.none() }

  if (model.snapPoints.length === 0) {
    const direction = Option.isSome(release.direction)
      ? release.direction.value
      : undefined
    if (direction === undefined) {
      // No latched direction: the generic threshold check still applies —
      // a directionless release only dismisses past the swipe threshold,
      // which implies a direction, so this always settles.
      return settle
    }
    const directionalDelta = getDisplacement(
      direction,
      release.deltaX,
      release.deltaY,
    )
    if (directionalDelta <= 0) return settle
    const releaseVelocity = getDisplacement(
      direction,
      release.releaseVelocityX,
      release.releaseVelocityY,
    )
    const directionalVelocity =
      Math.abs(releaseVelocity) > 0
        ? releaseVelocity
        : getDisplacement(direction, release.velocityX, release.velocityY)
    if (directionalVelocity >= FAST_SWIPE_VELOCITY) {
      return { _tag: 'Dismiss', swipeStrength: Option.none() }
    }
    const shouldClose =
      directionalDelta > swipeThresholdFor(swipeSizeFor(model))
    return shouldClose
      ? { _tag: 'Dismiss', swipeStrength: Option.none() }
      : settle
  }

  if (model.swipeDirection !== 'down' && model.swipeDirection !== 'up') {
    // Snap points only apply on the vertical axis; generic release.
    const directionalDelta = getDisplacement(
      model.swipeDirection,
      release.deltaX,
      release.deltaY,
    )
    return directionalDelta > swipeThresholdFor(swipeSizeFor(model))
      ? { _tag: 'Dismiss', swipeStrength: Option.none() }
      : settle
  }

  if (model.popupHeight <= 0) return settle

  const resolvedSnapPoints = resolveSnapPoints(
    model.snapPoints,
    model.popupHeight,
    model.viewportHeight,
    model.rootFontSize,
  )
  if (resolvedSnapPoints.length === 0) {
    return { _tag: 'Dismiss', swipeStrength: Option.none() }
  }

  const dragDelta =
    model.swipeDirection === 'down' ? release.deltaY : -release.deltaY
  const dragDirection = Math.sign(dragDelta)
  const releaseDirectionalVelocity =
    model.swipeDirection === 'down'
      ? release.releaseVelocityY
      : -release.releaseVelocityY
  const fallbackDirectionalVelocity =
    model.swipeDirection === 'down' ? release.velocityY : -release.velocityY
  let resolvedDirectionalVelocity = releaseDirectionalVelocity
  if (dragDirection !== 0 && Math.abs(dragDelta) >= MIN_SWIPE_THRESHOLD) {
    const velocityDirection = Math.sign(resolvedDirectionalVelocity)
    if (velocityDirection !== 0 && velocityDirection !== dragDirection) {
      resolvedDirectionalVelocity = fallbackDirectionalVelocity
    }
  }

  const currentOffset =
    resolveActiveSnapPoint(
      model.activeSnapPoint,
      resolvedSnapPoints,
      model.popupHeight,
      model.viewportHeight,
      model.rootFontSize,
    )?.offset ?? 0
  const dragTargetOffset = clamp(
    currentOffset + dragDelta,
    0,
    model.popupHeight,
  )
  const velocityOffset =
    Math.abs(resolvedDirectionalVelocity) >= SNAP_VELOCITY_THRESHOLD
      ? clamp(
          resolvedDirectionalVelocity,
          -MAX_SNAP_VELOCITY,
          MAX_SNAP_VELOCITY,
        ) * SNAP_VELOCITY_MULTIPLIER
      : 0
  const targetOffset = model.snapToSequentialPoints
    ? dragTargetOffset
    : clamp(dragTargetOffset + velocityOffset, 0, model.popupHeight)

  const settleOn = (point: ResolvedSnapPoint): ReleaseDecision => ({
    _tag: 'Settle',
    snapPoint: Option.some(point.value),
  })

  if (model.snapToSequentialPoints) {
    const ordered = [...resolvedSnapPoints].sort(
      (first, second) => first.offset - second.offset,
    )
    const orderedOffsets = ordered.map(point => point.offset)
    const currentIndex = closestSnapPointIndex(orderedOffsets, currentOffset)
    const targetIndex = closestSnapPointIndex(orderedOffsets, targetOffset)
    let targetSnapPoint = ordered[targetIndex] ?? ordered[0]
    if (targetSnapPoint === undefined) return settle
    const velocityDirection = Math.sign(resolvedDirectionalVelocity)
    const shouldAdvance =
      dragDirection !== 0 &&
      velocityDirection !== 0 &&
      velocityDirection === dragDirection &&
      Math.abs(resolvedDirectionalVelocity) >= SNAP_VELOCITY_THRESHOLD
    let effectiveTargetOffset = targetOffset

    if (shouldAdvance) {
      const adjacentIndex = clamp(
        currentIndex + dragDirection,
        0,
        ordered.length - 1,
      )
      if (adjacentIndex !== currentIndex) {
        const adjacentPoint = ordered[adjacentIndex]
        if (adjacentPoint !== undefined) {
          const shouldForceAdjacent =
            dragDirection > 0
              ? targetOffset < adjacentPoint.offset
              : targetOffset > adjacentPoint.offset
          if (shouldForceAdjacent) {
            targetSnapPoint = adjacentPoint
            effectiveTargetOffset = adjacentPoint.offset
          }
        }
      } else if (dragDirection > 0) {
        return Option.isNone(release.direction)
          ? settleOn(targetSnapPoint)
          : { _tag: 'Dismiss', swipeStrength: Option.none() }
      }
    }

    const closeDistance = Math.abs(effectiveTargetOffset - model.popupHeight)
    const snapDistance = Math.abs(
      effectiveTargetOffset - targetSnapPoint.offset,
    )
    if (closeDistance < snapDistance) {
      return Option.isNone(release.direction)
        ? settleOn(targetSnapPoint)
        : { _tag: 'Dismiss', swipeStrength: Option.none() }
    }
    return settleOn(targetSnapPoint)
  }

  const closestIndex = closestSnapPointIndex(
    resolvedSnapPoints.map(point => point.offset),
    targetOffset,
  )
  const closestSnapPoint = resolvedSnapPoints[closestIndex]
  if (closestSnapPoint === undefined) return settle

  if (resolvedDirectionalVelocity >= FAST_SWIPE_VELOCITY && dragDelta > 0) {
    return Option.isNone(release.direction)
      ? settleOn(closestSnapPoint)
      : { _tag: 'Dismiss', swipeStrength: Option.none() }
  }

  const closeDistance = Math.abs(targetOffset - model.popupHeight)
  if (closeDistance < Math.abs(targetOffset - closestSnapPoint.offset)) {
    return Option.isNone(release.direction)
      ? settleOn(closestSnapPoint)
      : { _tag: 'Dismiss', swipeStrength: Option.none() }
  }
  return settleOn(closestSnapPoint)
}

const releaseInputFor = (
  model: Model,
  message: {
    x: number
    y: number
    timeStamp: number
  },
): ReleaseInput => {
  const { swipe } = model
  const startTime = swipe.startTimeStamp
  const endTime = validTimeStamp(message.timeStamp)
  const durationMs =
    startTime > 0 && endTime !== null && endTime > startTime
      ? endTime - startTime
      : 0
  const velocityDurationMs =
    durationMs > 0 ? Math.max(durationMs, MIN_VELOCITY_DURATION_MS) : 0
  const velocityX =
    velocityDurationMs > 0 ? swipe.deltaX / velocityDurationMs : 0
  const velocityY =
    velocityDurationMs > 0 ? swipe.deltaY / velocityDurationMs : 0
  let releaseVelocityX = swipe.lastVelocityX
  let releaseVelocityY = swipe.lastVelocityY
  const lastSample = Option.isSome(swipe.lastSample)
    ? swipe.lastSample.value
    : undefined
  if (
    lastSample !== undefined &&
    endTime !== null &&
    endTime >= lastSample.timeStamp
  ) {
    const ageMs = endTime - lastSample.timeStamp
    if (ageMs <= MAX_RELEASE_VELOCITY_AGE_MS) {
      const sampleDurationMs = Math.max(ageMs, MIN_RELEASE_VELOCITY_DURATION_MS)
      const deltaFromLastSampleX = swipe.deltaX - lastSample.x
      const deltaFromLastSampleY = swipe.deltaY - lastSample.y
      const sampleVelocityX = deltaFromLastSampleX / sampleDurationMs
      const sampleVelocityY = deltaFromLastSampleY / sampleDurationMs
      if (Math.abs(deltaFromLastSampleX) >= MIN_VELOCITY_SAMPLE_DISTANCE) {
        releaseVelocityX = sampleVelocityX
      }
      if (Math.abs(deltaFromLastSampleY) >= MIN_VELOCITY_SAMPLE_DISTANCE) {
        releaseVelocityY = sampleVelocityY
      }
    } else {
      releaseVelocityX = 0
      releaseVelocityY = 0
    }
  }
  const dragDelta =
    model.swipeDirection === 'down'
      ? swipe.deltaY
      : model.swipeDirection === 'up'
        ? -swipe.deltaY
        : model.swipeDirection === 'right'
          ? swipe.deltaX
          : -swipe.deltaX
  const direction: Option.Option<SwipeDirection> =
    Math.abs(dragDelta) >= MIN_SWIPE_THRESHOLD
      ? Option.some(
          model.swipeDirection === 'down' && swipe.deltaY < 0
            ? 'up'
            : model.swipeDirection === 'up' && swipe.deltaY > 0
              ? 'down'
              : model.swipeDirection,
        )
      : Option.none()
  return {
    deltaX: swipe.deltaX,
    deltaY: swipe.deltaY,
    velocityX,
    velocityY,
    releaseVelocityX,
    releaseVelocityY,
    direction,
  }
}

const applyReleaseDecision = (
  model: Model,
  release: ReleaseInput,
): UpdateReturn => {
  const decision = resolveRelease(model, release)
  switch (decision._tag) {
    case 'Dismiss':
      return dismissDecision(model, release)
    case 'Settle':
      return {
        model: {
          ...settleInPlace(model),
          activeSnapPoint: Option.isSome(decision.snapPoint)
            ? decision.snapPoint
            : model.activeSnapPoint,
        },
      }
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotDrawerDialogMessage': {
      const result = mapDialogResult(
        model,
        Dialog.update(model.dialog, message.message),
      )
      // A dialog-driven close (Escape, backdrop, programmatic) clears any
      // in-flight gesture so the next open starts clean.
      if (!result.model.dialog.isOpen) {
        return {
          ...result,
          model: {
            ...settleInPlace(result.model),
            activeSnapPoint: defaultActiveSnapPoint(result.model),
          },
        }
      }
      return result
    }
    case 'StartedSwipe': {
      if (!model.dialog.isOpen || nestedCount(model) > 0) {
        return { model }
      }
      const startTimeStamp = validTimeStamp(message.timeStamp) ?? 0
      return {
        model: {
          ...model,
          swipe: {
            phase: 'Swiping',
            startX: message.x,
            startY: message.y,
            deltaX: 0,
            deltaY: 0,
            startTimeStamp,
            lastSample: Option.none(),
            lastVelocityX: 0,
            lastVelocityY: 0,
            hasStationarySample: false,
          },
        },
      }
    }
    case 'DraggedSwipe': {
      if (model.swipe.phase !== 'Swiping') return { model }
      const rawDeltaX = message.x - model.swipe.startX
      const rawDeltaY = message.y - model.swipe.startY
      const damped = applyDirectionalDamping(
        swipeDirectionsFor(model.swipeDirection, model.snapPoints),
        rawDeltaX,
        rawDeltaY,
      )
      const sampled = recordDragSample(
        model.swipe,
        damped,
        validTimeStamp(message.timeStamp),
      )
      const next: Model = {
        ...model,
        swipe: { ...sampled, deltaX: damped.x, deltaY: damped.y },
      }
      return {
        model: { ...next, swipeProgress: computeSwipeProgress(next) },
      }
    }
    case 'CancelledSwipe':
      return { model: settleInPlace(model) }
    case 'EndedSwipe': {
      if (model.swipe.phase !== 'Swiping') return { model }
      return applyReleaseDecision(model, releaseInputFor(model, message))
    }
    case 'MeasuredPopup': {
      // A stacked vertical popup adopts the frontmost drawer's height. Keep
      // its own measurement stable instead of feeding each animation frame
      // back into the CSS height that is currently being interpolated.
      const height =
        nestedCount(model) > 0 &&
        (model.swipeDirection === 'down' || model.swipeDirection === 'up')
          ? model.popupHeight
          : message.height
      if (model.popupWidth === message.width && model.popupHeight === height) {
        return { model }
      }
      return {
        model: {
          ...model,
          popupWidth: message.width,
          popupHeight: height,
        },
      }
    }
    case 'MeasuredViewport':
      return {
        model: {
          ...model,
          viewportWidth: message.width,
          viewportHeight: message.height,
          rootFontSize: message.rootFontSize,
        },
      }
    case 'NestedDrawersChanged':
      // The mount reports the whole observed child set each change; rebuild
      // the record from it. `frontmostHeight`/`swiping`/`progress` come from
      // the frontmost open child's popup.
      if (
        nestedCount(model) === message.count &&
        (message.count === 0 ||
          frontmostHeight(model) === message.frontmostHeight) &&
        model.nestedSwiping === message.swiping &&
        model.nestedSwipeProgress === message.progress
      ) {
        return { model }
      }
      return {
        model: {
          ...model,
          nestedDrawerHeights: Object.fromEntries(
            Array.from({ length: message.count }, (_, index) => [
              String(index),
              message.frontmostHeight,
            ]),
          ),
          nestedSwiping: message.swiping,
          nestedSwipeProgress: message.progress,
        },
      }
    case 'RequestedSnapPoint': {
      if (model.snapPoints.length === 0) return { model }
      return {
        model: {
          ...model,
          activeSnapPoint: Option.some(message.snapPoint),
          swipeProgress: 0,
        },
      }
    }
  }
}

const defaultActiveSnapPoint = (model: Model): Option.Option<SnapPoint> =>
  model.defaultSnapPoint

export const open = (model: Model): UpdateReturn =>
  mapDialogResult(
    {
      ...settleInPlace(model),
      activeSnapPoint: defaultActiveSnapPoint(model),
    },
    Dialog.open(model.dialog),
  )

export const close = (model: Model): UpdateReturn =>
  mapDialogResult(
    {
      ...settleInPlace(model),
      activeSnapPoint: defaultActiveSnapPoint(model),
    },
    Dialog.close(model.dialog),
  )

/** Programmatic snap-point change (Drawer `snapPoint` prop equivalent). */
export const snapTo = (model: Model, snapPoint: SnapPoint): UpdateReturn =>
  update(model, Message.RequestedSnapPoint({ snapPoint }))

/** True when the resolved active snap point is the full-height value `1`. */
export const isExpanded = (model: Model): boolean =>
  Option.isSome(model.activeSnapPoint) && model.activeSnapPoint.value === 1

/** The signed snap-point offset written to `--drawer-snap-point-offset`. */
export const snapPointOffsetFor = (model: Model): number | null => {
  if (
    model.snapPoints.length === 0 ||
    (model.swipeDirection !== 'down' && model.swipeDirection !== 'up')
  ) {
    return null
  }
  const offset = activeSnapPointOffset(model)
  if (offset === null) return null
  return model.swipeDirection === 'up' ? -offset : offset
}

export const nestedDrawerOpen = (model: Model): boolean =>
  nestedCount(model) > 0

export const frontmostNestedHeight = (model: Model): number =>
  frontmostHeight(model)

/** Progress the parent popup should mirror: a nested drawer's live swipe
    while one is open, this drawer's own gesture otherwise (0 at rest). */
export const effectiveSwipeProgress = (model: Model): number =>
  nestedCount(model) > 0
    ? model.nestedSwipeProgress
    : model.swipe.phase === 'Swiping' || snapPointRange(model) !== null
      ? model.swipeProgress
      : 0

// ——— Mounts (DOM → model)

/** ResizeObserver on the popup — feeds popupWidth/popupHeight. */
export const ObservePopup = Mount.defineStream('ObserveDrawerPopup', {
  messages: [Message.MeasuredPopup],
  execute: ({ element }) =>
    Stream.callback<typeof Message.MeasuredPopup.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const emit = () =>
              Queue.offerUnsafe(
                queue,
                Message.MeasuredPopup({
                  width: element.offsetWidth,
                  height: element.offsetHeight,
                }),
              )
            const resize = new ResizeObserver(emit)
            resize.observe(element)
            emit()
            return resize
          }),
          resize => Effect.sync(() => resize?.disconnect()),
        )
        return yield* Effect.never
      }),
    ),
})

const NESTED_POPUP_SELECTOR = '[data-slot="drawer-popup"]'

/** A nested drawer's <dialog> is a DOM descendant of the parent drawer's
    styled subtree: ancestor `opacity` (the nested-open content fade),
    `transform`/`filter` (the popup's stack shrink) and clipping all
    composite over it, and no descendant CSS can escape that — the same
    problem shadcn/Base UI solve by portaling the child out. foldkit
    renders the dialog in place, so the viewport's mount relocates the
    element itself: appended as a direct child of the PARENT dialog it
    leaves the styled subtree while staying inside that dialog, which
    keeps modal-stack inert scoping (ancestors of the topmost dialog stay
    un-inerted), Escape routing, and the parent's dialog-scoped
    nested-drawer watcher working unchanged. The vnode keeps patching the
    moved element by reference; on unmount we restore it so the dialog is
    back under its real parent before snabbdom ever needs to detach it. */
const hoistNestedDialog = (element: HTMLElement): (() => void) | undefined => {
  const dialog = element.closest('dialog')
  const parentDialog = dialog?.closest(NESTED_POPUP_SELECTOR)?.closest('dialog')
  if (dialog === null || parentDialog == null) return undefined
  const originalParent = dialog.parentNode
  if (originalParent === null) return undefined
  const originalNextSibling = dialog.nextSibling
  parentDialog.appendChild(dialog)
  return () => {
    try {
      if (
        originalNextSibling !== null &&
        originalNextSibling.parentNode === originalParent
      ) {
        originalParent.insertBefore(dialog, originalNextSibling)
      } else {
        originalParent.appendChild(dialog)
      }
    } catch {
      // A re-render may drop the host before cleanup runs.
    }
  }
}

/** ResizeObserver on the viewport — feeds viewport size + root font size.
    Also relocates a nested drawer's dialog out of the parent's styled
    subtree so it escapes the parent's fade/stack transforms (see
    hoistNestedDialog). */
export const ObserveViewport = Mount.defineStream('ObserveDrawerViewport', {
  messages: [Message.MeasuredViewport, Message.CancelledSwipe],
  execute: ({ element }) =>
    Stream.callback<
      typeof Message.MeasuredViewport.Type | typeof Message.CancelledSwipe.Type
    >(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            element instanceof HTMLElement
              ? hoistNestedDialog(element)
              : undefined,
          ),
          release => Effect.sync(() => release?.()),
        )
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            let captured: { handle: HTMLElement; pointerId: number } | undefined
            const onPointerDown = (event: PointerEvent) => {
              if (event.button !== 0 || !(event.target instanceof Element))
                return
              const handle = event.target.closest(
                '[data-slot="drawer-swipe-handle"]',
              )
              if (!(handle instanceof HTMLElement)) return
              handle.setPointerCapture(event.pointerId)
              captured = { handle, pointerId: event.pointerId }
            }
            const onPointerCancel = () =>
              Queue.offerUnsafe(queue, Message.CancelledSwipe())
            element.addEventListener('pointerdown', onPointerDown)
            element.addEventListener('pointercancel', onPointerCancel)
            return () => {
              element.removeEventListener('pointerdown', onPointerDown)
              element.removeEventListener('pointercancel', onPointerCancel)
              if (captured?.handle.hasPointerCapture(captured.pointerId)) {
                captured.handle.releasePointerCapture(captured.pointerId)
              }
            }
          }),
          release => Effect.sync(() => release?.()),
        )
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const emit = () =>
              Queue.offerUnsafe(
                queue,
                Message.MeasuredViewport({
                  width: element.offsetWidth,
                  height: element.offsetHeight,
                  rootFontSize:
                    Number.parseFloat(
                      element.ownerDocument.defaultView?.getComputedStyle(
                        element.ownerDocument.documentElement,
                      ).fontSize ?? '',
                    ) || 16,
                }),
              )
            const resize = new ResizeObserver(emit)
            resize.observe(element)
            emit()
            return resize
          }),
          resize => Effect.sync(() => resize?.disconnect()),
        )
        return yield* Effect.never
      }),
    ),
})

/** Watches nested drawer popups inside this dialog subtree and reports the
    frontmost child's height + swipe progress — the Base UI
    nestedSwipeProgressStore / presence plumbing expressed over the DOM.
    Scoped to the owning <dialog> rather than the content element the mount
    lives on: nested dialogs are relocated to be direct children of this
    dialog (see hoistNestedDialog), so they leave the content subtree but
    stay inside the dialog's. */
export const ObserveNestedDrawers = Mount.defineStream('ObserveNestedDrawers', {
  messages: [Message.NestedDrawersChanged],
  execute: ({ element }) =>
    Stream.callback<typeof Message.NestedDrawersChanged.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const ownDialog = element.closest('dialog')
            const scope = ownDialog ?? element
            let previous: typeof Message.NestedDrawersChanged.Type | undefined
            const emit = () => {
              const children = Array.from(
                scope.querySelectorAll(NESTED_POPUP_SELECTOR),
              ).filter(
                child =>
                  child instanceof HTMLElement &&
                  !child.hidden &&
                  // scoped to the dialog subtree this drawer's own popup is a
                  // descendant too — only count popups of other dialogs
                  child.closest('dialog') !== ownDialog &&
                  // Count entering drawers immediately, and restore the
                  // parent as the child starts leaving. Ancestor transition
                  // flags must never determine a child's presence.
                  !child.hasAttribute('data-leave'),
              )
              const frontmost = children.at(-1)
              const frontmostHeight =
                frontmost instanceof HTMLElement ? frontmost.offsetHeight : 0
              const swiping = frontmost?.hasAttribute('data-swiping') ?? false
              const value = Number.parseFloat(
                frontmost instanceof HTMLElement
                  ? frontmost.style.getPropertyValue('--drawer-swipe-progress')
                  : '',
              )
              const progress = Number.isFinite(value) ? value : 0
              const next = Message.NestedDrawersChanged({
                count: children.length,
                frontmostHeight,
                swiping,
                progress,
              })
              // Patching the parent's own CSS variables also triggers this
              // observer. Do not dispatch a second render for unchanged
              // child state; it would compete with the animation frames.
              if (
                previous?.count === next.count &&
                previous.frontmostHeight === next.frontmostHeight &&
                previous.swiping === next.swiping &&
                previous.progress === next.progress
              )
                return
              previous = next
              Queue.offerUnsafe(queue, next)
            }
            const observer = new MutationObserver(emit)
            observer.observe(scope, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: [
                'data-swiping',
                'data-open',
                'data-closed',
                'data-leave',
                'hidden',
                'style',
              ],
            })
            emit()
            return observer
          }),
          observer => Effect.sync(() => observer?.disconnect()),
        )
        return yield* Effect.never
      }),
    ),
})

/** Document-level Escape for `modal={false}` drawers: a plain `<dialog open>`
    fires no `cancel` event, so Escape is routed back through the dialog
    submodel's RequestedClose. Mounted on the dialog element in place of the
    primitive's AcquireResources (one OnMount per vnode — last wins). */
export const ObserveNonModalEscape = Mount.defineStream(
  'ObserveDrawerNonModalEscape',
  {
    messages: [Message['GotDrawerDialogMessage']],
    execute: ({ element }) =>
      Stream.callback<(typeof Message)['GotDrawerDialogMessage']['Type']>(
        queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                const ownerDocument = element.ownerDocument
                const onKeyDown = (event: KeyboardEvent) => {
                  if (event.key !== 'Escape') return
                  Queue.offerUnsafe(
                    queue,
                    Message['GotDrawerDialogMessage']({
                      message: Dialog.Message.RequestedClose(),
                    }),
                  )
                }
                ownerDocument.addEventListener('keydown', onKeyDown)
                return () =>
                  ownerDocument.removeEventListener('keydown', onKeyDown)
              }),
              release => Effect.sync(() => release()),
            )
            return yield* Effect.never
          }),
      ),
  },
)
