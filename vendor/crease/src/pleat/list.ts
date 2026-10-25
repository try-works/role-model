import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

/* Ported from Meta Astryx List + ListItem (packages/core/src/List/List.tsx,
   ListItem.tsx, Item/Item.tsx) — examples and visual spec adapted to Crease
   UI tokens. astryx shares List → ListItem configuration via React context;
   Crease UI helpers are context-free, so `listItem` takes `density`,
   `listStyle`, `hasDividers`, and `edgeCompensation` explicitly (defaults
   match astryx's context defaults — pass the same values to each item). */

export type ListDensity = 'compact' | 'balanced' | 'spacious'

export type ListMarkerStyle = 'none' | 'disc' | 'decimal' | 'circle'

export type ListEdgeCompensation = 'inline'

const styles = {
  root: Style.make({ display: 'flex', flexDirection: 'column' }),
  list: Style.make({
    margin: 0,
    gap: '2px',
    display: 'flex',
    flexDirection: 'column',
    listStyleType: 'none',
    paddingInlineStart: 0,
  }),
  withDividers: Style.make({ gap: '0px' }),
  header: Style.make({ marginBottom: '0.5rem' }),
  item: Style.make({
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    paddingInline: 'var(--_item-inset-inline)',
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    position: 'relative',
    textAlign: 'start',
  }),
  itemDivider: Style.make({
    borderRadius: '0px',
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: '1px',
  }).pipe(Style.when(When.lastChild, { borderBlockEndWidth: 0 })),
  itemEdgeCompensation: Style.make({
    marginInlineEnd:
      'calc(-1 * min(var(--_item-inset-inline), var(--container-padding-inline-end, 0px)))',
    marginInlineStart:
      'calc(-1 * min(var(--_item-inset-inline), var(--container-padding-inline-start, 0px)))',
  }),
  itemInteractive: Style.make({
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorAction,
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.mutedHover }),
    Style.when(When.active, {
      backgroundColor: foundationTokens.foregroundSoft,
    }),
    Style.when(When.pseudo(':is(:disabled,[aria-disabled="true"])'), {
      cursor: interactionTokens.cursorDefault,
    }),
  ),
  itemSelected: Style.make({ backgroundColor: foundationTokens.primarySoft }),
  itemDisabled: Style.make({
    cursor: interactionTokens.cursorDefault,
    pointerEvents: 'none',
  }),
  markerContainer: Style.make({
    alignItems: 'center',
    alignSelf: 'baseline',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    marginTop: 'calc((1em * 1.4286 - 6px) / 2)',
    width: '1rem',
  }),
  markerDot: Style.make({
    borderRadius: '50%',
    backgroundColor: tokens.foreground,
    height: '6px',
    width: '6px',
  }),
  markerCircle: Style.make({
    borderColor: tokens.foreground,
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: 'transparent',
    height: '6px',
    width: '6px',
  }),
  markerNumber: Style.make({
    alignSelf: 'baseline',
    color: tokens.foreground,
    flexShrink: 0,
    fontSize: '0.875rem',
    lineHeight: 1.4286,
    width: '1rem',
  }).pipe(Style.when(When.before, { content: 'counter(crease-list) "."' })),
  itemCounter: Style.make({ counterIncrement: 'crease-list' }),
  invisibleButton: Style.make({
    margin: 0,
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'inherit',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    outlineStyle: 'none',
    textAlign: 'start',
    minWidth: 0,
  }),
  invisibleAnchor: Style.make({
    margin: 0,
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    textDecoration: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'inherit',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    outlineStyle: 'none',
    textAlign: 'start',
    minWidth: 0,
  }),
  content: Style.make({
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    textAlign: 'start',
    minWidth: 0,
  }),
  label: Style.make({
    color: tokens.foreground,
    fontSize: '0.875rem',
    lineHeight: 1.4286,
  }),
  labelTruncate: Style.make({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: 1.6667,
  }),
  startContent: Style.make({
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: '0',
    flexShrink: '0',
  }),
  endContent: Style.make({
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: '0',
    flexShrink: '0',
    marginInlineStart: 'auto',
  }),
  disabledContent: Style.make({ opacity: 0.5 }),
}

