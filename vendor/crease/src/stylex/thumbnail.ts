import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { complexTokens } from './complex-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { thumbnailScope } from './thumbnail.markers.stylex'

/* Ported from Meta Astryx Thumbnail (packages/core/src/Thumbnail/Thumbnail.tsx) —
   examples and visual spec adapted to Crease UI tokens. Two documented
   deviations: (1) astryx's scrim overlay and
   hover tints use overlay tokens that do not exist here, so the remove button
   and upload overlay use complexTokens.overlaySurface (foreground 50%);
   (2) the remove button's coarse-pointer hit inset (::after) is dropped — the
   lint forbids outer pseudo-element styles (PORT-NOTE). */

const spinFrames = stylex.keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
})

const styles = stylex.create({
  container: {
    display: 'inline-flex',
    flexDirection: 'column',
    flexShrink: 0,
    isolation: 'isolate',
    position: 'relative',
    width: '4rem',
  },
  imageContainer: {
    borderRadius: foundationTokens.radiusMd,
    overflow: 'hidden',
    aspectRatio: '1 / 1',
    backgroundColor: foundationTokens.muted,
    position: 'relative',
    width: '100%',
  },
  image: {
    display: 'block',
    objectFit: 'cover',
    height: '100%',
    width: '100%',
  },
  insetBorder: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    pointerEvents: 'none',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  placeholder: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  removeSlot: {
    display: 'inline-flex',
    insetInlineEnd: '0.25rem',
    lineHeight: 0,
    position: 'absolute',
    zIndex: 10,
    top: '0.25rem',
  },
  removeSlotHover: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(':focus-within', thumbnailScope)]: 1,
      [stylex.when.ancestor(':hover', thumbnailScope)]: 1,
      '@media (pointer: coarse)': 1,
    },
  },
  removeButton: {
    borderRadius: foundationTokens.checkboxRadius,
    outline: {
      default: 'none',
      ':focus-visible': complexTokens.focusOutline,
    },
    alignItems: 'center',
    backgroundColor: {
      default: foundationTokens.overlay40,
      ':hover': foundationTokens.overlay50,
    },
    color: foundationTokens.white,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1.25rem',
    minWidth: '1.25rem',
  },
  uploadOverlay: {
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: foundationTokens.overlay40,
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 10,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  spin: {
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: spinFrames,
    animationTimingFunction: interactionTokens.easingLinear,
    color: foundationTokens.white,
    display: 'block',
    height: '1rem',
    width: '1rem',
  },
  iconXsm: { height: '0.75rem', width: '0.75rem' },
  interactiveButton: {
    padding: 0,
    borderRadius: 'inherit',
    borderStyle: 'none',
    borderWidth: 0,
    appearance: 'none',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorAction,
    display: 'block',
    filter: {
      default: 'none',
      '@media (hover: hover)': {
        default: 'none',
        ':hover': 'brightness(0.95)',
        ':active': 'brightness(0.9)',
      },
    },
    textAlign: 'start',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'filter',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '100%',
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
})

export type ThumbnailShowRemoveOn = 'always' | 'hover'

