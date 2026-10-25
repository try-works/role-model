import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Behavior from '@/lib/metadata-list'
import { cn } from '@/lib/utils'

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
   a read-only labeled list rendering semantic dl/dt/dd, with single/multi/
   numeric column layouts, horizontal orientation, and a "Show more" cap. */

export type MetadataListProps<Msg> = Readonly<{
  model: Behavior.Model
  toParentMessage: (message: Behavior.Message) => Msg
  /** Stable id — anchors the show-more toggle's aria-controls. */
  id: string
  /** @default 'single' */
  columns?: Behavior.MetadataListColumns
  label?: Behavior.MetadataListLabelConfig
  /** Max items before collapsing behind a Show more/less toggle. */
  maxNumOfItems?: number
  /** @default 'vertical' — 'horizontal' ignores columns/label/maxNumOfItems. */
  orientation?: Behavior.MetadataListOrientation
  /** Heading rendered above the list. */
  title?: Html | string
  children?: ReadonlyArray<Html | string>
  class?: string
}>

const GRID_CLASS: Readonly<
  Record<
    Exclude<ReturnType<typeof Behavior.resolveLayout>['kind'], 'horizontal'>,
    string
  >
> = {
  'grid-single':
    'grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2',
  'grid-multi': 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4',
  'grid-stacked-single': 'grid grid-cols-1 gap-3',
  'grid-stacked-multi':
    'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4',
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
      h.Class(cn('flex flex-col', props.class)),
    ],
    [
      ...(title === undefined
        ? []
        : [
            h.div(
              [h.DataAttribute('slot', 'metadata-list-title'), h.Class('mb-3')],
              [title],
            ),
          ]),
      h.dl(
        [
          h.Id(`${id}-content`),
          h.DataAttribute('slot', 'metadata-list-items'),
          h.Class(
            cn(
              'm-0 p-0',
              isHorizontal
                ? 'flex flex-row flex-wrap gap-4'
                : GRID_CLASS[layout.kind],
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
                h.Class(
                  /* astryx accent text → crease primary */
                  'cursor-pointer appearance-none self-start border-none bg-transparent px-0 py-2 text-left text-sm font-medium text-primary',
                ),
              ],
              [model.isOpen ? 'Show less' : 'Show more'],
            ),
          ]
        : []),
    ],
  )
}

export type MetadataListItemProps = Readonly<{
  label: Html | string
  icon?: Html
  /** Render the label above the value inside a wrapper (top labels and
      horizontal layouts). The parent MetadataList resolves this. */
  stacked?: boolean
  children?: ReadonlyArray<Html | string>
  class?: string
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
              h.Class(
                'inline-flex shrink-0 items-center text-muted-foreground',
              ),
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
        h.Class(cn('flex flex-col gap-0.5', props.class)),
      ],
      [
        h.dt(
          [
            h.Class(
              'flex items-center gap-2 text-sm font-medium text-muted-foreground',
            ),
          ],
          [...labelContent],
        ),
        h.dd(
          [h.Class('m-0 p-0 text-sm wrap-break-word')],
          [...(children ?? [])],
        ),
      ],
    )
  }

  /* Inline layout: dt and dd are direct grid children. foldkit Html is a
     single node — a display:contents wrapper stands in for the fragment so
     the pair still lands as two grid items. */
  return h.div(
    [h.DataAttribute('slot', 'metadata-list-item'), h.Class('contents')],
    [
      h.dt(
        [
          h.Class(
            cn(
              'm-0 flex min-h-6 items-center gap-2 wrap-break-word p-0 text-sm font-medium text-muted-foreground',
              props.class,
            ),
          ),
        ],
        [...labelContent],
      ),
      h.dd(
        [h.Class('m-0 min-h-6 wrap-break-word p-0 text-sm')],
        [...(children ?? [])],
      ),
    ],
  )
}
