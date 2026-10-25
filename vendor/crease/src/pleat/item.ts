import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { tokens } from './tokens'
type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>
export type ItemVariants = Readonly<{
  variant?: 'default' | 'outline' | 'muted' | null
  size?: 'default' | 'sm' | 'xs' | null
  /** TW demos pass 'flex-col items-stretch' to stack content/footer rows. */
  orientation?: 'horizontal' | 'vertical' | null
}>
export type ItemMediaVariants = Readonly<{
  variant?: 'default' | 'icon' | 'image' | null
}>
const styles = {
  item: Style.make({
    padding: '0.75rem',
    borderColor: foundationTokens.transparent,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
  }),
  outline: Style.make({ borderColor: tokens.border }),
  muted: Style.make({ backgroundColor: foundationTokens.mutedSoft }),
  vertical: Style.make({ alignItems: 'stretch', flexDirection: 'column' }),
  sm: Style.make({
    gap: '0.625rem',
    paddingBlock: '0.625rem',
    paddingInline: '0.75rem',
  }),
  xs: Style.make({
    gap: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.625rem',
  }),
  media: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
  }).pipe(
    Style.when(When.within(When.has(When.data('slot', 'item-description'))), {
      alignSelf: 'flex-start',
      translate: '0px 0.125rem',
    }),
  ),
  mediaIcon: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: foundationTokens.muted,
    height: '2rem',
    width: '2rem',
  }),
  mediaImage: Style.make({
    borderRadius: foundationTokens.radiusSm,
    overflow: 'hidden',
    height: '2.5rem',
    width: '2.5rem',
  }),
  content: Style.make({
    flex: '1',
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  contentMd: Style.make({ gap: '0.75rem' }),
  title: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.375,
    width: 'fit-content',
  }),
  description: Style.make({
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    color: tokens.mutedForeground,
    display: '-webkit-box',
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
    textWrap: 'balance',
  }),
  actions: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
  header: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexBasis: '100%',
    justifyContent: 'space-between',
  }),
  footer: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexBasis: '100%',
    justifyContent: 'space-between',
  }),
  group: Style.make({ display: 'flex', flexDirection: 'column' }),
  listItem: Style.make({ display: 'contents' }),
  groupSm: Style.make({ gap: '0.625rem' }),
  groupMd: Style.make({ gap: '0.75rem' }),
  groupLg: Style.make({ gap: '1rem' }),
  cols2: Style.make({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
  cols3: Style.make({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  }),
  cols4: Style.make({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  }),
  separator: Style.make({
    backgroundColor: tokens.border,
    height: '1px',
    width: '100%',
  }),
}
const slotDiv =
  (slot: string, style: Style.Style) =>
  <Msg>(p: SlotProps, h: HtmlBuilder<Msg>): Html =>
    h.div(
      [h.DataAttribute('slot', slot), h.Class(className(style, p.layoutStyle))],
      [...p.children],
    )
export const itemVariants = (o: ItemVariants = {}): string =>
  className(
    reset.link,
    styles.item,
    o.variant === 'outline' && styles.outline,
    o.variant === 'muted' && styles.muted,
    o.orientation === 'vertical' && styles.vertical,
    o.size === 'sm' && styles.sm,
    o.size === 'xs' && styles.xs,
  )
export type ItemProps = SlotProps &
  Readonly<{
    variant?: ItemVariants['variant']
    size?: ItemVariants['size']
    orientation?: ItemVariants['orientation']
    element?: 'div' | 'li' | 'article' | 'a'
    href?: string
    target?: string
    rel?: string
  }>
export const item = <Msg>(p: ItemProps, h: HtmlBuilder<Msg>): Html => {
  const variant = p.variant ?? 'default',
    size = p.size ?? 'default',
    attrs = [
      h.DataAttribute('slot', 'item'),
      h.DataAttribute('variant', variant),
      h.DataAttribute('size', size),
      h.Class(
        className(
          reset.link,
          styles.item,
          variant === 'outline' && styles.outline,
          variant === 'muted' && styles.muted,
          p.orientation === 'vertical' && styles.vertical,
          size === 'sm' && styles.sm,
          size === 'xs' && styles.xs,
          When.marker('default-marker'),
          p.layoutStyle,
        ),
      ),
    ],
    children = [...p.children]
  return p.element === 'li'
    ? h.li(attrs, children)
    : p.element === 'article'
      ? h.article(attrs, children)
      : p.element === 'a'
        ? h.a(
            [
              h.Class(className(reset.link)),
              ...attrs,
              h.Href(p.href ?? '#'),
              ...(p.target === undefined
                ? []
                : [h.Attribute('target', p.target)]),
              ...(p.rel === undefined ? [] : [h.Rel(p.rel)]),
            ],
            children,
          )
        : h.div(attrs, children)
}
export const itemMediaVariants = (o: ItemMediaVariants = {}): string =>
  className(
    styles.media,
    o.variant === 'icon' && styles.mediaIcon,
    o.variant === 'image' && styles.mediaImage,
  )
export type ItemMediaProps = SlotProps &
  Readonly<{ variant?: ItemMediaVariants['variant'] }>
export const itemMedia = <Msg>(p: ItemMediaProps, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'item-media'),
      h.DataAttribute('variant', p.variant ?? 'default'),
      h.Class(
        className(
          styles.media,
          p.variant === 'icon' && styles.mediaIcon,
          p.variant === 'image' && styles.mediaImage,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export type ItemContentProps = SlotProps &
  Readonly<{ spacing?: 'default' | 'md' }>
export const itemContent = <Msg>(
  p: ItemContentProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'item-content'),
      h.Class(
        className(
          styles.content,
          p.spacing === 'md' && styles.contentMd,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export const itemTitle = slotDiv('item-title', styles.title)
export const itemDescription = <Msg>(p: SlotProps, h: HtmlBuilder<Msg>): Html =>
  h.p(
    [
      h.DataAttribute('slot', 'item-description'),
      h.Class(className(reset.text, styles.description, p.layoutStyle)),
      h.Style({ WebkitLineClamp: '2' }),
    ],
    [...p.children],
  )
export const itemActions = slotDiv('item-actions', styles.actions)
export const itemHeader = slotDiv('item-header', styles.header)
export const itemFooter = slotDiv('item-footer', styles.footer)
/** Decorative separator between ItemGroup entries; never a list item. */
export type ItemGroupSeparator = Readonly<{
  render: <Msg>(h: HtmlBuilder<Msg>) => Html
}>
const groupSeparators = new WeakSet<object>()
export const itemGroupSeparator = (
  props: ItemSeparatorProps = {},
): ItemGroupSeparator => {
  const entry: ItemGroupSeparator = {
    render: h => itemSeparator(props, h),
  }
  groupSeparators.add(entry)
  return entry
}
export type ItemGroupEntry = Html | string | ItemGroupSeparator
const isGroupSeparator = (entry: ItemGroupEntry): entry is ItemGroupSeparator =>
  typeof entry === 'object' && entry !== null && groupSeparators.has(entry)

export type ItemGroupProps = Readonly<{
  children: ReadonlyArray<ItemGroupEntry>
  layoutStyle?: ComponentLayoutStyle | undefined
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  columns?: 2 | 3 | 4
}>
export const itemGroup = <Msg>(p: ItemGroupProps, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.Role('list'),
      h.DataAttribute('slot', 'item-group'),
      h.Class(
        className(
          styles.group,
          p.spacing === 'sm' && styles.groupSm,
          p.spacing === 'md' && styles.groupMd,
          p.spacing === 'lg' && styles.groupLg,
          p.columns === 2 && styles.cols2,
          p.columns === 3 && styles.cols3,
          p.columns === 4 && styles.cols4,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children].map(child =>
      isGroupSeparator(child)
        ? child.render(h)
        : h.div(
            [
              h.Role('listitem'),
              h.DataAttribute('slot', 'item-listitem'),
              h.Class(className(styles.listItem)),
            ],
            [child],
          ),
    ),
  )
export type ItemSeparatorProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
}>
export const itemSeparator = <Msg>(
  p: ItemSeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Role('none'),
      h.DataAttribute('slot', 'item-separator'),
      h.DataAttribute('orientation', 'horizontal'),
      h.Class(className(styles.separator, p.layoutStyle)),
    ],
    [],
  )
