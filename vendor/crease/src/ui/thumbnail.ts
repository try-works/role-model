import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Thumbnail (packages/core/src/Thumbnail/Thumbnail.tsx) —
   examples and visual spec adapted to Crease UI tokens. Astryx tracks load
   errors in component state; here the model owns `isError` (set it from the
   `onError` message when the current src fails). The label Tooltip and the
   dev-mode no-alt warning are not ported: foldkit previews are static and the
   tooltip layer is out of scope — callers keep `label` for the group
   accessible name instead. */

/** When 'hover', the remove button only reveals on hover/focus-within (always visible on coarse pointers). */
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
  class?: string
}>

const CONTAINER_CLASS =
  'relative inline-flex w-16 shrink-0 isolate flex-col group/thumbnail'
const IMAGE_CONTAINER_CLASS =
  'relative aspect-square w-full overflow-hidden rounded-md bg-muted'
const IMAGE_CLASS = 'block h-full w-full object-cover'
const INSET_BORDER_CLASS =
  'pointer-events-none absolute inset-0 rounded-[inherit] border border-solid border-input'
const PLACEHOLDER_CLASS =
  'flex h-full w-full items-center justify-center text-muted-foreground'
const REMOVE_SLOT_CLASS = 'absolute top-1 z-10 inline-flex end-1 leading-0'
const REMOVE_BUTTON_CLASS =
  'pointer-events-auto inline-flex size-5 min-w-5 items-center justify-center rounded-[4px] bg-black/40 text-white transition-colors duration-150 ease-in-out hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none'
const REMOVE_BUTTON_HOVER_REVEAL_CLASS =
  'opacity-0 group-hover/thumbnail:opacity-100 group-focus-within/thumbnail:opacity-100 pointer-coarse:opacity-100'
const UPLOAD_OVERLAY_CLASS =
  'absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/40'
const INTERACTIVE_BUTTON_CLASS =
  'block h-full w-full cursor-pointer appearance-none rounded-[inherit] border-0 bg-transparent p-0 text-start'
const DISABLED_CLASS = 'pointer-events-none opacity-50'

/** Placeholder glyph from the astryx source (not a lucide icon). */
const placeholderGlyph = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.ViewBox('0 0 24 24'),
      h.Width('24'),
      h.Height('24'),
      h.Fill('currentColor'),
      h.Class('size-6'),
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
        h.Class(IMAGE_CLASS),
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
          h.Class(INTERACTIVE_BUTTON_CLASS),
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
      h.Class(cn(CONTAINER_CLASS, isDisabled && DISABLED_CLASS, props.class)),
    ],
    [
      h.div(
        [h.Class(IMAGE_CONTAINER_CLASS)],
        [
          showPlaceholder
            ? h.div([h.Class(PLACEHOLDER_CLASS)], [placeholderGlyph(h)])
            : h.empty,
          imageContent,
          showImage ? h.div([h.Class(INSET_BORDER_CLASS)], []) : h.empty,
          showUploadOverlay
            ? h.div(
                [h.Class(UPLOAD_OVERLAY_CLASS)],
                [
                  Icon.loaderCircle(
                    { class: 'size-4 animate-spin text-white' },
                    h,
                  ),
                ],
              )
            : h.empty,
        ],
      ),
      hasRemove
        ? h.div(
            [
              h.Class(
                cn(
                  REMOVE_SLOT_CLASS,
                  showRemoveOnHover && REMOVE_BUTTON_HOVER_REVEAL_CLASS,
                ),
              ),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.AriaLabel(`Remove ${accessibleName}`),
                  h.Class(REMOVE_BUTTON_CLASS),
                  h.OnClick(props.onRemove as Msg, { propagation: 'Stop' }),
                ],
                [Icon.x({ class: 'size-3' }, h)],
              ),
            ],
          )
        : h.empty,
    ],
  )
}
