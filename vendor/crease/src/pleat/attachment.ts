import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { attachmentScope } from './attachment.markers'
import { messageScope } from './message.markers'
import { buttonVisualStyles } from './button'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'
export type AttachmentState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'error'
  | 'done'
type Size = 'default' | 'sm' | 'xs'
type Orientation = 'horizontal' | 'vertical'
type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>
const styles = {
  root: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusXl,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    backgroundColor: tokens.card,
    boxShadow: tokens.shadowNone,
    color: tokens.cardForeground,
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty:
      'color, background-color, border-color, text-decoration-color, fill, stroke',
    maxWidth: '100%',
    minWidth: 0,
    width: 'fit-content',
  }).pipe(
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot=attachment-content]):not(:has([data-slot=attachment-media]))',
        ),
      ),
      { paddingBlock: '0.5rem', paddingInline: '0.625rem' },
    ),
    Style.when(When.has(When.data('slot', 'attachment-media')), {
      paddingBlock: '0.5rem',
      paddingInline: '0.5rem',
    }),
    Style.when(When.within(messageScope, When.data('align', 'end')), {
      alignSelf: 'flex-end',
    }),
    Style.when(When.all(When.pseudo(':has(> a)'), When.hover), {
      backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
    }),
    Style.when(When.all(When.pseudo(':has(> button)'), When.hover), {
      backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
    }),
    Style.when(When.focusWithin, { boxShadow: foundationTokens.ringShadow1 }),
  ),
  sm: Style.make({
    gap: '0.625rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }).pipe(
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot=attachment-content]):not(:has([data-slot=attachment-media]))',
        ),
      ),
      { paddingBlock: '0.375rem', paddingInline: '0.5rem' },
    ),
    Style.when(When.has(When.data('slot', 'attachment-media')), {
      paddingBlock: '0.375rem',
      paddingInline: '0.375rem',
    }),
  ),
  xs: Style.make({
    borderRadius: foundationTokens.radiusLg,
    gap: '0.375rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }).pipe(
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot=attachment-content]):not(:has([data-slot=attachment-media]))',
        ),
      ),
      { paddingBlock: '0.25rem', paddingInline: '0.375rem' },
    ),
    Style.when(When.has(When.data('slot', 'attachment-media')), {
      paddingBlock: '0.25rem',
      paddingInline: '0.25rem',
    }),
  ),
  horizontal: Style.make({ alignItems: 'center', minWidth: '10rem' }),
  vertical: Style.make({ flexDirection: 'column', width: '6rem' }).pipe(
    Style.when(When.has(When.data('slot', 'attachment-content')), {
      width: '7.5rem',
    }),
  ),
  error: Style.make({
    borderColor: `color-mix(in oklab, ${tokens.destructive} 30%, transparent)`,
  }),
  idle: Style.make({ borderStyle: 'dashed' }),
  media: Style.make({
    borderRadius: foundationTokens.radiusLg,
    overflow: 'hidden',
    alignItems: 'center',
    aspectRatio: '1',
    backgroundColor: foundationTokens.muted,
    color: tokens.foreground,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    position: 'relative',
    height: '2.5rem',
    width: '2.5rem',
  }).pipe(
    Style.when(When.within(attachmentScope, When.data('size', 'xs')), {
      borderRadius: foundationTokens.radiusMd,
      height: '1.75rem',
      width: '1.75rem',
    }),
    Style.when(When.within(attachmentScope, When.data('state', 'error')), {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
      color: tokens.destructive,
    }),
    Style.when(
      When.within(attachmentScope, When.data('orientation', 'vertical')),
      { height: 'auto', width: '100%' },
    ),
    Style.when(When.within(attachmentScope, When.data('size', 'sm')), {
      height: '2rem',
      width: '2rem',
    }),
  ),
  mediaImage: Style.make({ opacity: 0.6 }).pipe(
    Style.when(When.within(attachmentScope, When.data('state', 'done')), {
      opacity: 1,
    }),
  ),
  content: Style.make({
    flex: '1',
    lineHeight: 1.25,
    maxWidth: '100%',
    minWidth: 0,
  }).pipe(
    Style.when(
      When.within(attachmentScope, When.data('orientation', 'vertical')),
      { paddingInline: '0.25rem' },
    ),
  ),
  actions: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    position: 'relative',
    zIndex: 20,
  }).pipe(
    Style.when(
      When.within(attachmentScope, When.data('orientation', 'vertical')),
      {
        gap: '0.25rem',
        position: 'absolute',
        right: '0.75rem',
        top: '0.75rem',
      },
    ),
  ),
  group: Style.make({
    gap: '0.75rem',
    paddingBlock: '0.25rem',
    scrollSnapType: 'x mandatory',
    display: 'flex',
    minWidth: 0,
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
  }),
  title: Style.make({
    overflow: 'hidden',
    display: 'block',
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    minWidth: 0,
  }),
  description: Style.make({
    overflow: 'hidden',
    color: tokens.mutedForeground,
    display: 'block',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '0.125rem',
    maxWidth: '100%',
    minWidth: 0,
  }).pipe(
    Style.when(When.within(attachmentScope, When.data('state', 'error')), {
      color: `color-mix(in oklab, ${tokens.destructive} 80%, transparent)`,
    }),
  ),
  trigger: Style.make({
    inset: 0,
    outlineStyle: 'none',
    position: 'absolute',
    zIndex: 10,
  }).pipe(Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow })),
  action: Style.make({
    borderColor: tokens.transparent,
    borderRadius: foundationTokens.radiusMdCap8,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 'normal',
    backgroundClip: 'padding-box',
  }),
}
export const attachmentVariants = (
  o: Readonly<{ size?: Size | null; orientation?: Orientation | null }> = {},
): string =>
  className(
    styles.root,
    o.size !== undefined &&
      o.size !== null &&
      o.size !== 'default' &&
      styles[o.size],
    styles[o.orientation ?? 'horizontal'],
  )
