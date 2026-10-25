/* Ported from Meta Astryx TreeList (packages/core/src/TreeList/) — examples
   and visual spec adapted to Crease UI tokens. */

import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import * as Icon from '@/lib/icon'
import * as TreeListBehavior from '@/lib/tree-list'
import { cn } from '@/lib/utils'

export {
  Message,
  Model,
  OutMessage,
  findInitialTabbableId,
  init,
  isItemExpanded,
  resolveKey,
  tabbableId,
  update,
  visibleItems,
} from '@/lib/tree-list'
export type {
  InitConfig,
  TreeListDensity,
  TreeListItemData,
  UpdateReturn,
  TreeListVariant,
  VisibleItem,
} from '@/lib/tree-list'

const DENSITY_CLASS: Readonly<
  Record<TreeListBehavior.TreeListDensity, string>
> = {
  compact: 'py-1',
  balanced: 'py-2',
  spacious: 'py-3',
}

// spacing-4 (16px) chevron column + spacing-2 (8px) gap — the fixed reserve a
// leaf adds under an expandable ancestor's caret.
const CHEVRON_COLUMN = '16px + 8px'

const indentStyle = (
  level: number,
  reservesChevronColumn: boolean,
): Record<string, string> => ({
  '--_tree-indent': reservesChevronColumn
    ? `calc(${String(level)} * var(--tree-list-indent) + ${CHEVRON_COLUMN})`
    : `calc(${String(level)} * var(--tree-list-indent))`,
})

type RenderContext<Msg> = Readonly<{
  model: TreeListBehavior.Model
  toMessage: (message: TreeListBehavior.Message) => Msg
  density: TreeListBehavior.TreeListDensity
  variant: TreeListBehavior.TreeListVariant
  hasExpandableItems: boolean
  tabbable: string | undefined
  h: HtmlBuilder<Msg>
}>

const branchContainers = <Msg>(
  ancestorsIsLast: ReadonlyArray<boolean>,
  isLast: boolean,
  level: number,
  h: HtmlBuilder<Msg>,
): Array<Html> => {
  const containers: Array<Html> = []
  ancestorsIsLast.forEach((ancestorIsLast, ancestorLevel) => {
    // The row's own connector column (nestedLevel - 1) renders below.
    if (!ancestorIsLast && ancestorLevel !== level - 1) {
      containers.push(
        h.div(
          [
            h.Class('absolute h-full w-5'),
            h.Style({
              insetInlineStart: `calc(10px + ${String(ancestorLevel)} * var(--tree-list-indent))`,
            }),
          ],
          [
            h.div(
              [
                h.Class(
                  'absolute inset-x-0 top-0 mx-auto w-px rounded-[1px] bg-input',
                ),
                h.Style({ height: 'calc(100% + 1px)' }),
              ],
              [],
            ),
          ],
        ),
      )
    }
  })
  if (level > 0) {
    containers.push(
      h.div(
        [
          h.Class('absolute h-full w-5'),
          h.Style({
            insetInlineStart: `calc(10px + ${String(level - 1)} * var(--tree-list-indent))`,
          }),
        ],
        [
          h.div(
            [
              h.Class(
                'absolute inset-x-0 top-0 mx-auto w-px rounded-[1px] bg-input',
              ),
              h.Style({
                height: isLast
                  ? 'calc(100% - var(--tree-list-row-gap, 0px) / 2)'
                  : 'calc(100% + 1px)',
              }),
            ],
            [],
          ),
        ],
      ),
    )
  }
  return containers
}