export type ThumbnailProps<Msg> = Readonly<{
  /** Image source. When omitted, the thumbnail shows its placeholder state. */
  src?: string
  /** Alt text for the image. */
  alt?: string
  /** Human-readable name shown in tooltips and used in accessible labels. */
  label?: string
  /** Renders the skeleton state, or an upload overlay when a src is present. */
  isLoading?: boolean
  /** Set from the `onError` message: the current src failed to load. */
  isError?: boolean
  /** Grays out the thumbnail and disables interactions. */
  isDisabled?: boolean
  /** Message sent when the media is clicked; makes the thumbnail a button. */
  onClick?: Msg
  /** Message sent when the remove button is clicked. */
  onRemove?: Msg
  /** Optional message emitted when the image fails to load (pair with `isError`). */
  onError?: Msg
  /** Optional message emitted when the image finishes loading. */
  onLoad?: Msg
  /** Controls whether the remove button is always visible or hover-revealed. */
  showRemoveOn?: ThumbnailShowRemoveOn
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

const placeholderGlyph = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.svg(
    [
      h.Class(className(reset.svg)),
      h.AriaHidden(true),
      h.ViewBox('0 0 24 24'),
      h.Width('24'),
      h.Height('24'),
      h.Fill('currentColor'),
    ],
    [
      h.path(
        [
          h.D(
            'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-5.5z',
          ),
        ],
        [],
      ),
    ],
  )

const resolveAccessibleName = (props: {
  alt?: string
  label?: string
}): string =>
  props.label !== undefined && props.alt !== undefined
    ? `${props.label} — ${props.alt}`
    : (props.label ?? props.alt ?? 'Thumbnail')

export const thumbnail = <Msg>(
  props: ThumbnailProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const accessibleName = resolveAccessibleName(props)
  const hasSrc = props.src !== undefined && props.src !== ''
  const isLoading = props.isLoading === true
  const isDisabled = props.isDisabled === true
  const hasError = props.isError === true

  const showSkeleton = isLoading && !hasSrc
  const showImage = hasSrc && !showSkeleton && !hasError
  const showUploadOverlay = isLoading && hasSrc
  const showPlaceholder = (!isLoading && !hasSrc) || hasError
  const isInteractive = props.onClick !== undefined && !isDisabled && !isLoading
  const hasRemove = props.onRemove !== undefined && !isDisabled
  const showRemoveOnHover = (props.showRemoveOn ?? 'hover') === 'hover'

  const imageNode = showImage
    ? h.img([
        h.Src(props.src ?? ''),
        h.Alt(props.alt ?? ''),
        h.Class(className(reset.media, styles.image)),
        h.Loading('lazy'),
        ...(props.alt === undefined || props.alt === ''
          ? [h.AriaHidden(true)]
          : []),
        ...(props.onError === undefined ? [] : [h.OnError(props.onError)]),
        ...(props.onLoad === undefined ? [] : [h.OnLoad(props.onLoad)]),
      ])
    : h.empty

  const imageContent = isInteractive
    ? h.button(
        [
          h.Type('button'),
          h.AriaLabel(`Open ${accessibleName}`),
          h.Class(className(reset.button, styles.interactiveButton)),
          h.OnClick(props.onClick as Msg),
        ],
        [imageNode],
      )
    : imageNode

  return h.div(
    [
      h.Role('group'),
      h.AriaLabel(accessibleName),
      h.DataAttribute('slot', 'thumbnail'),
      h.Class(
        className(
          thumbnailScope,
          styles.container,
          isDisabled && styles.disabled,
          props.layoutStyle,
        ),
      ),
    ],
    [
      h.div(
        [h.Class(className(styles.imageContainer))],
        [
          showPlaceholder
            ? h.div(
                [h.Class(className(styles.placeholder))],
                [placeholderGlyph(h)],
              )
            : h.empty,
          imageContent,
          showImage
            ? h.div([h.Class(className(styles.insetBorder))], [])
            : h.empty,
          showUploadOverlay
            ? h.div(
                [
                  h.Class(className(styles.uploadOverlay)),
                  h.Style({ '--thumbnail-overlay': 'oklab(0 0 0 / 0.4)' }),
                ],
                [Icon.loaderCircle({ class: className(styles.spin) }, h)],
              )
            : h.empty,
        ],
      ),
      hasRemove
        ? h.div(
            [
              h.Class(
                className(
                  styles.removeSlot,
                  showRemoveOnHover && styles.removeSlotHover,
                ),
              ),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.AriaLabel(`Remove ${accessibleName}`),
                  h.Class(className(reset.button, styles.removeButton)),
                  h.Style({
                    '--thumbnail-overlay': 'oklab(0 0 0 / 0.4)',
                    '--thumbnail-overlay-hover': 'oklab(0 0 0 / 0.5)',
                  }),
                  h.OnClick(props.onRemove as Msg, { propagation: 'Stop' }),
                ],
                [Icon.x({ class: className(styles.iconXsm) }, h)],
              ),
            ],
          )
        : h.empty,
    ],
  )
}
