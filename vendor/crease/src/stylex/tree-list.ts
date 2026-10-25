import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx TreeList (packages/core/src/TreeList/) — StyleX
   renderer; visual spec adapted to Crease UI tokens. */

import { Option } from 'effect'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import * as Icon from '@/lib/icon'
import * as TreeListBehavior from '@/lib/tree-list'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { treeItemScope } from './tree-list.markers.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

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

const styles = stylex.create({
  root: {
    position: 'relative',
  },
  list: {
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
  header: {
    marginBottom: '0.5rem',
  },
  item: {
    margin: 0,
    padding: 0,
    outlineStyle: 'none',
    position: 'relative',
    width: '100%',
  },
  branches: {
    margin: 0,
    padding: 0,
    paddingInlineStart: '0.5rem',
  },
  branchContainer: {
    position: 'absolute',
    height: '100%',
    width: '1.25rem',
  },
  verticalLine: {
    margin: 'auto',
    borderRadius: '50%',
    backgroundColor: tokens.input,
    insetInlineEnd: 0,
    insetInlineStart: 0,
    position: 'absolute',
    width: '1px',
  },
  verticalFull: {
    height: 'calc(100% + 1px)',
  },
  verticalLast: {
    height: 'calc(100% - var(--tree-list-row-gap, 0px) / 2)',
  },
  rowWrapper: {
    paddingBlock: 'calc(var(--tree-list-row-gap,0px) / 2)',
    position: 'relative',
  },
  contentWrapper: {
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    overflow: 'hidden',
    paddingInline: '0.5rem',
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: 1.4286,
    marginInlineStart: 'var(--_tree-indent, 0px)',
    position: 'relative',
    textAlign: 'start',
  },
  interactive: {
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
    },
    boxShadow: {
      default: 'none',
      [stylex.when.ancestor(':focus-visible', treeItemScope)]:
        tokens.focusRingShadow,
      ':has(:focus-visible)': tokens.focusRingShadow,
    },
    cursor: interactionTokens.cursorAction,
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  disabled: {
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
  },
  selected: {
    backgroundColor: tokens.accent,
  },
  invisibleButton: {
    font: 'inherit',
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    flex: '1',
    appearance: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    outlineStyle: 'none',
    textAlign: 'start',
    minWidth: 0,
  },
  invisibleAnchor: {
    font: 'inherit',
    flex: '1',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    outlineStyle: 'none',
    textAlign: 'start',
    minWidth: 0,
  },
  content: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'start',
    minWidth: 0,
  },
  label: {
    color: tokens.foreground,
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: 1.6667,
  },
  startContent: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
  },
  endContent: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    marginInlineStart: 'auto',
  },
  chevronButton: {
    padding: 0,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'none',
    borderWidth: 0,
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    color: tokens.mutedForeground,
    cursor: {
      default: interactionTokens.cursorAction,
      ':is(:disabled,[aria-disabled="true"])': interactionTokens.cursorDefault,
    },
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    marginInlineEnd: 'calc(0.25rem * -1)',
    marginInlineStart: '0.25rem',
    height: '1rem',
    width: '1rem',
  },
  chevronSvg: {
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1rem',
    width: '1rem',
  },
  chevronExpanded: {
    transform: {
      default: 'rotate(90deg)',
      ':is([dir="rtl"] *)': 'scaleX(-1) rotate(90deg)',
    },
  },
  chevronCollapsed: {
    transform: {
      default: 'rotate(0deg)',
      ':is([dir="rtl"] *)': 'scaleX(-1) rotate(0deg)',
    },
  },
})

const densityStyles = stylex.create({
  compact: {
    paddingBlock: '0.25rem',
  },
  balanced: {
    paddingBlock: '0.5rem',
  },
  spacious: {
    paddingBlock: '0.75rem',
  },
})

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
    if (!ancestorIsLast && ancestorLevel !== level - 1) {
      containers.push(
        h.div(
          [
            h.Class(className(styles.branchContainer)),
            h.Style({
              insetInlineStart: `calc(10px + ${String(ancestorLevel)} * var(--tree-list-indent))`,
            }),
          ],
          [
            h.div(
              [h.Class(className(styles.verticalLine, styles.verticalFull))],
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
          h.Class(className(styles.branchContainer)),
          h.Style({
            insetInlineStart: `calc(10px + ${String(level - 1)} * var(--tree-list-indent))`,
          }),
        ],
        [
          h.div(
            [
              h.Class(
                className(
                  styles.verticalLine,
                  isLast ? styles.verticalLast : styles.verticalFull,
                ),
              ),
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
          h.Class(className(reset.button, styles.chevronButton)),
        ],
        [
          Icon.icon<Msg>(
            'chevron-right',
            {
              class: className(
                styles.chevronSvg,
                expanded ? styles.chevronExpanded : styles.chevronCollapsed,
              ),
            },
            h,
          ),
        ],
      )
    : null

  const labelAndDescription: Array<Html> = [
    h.span(
      [h.Id(labelId), h.Class(className(styles.label))],
      [item.label as Html],
    ),
    ...(item.description === undefined
      ? []
      : [
          h.span(
            [h.Id(descriptionId), h.Class(className(styles.description))],
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
            h.Class(className(reset.link, styles.invisibleAnchor)),
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
              h.Class(className(reset.button, styles.invisibleButton)),
            ],
            labelAndDescription,
          )
        : h.span([h.Class(className(styles.content))], labelAndDescription)

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
      h.Class(className(styles.item, interactive && treeItemScope)),
    ],
    [
      ctx.variant === 'noGuides'
        ? ''
        : h.div(
            [h.Class(className(styles.branches)), h.AriaHidden(true)],
            branchContainers(ancestorsIsLast, isLast, level, h),
          ),
      h.div(
        [h.Class(className(styles.rowWrapper))],
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
                className(
                  styles.contentWrapper,
                  densityStyles[ctx.density],
                  interactive && styles.interactive,
                  disabled && styles.disabled,
                  item.isSelected === true && styles.selected,
                ),
              ),
            ],
            [
              ...(chevron === null ? [] : [chevron]),
              ...(item.startContent === undefined
                ? []
                : [
                    h.span(
                      [h.Class(className(styles.startContent))],
                      [item.startContent as Html],
                    ),
                  ]),
              content,
              ...(item.endContent === undefined
                ? []
                : [
                    h.span(
                      [h.Class(className(styles.endContent))],
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
              [h.Role('group'), h.Class(className(reset.list, styles.list))],
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
  layoutStyle?: ComponentLayoutStyle
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

  const findItem = (
    list: ReadonlyArray<TreeListBehavior.TreeListItemData>,
    id: string,
  ): TreeListBehavior.TreeListItemData | undefined => {
    for (const entry of list) {
      if (entry.id === id) {
        return entry
      }
      const found = findItem(entry.children ?? [], id)
      if (found !== undefined) {
        return found
      }
    }
    return undefined
  }

  return h.div(
    [
      h.DataAttribute('slot', 'tree-list'),
      h.Class(className(styles.root, viewInputs.layoutStyle)),
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
            const item = findItem(viewInputs.items, intent.id)
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
        : [
            h.div(
              [h.Class(className(styles.header)), h.Id(headerId)],
              [viewInputs.header],
            ),
          ]),
      h.ul(
        [
          h.Role('tree'),
          h.Class(className(reset.list, styles.list)),
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
