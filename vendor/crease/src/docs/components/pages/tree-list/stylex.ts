import { previewLayout } from '@/docs/components/preview-layout.stylex'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  treeListFixtures,
  type TreeListFixtureItem,
} from '@/docs/components/pages/tree-list/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/stylex/badge'
import { className } from '@/stylex/style'
import * as TreeList from '@/stylex/tree-list'

const styles = stylex.create({
  wrap: { gap: '1.5rem', alignItems: 'flex-start', display: 'flex' },
  column: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  caption: {
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '1rem',
  },
  itemIcon: { height: '1rem', width: '1rem' },
})

const decorateItems = <Msg>(
  items: ReadonlyArray<TreeListFixtureItem>,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<TreeList.TreeListItemData> =>
  items.map(item => ({
    id: item.id,
    label: item.label,
    ...(item.description === undefined
      ? {}
      : { description: item.description }),
    ...(item.href === undefined ? {} : { href: item.href }),
    ...(item.onSelect === true ? { onSelect: true } : {}),
    ...(item.isSelected === true ? { isSelected: true } : {}),
    ...(item.isDisabled === true ? { isDisabled: true } : {}),
    ...(item.isExpanded === true ? { isExpanded: true } : {}),
    ...(item.startIcon === undefined
      ? {}
      : {
          startContent: Icon.icon(
            item.startIcon,
            { class: className(styles.itemIcon) },
            h,
          ),
        }),
    ...(item.endIcon !== undefined
      ? {
          endContent: Icon.icon(
            item.endIcon,
            { class: className(styles.itemIcon) },
            h,
          ),
        }
      : item.endBadge !== undefined
        ? { endContent: Badge.badge({ children: [item.endBadge] }, h) }
        : {}),
    ...(item.children === undefined
      ? {}
      : { children: decorateItems(item.children, h) }),
  }))

export const treeListStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = treeListFixtures[exampleIndex] ?? treeListFixtures[0]
  const trees = (model as { trees: Record<string, TreeList.Model> }).trees
  const treeViews = fixture.trees.map((tree, index) => {
    const key = `tree-${String(index)}`
    const treeModel = trees[key] ?? TreeList.init({ id: key })
    const submodel = h.submodel({
      slotId: `docs-stylex-tree-list-${String(index)}`,
      model: treeModel,
      view: TreeList.view,
      viewInputs: {
        items: decorateItems(fixture.items, h),
        variant: tree.variant,
      },
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag: 'GotTreeListPreviewMessage',
            key,
            message,
          }),
        ),
    })
    return tree.caption === undefined
      ? submodel
      : h.div(
          [h.Class(className(styles.column))],
          [
            h.div([h.Class(className(styles.caption))], [tree.caption]),
            submodel,
          ],
        )
  })
  return h.div(
    [h.Class(className(previewLayout.wide))],
    [
      fixture.trees.length > 1
        ? h.div([h.Class(className(styles.wrap))], treeViews)
        : treeViews[0]!,
    ],
  )
}