const renderItem = <Msg>(
  ctx: RenderContext<Msg>,
  item: TreeListBehavior.TreeListItemData,
  level: number,
  posInSet: number,
  setSize: number,
  ancestorsIsLast: ReadonlyArray<boolean>,
  isLast: boolean,
): Html => {
  const { h, model } = ctx
  const children = TreeListBehavior.hasChildren(item)
  const expanded = children && TreeListBehavior.isItemExpanded(item, model)
  const disabled = item.isDisabled === true
  const actionable = TreeListBehavior.isItemActionable(item)
  // astryx: interactive styling when the row has an action, or is a parent
  // whose row click toggles (onClick == null && hasChildren).
  const interactive = actionable || children
  const domId = TreeListBehavior.itemDomId(model.id, item.id)
  const labelId = TreeListBehavior.itemLabelDomId(model.id, item.id)
  const descriptionId = TreeListBehavior.itemDescriptionDomId(model.id, item.id)
  const reservesChevronColumn = ctx.hasExpandableItems && !children

  const chevron = children
    ? h.button(
        [
          h.Type('button'),
          h.AriaExpanded(expanded),
          h.AriaLabel('Toggle children'),
          h.DataAttribute('tree-toggle', ''),
          h.AriaDisabled(disabled),
          h.Tabindex(-1),
          h.OnClick(
            ctx.toMessage(
              TreeListBehavior.Message.ToggledTreeListItem({
                id: item.id,
                isExpanded: !expanded,
              }),
            ),
            { propagation: 'Stop' },
          ),
          h.Class(
            'ms-1 -me-1 flex h-4 w-4 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground disabled:cursor-default',
          ),
        ],
        [
          Icon.icon<Msg>(
            'chevron-right',
            {
              class: cn(
                'size-4 transition-transform duration-150',
                expanded
                  ? 'rotate-90 rtl:[transform:scaleX(-1)_rotate(90deg)]'
                  : 'rtl:-scale-x-100',
              ),
            },
            h,
          ),
        ],
      )
    : null

  const labelAndDescription: Array<Html> = [
    h.span([h.Id(labelId), h.Class('text-foreground')], [item.label as Html]),
    ...(item.description === undefined
      ? []
      : [
          h.span(
            [h.Id(descriptionId), h.Class('text-muted-foreground text-xs')],
            [item.description],
          ),
        ]),
  ]

  const content: Html =
    item.href !== undefined
      ? h.a(
          [
            h.Href(item.href),
            ...(item.target === undefined
              ? []
              : [h.Attribute('target', item.target)]),
            h.AriaDisabled(disabled),
            h.AriaLabelledBy(labelId),
            ...(item.description === undefined
              ? []
              : [h.AriaDescribedBy(descriptionId)]),
            h.Tabindex(-1),
            h.Id(TreeListBehavior.itemActionDomId(model.id, item.id)),
            h.Class(
              'flex min-w-0 flex-1 cursor-inherit flex-col text-start font-[inherit] text-inherit no-underline outline-none aria-disabled:cursor-default',
            ),
          ],
          labelAndDescription,
        )
      : item.onSelect === true
        ? h.button(
            [
              h.Type('button'),
              h.AriaDisabled(disabled),
              h.AriaLabelledBy(labelId),
              ...(item.description === undefined
                ? []
                : [h.AriaDescribedBy(descriptionId)]),
              h.Tabindex(-1),
              h.Id(TreeListBehavior.itemActionDomId(model.id, item.id)),
              h.OnClick(
                ctx.toMessage(
                  TreeListBehavior.Message.PressedTreeListItemAction({
                    id: item.id,
                  }),
                ),
                { propagation: 'Stop' },
              ),
              h.Class(
                'flex min-w-0 flex-1 cursor-inherit flex-col appearance-none border-0 bg-transparent p-0 text-start font-[inherit] text-inherit outline-none disabled:cursor-default',
              ),
            ],
            labelAndDescription,
          )
        : h.span(
            [h.Class('flex min-w-0 flex-1 flex-col text-start')],
            labelAndDescription,
          )

  const handleRowClick: Array<ReturnType<HtmlBuilder<Msg>['OnClick']>> =
    !disabled && interactive
      ? [
          h.OnClick(
            ctx.toMessage(
              actionable
                ? TreeListBehavior.Message.RequestedTreeListItemActivation({
                    id: item.id,
                  })
                : TreeListBehavior.Message.ToggledTreeListItem({
                    id: item.id,
                    isExpanded: !expanded,
                  }),
            ),
          ),
        ]
      : []

  return h.li(
    [
      h.Role('treeitem'),
      h.Id(domId),
      ...(children ? [h.AriaExpanded(expanded)] : []),
      h.AriaSelected(item.isSelected === true),
      h.AriaDisabled(disabled),
      h.AriaLevel(level + 1),
      h.Attribute('aria-posinset', String(posInSet)),
      h.Attribute('aria-setsize', String(setSize)),
      h.Tabindex(disabled ? -1 : ctx.tabbable === item.id ? 0 : -1),
      h.DataAttribute('tree-id', item.id),
      h.DataAttribute('tree-level', String(level + 1)),
      ...(disabled ? [h.DataAttribute('tree-disabled', '')] : []),
      h.OnFocus(
        ctx.toMessage(
          TreeListBehavior.Message.FocusedTreeListItem({ id: item.id }),
        ),
      ),
      h.Class('group relative m-0 w-full p-0 outline-none'),
    ],
    [
      ctx.variant === 'noGuides'
        ? ''
        : h.div(
            [h.Class('m-0 p-0 ps-2'), h.AriaHidden(true)],
            branchContainers(ancestorsIsLast, isLast, level, h),
          ),
      h.div(
        [
          h.Class('relative'),
          h.Style({
            paddingBlock: 'calc(var(--tree-list-row-gap, 0px) / 2)',
          }),
        ],
        [
          h.div(
            [
              h.DataAttribute('slot', 'tree-list-item'),
              ...(item.isSelected === true
                ? [h.DataAttribute('selected', '')]
                : []),
              ...(disabled ? [h.DataAttribute('disabled', '')] : []),
              h.Style(indentStyle(level, reservesChevronColumn)),
              ...handleRowClick,
              h.Class(
                cn(
                  'relative box-border flex items-center gap-2 overflow-hidden rounded-md px-2 text-start text-sm [margin-inline-start:var(--_tree-indent,0px)]',
                  DENSITY_CLASS[ctx.density],
                  interactive &&
                    'cursor-pointer transition-[background-image] duration-150 hover:bg-accent group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                  disabled && 'cursor-default opacity-50',
                  item.isSelected === true && 'bg-accent',
                ),
              ),
            ],
            [
              ...(chevron === null ? [] : [chevron]),
              ...(item.startContent === undefined
                ? []
                : [
                    h.span(
                      [h.Class('flex shrink-0 items-center')],
                      [item.startContent as Html],
                    ),
                  ]),
              content,
              ...(item.endContent === undefined
                ? []
                : [
                    h.span(
                      [h.Class('ms-auto flex shrink-0 items-center')],
                      [item.endContent as Html],
                    ),
                  ]),
            ],
          ),
        ],
      ),
      ...(expanded
        ? [
            h.ul(
              [h.Role('group'), h.Class('m-0 p-0 list-none')],
              (item.children ?? []).map((child, index) =>
                renderItem(
                  ctx,
                  child,
                  level + 1,
                  index + 1,
                  (item.children ?? []).length,
                  [...ancestorsIsLast, isLast],
                  index === (item.children ?? []).length - 1,
                ),
              ),
            ),
          ]
        : []),
    ],
  )
}

