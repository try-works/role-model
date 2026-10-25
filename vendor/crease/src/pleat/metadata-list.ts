import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Behavior from '@/lib/metadata-list'
import type { ComponentLayoutStyle } from './contracts'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

export {
  Model,
  Message,
  init,
  update,
  resolveLayout,
} from '@/lib/metadata-list'
export type {
  MetadataListColumns,
  MetadataListLabelConfig,
  MetadataListOrientation,
} from '@/lib/metadata-list'

/* Ported from Meta Astryx MetadataList.tsx + MetadataListItem.tsx —
   StyleX renderer. See src/ui/metadata-list.ts for the contract notes. */

export type MetadataListProps<Msg> = Readonly<{
  model: Behavior.Model
  toParentMessage: (message: Behavior.Message) => Msg
  id: string
  columns?: Behavior.MetadataListColumns
  label?: Behavior.MetadataListLabelConfig
  maxNumOfItems?: number
  orientation?: Behavior.MetadataListOrientation
  title?: Html | string
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const styles = {
  root: Style.make({ display: 'flex', flexDirection: 'column' }),
  title: Style.make({ marginBottom: '0.75rem' }),
  dl: Style.make({ margin: 0, padding: 0 }),
  gridSingle: Style.make({
    alignItems: 'baseline',
    columnGap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    rowGap: '0.5rem',
  }),
  gridMulti: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  }),
  gridStackedSingle: Style.make({
    gap: '0.75rem',
    display: 'grid',
    gridTemplateColumns: '1fr',
  }),
  gridStackedMulti: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  }),
  horizontal: Style.make({
    gap: '1rem',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  }),
  toggleButton: Style.make({
    background: 'none',
    borderStyle: 'none',
    paddingBlock: '0.5rem',
    paddingInline: 0,
    alignSelf: 'flex-start',
    appearance: 'none',
    color: tokens.primary,
    cursor: interactionTokens.cursorAction,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    textAlign: 'start',
  }),
}

/* astryx drops the pointer cursor when disabled — this toggle is never
   rendered disabled, so cursorAction alone covers it. */

const GRID_STYLE: Readonly<
  Record<
    Exclude<ReturnType<typeof Behavior.resolveLayout>['kind'], 'horizontal'>,
    Style.Style
  >
> = {
  'grid-single': styles.gridSingle,
  'grid-multi': styles.gridMulti,
  'grid-stacked-single': styles.gridStackedSingle,
  'grid-stacked-multi': styles.gridStackedMulti,
}

export const metadataList = <Msg>(
  props: MetadataListProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { model, toParentMessage, id, title, children } = props
  const layout = Behavior.resolveLayout(props)
  const isHorizontal = layout.kind === 'horizontal'
  const items = children ?? []
  const effectiveMax = isHorizontal ? undefined : props.maxNumOfItems
  const isExceedMax = effectiveMax !== undefined && items.length > effectiveMax
  const visibleItems =
    isExceedMax && !model.isOpen ? items.slice(0, effectiveMax) : items

  return h.div(
    [
      h.DataAttribute('slot', 'metadata-list'),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      ...(title === undefined
        ? []
        : [
            h.div(
              [
                h.DataAttribute('slot', 'metadata-list-title'),
                h.Class(className(styles.title)),
              ],
              [title],
            ),
          ]),
      h.dl(
        [
          h.Id(`${id}-content`),
          h.DataAttribute('slot', 'metadata-list-items'),
          h.Class(
            className(
              reset.text,
              styles.dl,
              isHorizontal ? styles.horizontal : GRID_STYLE[layout.kind],
            ),
          ),
          ...(layout.gridTemplateColumns === undefined
            ? []
            : [
                h.Style({
                  gridTemplateColumns: layout.gridTemplateColumns,
                }),
              ]),
        ],
        [...visibleItems],
      ),
      ...(isExceedMax
        ? [
            h.button(
              [
                h.Type('button'),
                h.DataAttribute('slot', 'metadata-list-toggle'),
                h.AriaControls(`${id}-content`),
                h.AriaExpanded(model.isOpen),
                h.OnClick(toParentMessage(Behavior.Message.ToggledShowAll())),
                h.Class(className(reset.button, styles.toggleButton)),
              ],
              [model.isOpen ? 'Show less' : 'Show more'],
            ),
          ]
        : []),
    ],
  )
}

const itemStyles = {
  label: Style.make({
    margin: 0,
    padding: 0,
    gap: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    overflowWrap: 'break-word',
    minHeight: '24px',
  }),
  value: Style.make({
    margin: 0,
    padding: 0,
    color: tokens.foreground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    overflowWrap: 'break-word',
    minHeight: '24px',
  }),
  stackedWrapper: Style.make({
    gap: '0.125rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  stackedLabel: Style.make({
    margin: 0,
    padding: 0,
    gap: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  stackedValue: Style.make({
    margin: 0,
    padding: 0,
    color: tokens.foreground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    overflowWrap: 'break-word',
  }),
  contents: Style.make({ display: 'contents' }),
  iconWrapper: Style.make({
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
  }),
}

export type MetadataListItemProps = Readonly<{
  label: Html | string
  icon?: Html
  stacked?: boolean
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export const metadataListItem = <Msg>(
  props: MetadataListItemProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const { label, icon, children } = props
  const labelContent: ReadonlyArray<Html | string> = [
    ...(icon === undefined
      ? []
      : [
          h.span(
            [
              h.DataAttribute('slot', 'metadata-list-item-icon'),
              h.AriaHidden(true),
              h.Class(className(itemStyles.iconWrapper)),
            ],
            [icon],
          ),
        ]),
    label,
  ]

  if (props.stacked === true) {
    return h.div(
      [
        h.DataAttribute('slot', 'metadata-list-item'),
        h.Class(className(itemStyles.stackedWrapper, props.layoutStyle)),
      ],
      [
        h.dt([h.Class(className(itemStyles.stackedLabel))], [...labelContent]),
        h.dd(
          [h.Class(className(reset.text, itemStyles.stackedValue))],
          [...(children ?? [])],
        ),
      ],
    )
  }

  /* display:contents wrapper stands in for astryx's fragment — the dt/dd
     pair still lands as direct grid items. */
  return h.div(
    [
      h.DataAttribute('slot', 'metadata-list-item'),
      h.Class(className(itemStyles.contents, props.layoutStyle)),
    ],
    [
      h.dt([h.Class(className(itemStyles.label))], [...labelContent]),
      h.dd(
        [h.Class(className(reset.text, itemStyles.value))],
        [...(children ?? [])],
      ),
    ],
  )
}