export const attachment = <Msg>(
  p: ChildrenProps &
    Readonly<{
      state?: AttachmentState
      size?: Size
      orientation?: Orientation
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const state = p.state ?? 'done',
    size = p.size ?? 'default',
    orientation = p.orientation ?? 'horizontal'
  return h.div(
    [
      h.DataAttribute('slot', 'attachment'),
      h.DataAttribute('state', state),
      h.DataAttribute('size', size),
      h.DataAttribute('orientation', orientation),
      h.Class(
        className(
          styles.root,
          size !== 'default' && styles[size],
          styles[orientation],
          state === 'error' && styles.error,
          state === 'idle' && styles.idle,
          attachmentScope,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
}
export const attachmentMedia = <Msg>(
  p: ChildrenProps & Readonly<{ variant?: 'icon' | 'image' }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'attachment-media'),
      h.DataAttribute('variant', p.variant ?? 'icon'),
      h.Class(
        className(
          styles.media,
          p.variant === 'image' && styles.mediaImage,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
const part =
  (slot: string, style: Style.Style) =>
  <Msg>(p: ChildrenProps, h: HtmlBuilder<Msg>): Html =>
    h.div(
      [h.DataAttribute('slot', slot), h.Class(className(style, p.layoutStyle))],
      [...p.children],
    )
export const attachmentContent = part('attachment-content', styles.content)
export const attachmentActions = part('attachment-actions', styles.actions)
export const attachmentAction = <Msg>(
  p: Readonly<{
    onClick: Msg
    label: string
    children: ReadonlyArray<Html | string>
    layoutStyle?: ComponentLayoutStyle | undefined
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(p.onClick),
      h.DataAttribute('slot', 'attachment-action'),
      h.AriaLabel(p.label),
      h.Class(
        className(
          reset.button,
          ...buttonVisualStyles({ variant: 'ghost', size: 'icon-xs' }),
          styles.action,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export const attachmentGroup = part('attachment-group', styles.group)
export const attachmentTitle = <Msg>(
  p: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'attachment-title'),
      h.Class(className(styles.title, p.layoutStyle)),
    ],
    [...p.children],
  )
export const attachmentDescription = <Msg>(
  p: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'attachment-description'),
      h.Class(className(styles.description, p.layoutStyle)),
    ],
    [...p.children],
  )
export const attachmentTrigger = <Msg>(
  p: Readonly<{
    onClick: Msg
    label: string
    layoutStyle?: ComponentLayoutStyle | undefined
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(p.onClick),
      h.DataAttribute('slot', 'attachment-trigger'),
      h.AriaLabel(p.label),
      h.Class(className(reset.button, styles.trigger, p.layoutStyle)),
    ],
    [],
  )