const densityStyles = {
  compact: Style.make({ paddingBlock: '0.25rem' }),
  balanced: Style.make({ paddingBlock: '0.5rem' }),
  spacious: Style.make({ paddingBlock: '0.75rem' }),
}

const densityInsetInline: Record<ListDensity, string> = {
  compact: '8px',
  balanced: '8px',
  spacious: '12px',
}

export type ListProps = Readonly<{
  children: ReadonlyArray<Html>
  density?: ListDensity
  hasDividers?: boolean
  edgeCompensation?: ListEdgeCompensation
  /** Header content rendered above the list, associated via aria-labelledby. */
  header?: Html | string
  /** List marker style. `'decimal'` renders an `<ol>`; others render `<ul>`. */
  listStyle?: ListMarkerStyle
  /** Starting number for `listStyle: 'decimal'` lists. */
  start?: number
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export const list = <Msg>(props: ListProps, h: HtmlBuilder<Msg>): Html => {
  const listStyle = props.listStyle ?? 'none'
  const hasDividers = props.hasDividers ?? false
  const start = props.start ?? 1
  const isOrdered = listStyle === 'decimal'
  const headerId = 'list-header'

  const attributes = [
    h.DataAttribute('slot', 'list'),
    h.Role('list'),
    ...(props.header !== undefined ? [h.AriaLabelledBy(headerId)] : []),
    ...(isOrdered && start !== 1 ? [h.Start(start)] : []),
    h.Class(
      className(
        styles.list,
        hasDividers ? styles.withDividers : null,
        props.layoutStyle,
      ),
    ),
    ...(listStyle !== 'none'
      ? [
          h.Style({
            counterReset:
              start !== 1 ? `crease-list ${start - 1}` : 'crease-list',
          }),
        ]
      : []),
  ]

  const listElement = isOrdered
    ? h.ol(attributes, [...props.children])
    : h.ul(attributes, [...props.children])

  if (props.header === undefined) {
    return listElement
  }
  return h.div(
    [h.Class(className(styles.root))],
    [
      h.div(
        [h.Id(headerId), h.Class(className(styles.header))],
        [props.header],
      ),
      listElement,
    ],
  )
}

const markerElement = <Msg>(
  listStyle: ListMarkerStyle,
  h: HtmlBuilder<Msg>,
): Html | null => {
  switch (listStyle) {
    case 'disc':
      return h.span(
        [h.AriaHidden(true), h.Class(className(styles.markerContainer))],
        [h.span([h.Class(className(styles.markerDot))], [])],
      )
    case 'circle':
      return h.span(
        [h.AriaHidden(true), h.Class(className(styles.markerContainer))],
        [h.span([h.Class(className(styles.markerCircle))], [])],
      )
    case 'decimal':
      return h.span(
        [h.AriaHidden(true), h.Class(className(styles.markerNumber))],
        [],
      )
    case 'none':
      return null
  }
}

export type ListItemProps<Msg> = Readonly<{
  /** Primary label. A plain string truncates to one line. */
  label: Html | string
  /** Secondary description under the label; strings truncate to one line. */
  description?: Html | string
  /** Content rendered before the item (icon, avatar, checkbox). */
  startContent?: Html
  /** Content rendered after the item (badge, action, chevron). */
  endContent?: Html
  onClick?: Msg
  href?: string
  target?: '_blank' | '_self'
  rel?: string
  isDisabled?: boolean
  isSelected?: boolean
  /** Density — pass the parent list's `density` (default `'balanced'`). */
  density?: ListDensity
  /** Marker style — pass the parent list's `listStyle` (default `'none'`). */
  listStyle?: ListMarkerStyle
  /** Dividers — pass the parent list's `hasDividers` (default `false`). */
  hasDividers?: boolean
  /** Edge compensation — pass the parent list's `edgeCompensation`. */
  edgeCompensation?: ListEdgeCompensation
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const labelOrDescription = <Msg>(
  content: Html | string,
  style: Style.Style,
  truncate: Style.Style,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> =>
  typeof content === 'string'
    ? [h.span([h.Class(className(style, truncate))], [content])]
    : [h.span([h.Class(className(style))], [content])]

export const listItem = <Msg>(
  props: ListItemProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const density = props.density ?? 'balanced'
  const listStyle = props.listStyle ?? 'none'
  const hasDividers = props.hasDividers ?? false
  const isDisabled = props.isDisabled ?? false
  const isSelected = props.isSelected ?? false
  const isInteractive = props.onClick !== undefined || props.href !== undefined

  const marker = markerElement(listStyle, h)

  const labelDescription: ReadonlyArray<Html | string> = [
    ...labelOrDescription(props.label, styles.label, styles.labelTruncate, h),
    ...(props.description === undefined
      ? []
      : labelOrDescription(
          props.description,
          styles.description,
          styles.labelTruncate,
          h,
        )),
  ]

  const contentElement: Html =
    props.href !== undefined
      ? h.a(
          [
            h.DataAttribute('slot', 'list-item-anchor'),
            h.Href(props.href),
            ...(props.target === undefined ? [] : [h.Target(props.target)]),
            ...(props.target === '_blank'
              ? [h.Rel(`${props.rel ?? ''} noopener noreferrer`.trim())]
              : props.rel === undefined
                ? []
                : [h.Rel(props.rel)]),
            ...(isDisabled ? [h.AriaDisabled(true), h.Tabindex(-1)] : []),
            h.Class(
              className(
                reset.link,
                styles.invisibleAnchor,
                isDisabled ? styles.disabledContent : null,
              ),
            ),
          ],
          [...labelDescription],
        )
      : props.onClick !== undefined
        ? h.button(
            [
              h.Type('button'),
              h.DataAttribute('slot', 'list-item-button'),
              h.OnClick(props.onClick),
              h.Disabled(isDisabled),
              h.Class(
                className(
                  reset.button,
                  styles.invisibleButton,
                  isDisabled ? styles.disabledContent : null,
                ),
              ),
            ],
            [...labelDescription],
          )
        : h.span(
            [
              h.DataAttribute('slot', 'list-item-content'),
              h.Class(
                className(
                  styles.content,
                  isDisabled ? styles.disabledContent : null,
                ),
              ),
            ],
            [...labelDescription],
          )

  return h.li(
    [
      h.DataAttribute('slot', 'list-item'),
      h.DataAttribute('density', density),
      ...(isDisabled ? [h.AriaDisabled(true)] : []),
      // listitem is not an aria-selected-permitted role — convey selection
      // via aria-current like astryx does.
      ...(isSelected ? [h.AriaCurrent('true')] : []),
      h.Class(
        className(
          styles.item,
          densityStyles[density],
          listStyle !== 'none' ? styles.itemCounter : null,
          hasDividers ? styles.itemDivider : null,
          props.edgeCompensation === 'inline'
            ? styles.itemEdgeCompensation
            : null,
          isInteractive ? styles.itemInteractive : null,
          isSelected ? styles.itemSelected : null,
          isDisabled ? styles.itemDisabled : null,
          props.layoutStyle,
        ),
      ),
      h.Style({
        '--_item-inset-inline': densityInsetInline[density],
      }),
    ],
    [
      ...(marker === null ? [] : [marker]),
      ...(props.startContent === undefined
        ? []
        : [
            h.span(
              [
                h.DataAttribute('slot', 'list-item-start'),
                h.Class(className(styles.startContent)),
              ],
              [props.startContent],
            ),
          ]),
      contentElement,
      ...(props.endContent === undefined
        ? []
        : [
            h.span(
              [
                h.DataAttribute('slot', 'list-item-end'),
                h.Class(
                  className(
                    styles.endContent,
                    isDisabled ? styles.disabledContent : null,
                  ),
                ),
              ],
              [props.endContent],
            ),
          ]),
    ],
  )
}