export type ViewInputs = Readonly<{
  items: ReadonlyArray<TreeListBehavior.TreeListItemData>
  density?: TreeListBehavior.TreeListDensity
  variant?: TreeListBehavior.TreeListVariant
  header?: Html
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
  class?: string
}>

const render = <Msg>(
  model: TreeListBehavior.Model,
  viewInputs: ViewInputs,
  toMessage: (message: TreeListBehavior.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = viewInputs.variant ?? 'lineGuides'
  const density = viewInputs.density ?? 'balanced'
  const direction = viewInputs.direction ?? 'ltr'
  const headerId = `${model.id}-header`
  // Equivalent to "any expandable item anywhere": an expandable descendant
  // forces its ancestors expandable — so checking roots suffices.
  const hasExpandableItems = viewInputs.items.some(
    item => item.children !== undefined && item.children.length > 0,
  )
  const ctx: RenderContext<Msg> = {
    model,
    toMessage,
    density,
    variant,
    hasExpandableItems,
    tabbable: TreeListBehavior.tabbableId(viewInputs.items, model),
    h,
  }

  return h.div(
    [
      h.DataAttribute('slot', 'tree-list'),
      h.Class(cn('relative', viewInputs.class)),
      h.Style({
        '--tree-list-indent': '16px',
        '--tree-list-row-gap': '2px',
      }),
      ...(viewInputs.direction === undefined
        ? []
        : [h.Dir(viewInputs.direction)]),
      h.OnKeyDownPreventDefault((key, modifiers) => {
        const intent = TreeListBehavior.resolveKey(
          viewInputs.items,
          model,
          key,
          modifiers,
          direction,
        )
        switch (intent._tag) {
          case 'move':
            return Option.some(
              toMessage(
                TreeListBehavior.Message.MovedTreeListFocus({
                  id: intent.id,
                }),
              ),
            )
          case 'toggle': {
            const item = (function find(
              list: ReadonlyArray<TreeListBehavior.TreeListItemData>,
            ): TreeListBehavior.TreeListItemData | undefined {
              for (const entry of list) {
                if (entry.id === intent.id) {
                  return entry
                }
                const found = find(entry.children ?? [])
                if (found !== undefined) {
                  return found
                }
              }
              return undefined
            })(viewInputs.items)
            return item === undefined
              ? Option.none()
              : Option.some(
                  toMessage(
                    TreeListBehavior.Message.ToggledTreeListItem({
                      id: intent.id,
                      isExpanded: !TreeListBehavior.isItemExpanded(item, model),
                    }),
                  ),
                )
          }
          case 'activate':
            return Option.some(
              toMessage(
                TreeListBehavior.Message.RequestedTreeListItemActivation({
                  id: intent.id,
                }),
              ),
            )
          case 'typeahead':
            return Option.some(
              toMessage(
                TreeListBehavior.Message.AppliedTreeListTypeahead({
                  key: intent.key,
                  matchedId: intent.matchedId,
                }),
              ),
            )
          case 'none':
            return Option.none()
        }
      }),
    ],
    [
      ...(viewInputs.header === undefined
        ? []
        : [h.div([h.Class('mb-2'), h.Id(headerId)], [viewInputs.header])]),
      h.ul(
        [
          h.Role('tree'),
          h.Class('m-0 list-none p-0'),
          ...(viewInputs.header === undefined
            ? viewInputs.ariaLabel === undefined
              ? []
              : [h.AriaLabel(viewInputs.ariaLabel)]
            : [h.AriaLabelledBy(headerId)]),
        ],
        viewInputs.items.map((item, index) =>
          renderItem(
            ctx,
            item,
            0,
            index + 1,
            viewInputs.items.length,
            [],
            index === viewInputs.items.length - 1,
          ),
        ),
      ),
    ],
  )
}

/** Canonical stateful view. Embed with `h.submodel`. */
export const view = defineView<
  TreeListBehavior.Model,
  TreeListBehavior.Message,
  ViewInputs
>((model, viewInputs, h) => render(model, viewInputs, message => message, h))

/** Compatibility helper. New code should use `h.submodel`. */
export type TreeListProps<Msg> = ViewInputs &
  Readonly<{
    model: TreeListBehavior.Model
    toParentMessage: (message: TreeListBehavior.Message) => Msg
  }>

export const treeList = <Msg>(
  props: TreeListProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => render(props.model, props, props.toParentMessage, h)
