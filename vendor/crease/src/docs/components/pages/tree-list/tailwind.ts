import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  treeListFixtures,
  type TreeListFixture,
  type TreeListFixtureItem,
} from '@/docs/components/pages/tree-list/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/ui/badge'
import * as TreeList from '@/ui/tree-list'

const GotTreeListPreviewMessage = defineMessageUnion({
  GotTreeListPreviewMessage: {
    key: S.String,
    message: TreeList.Message,
  },
})
type GotTreeListPreviewMessage = typeof GotTreeListPreviewMessage.Type

const TreeListPreviewModel = S.Struct({
  _docsPage: S.Literal('tree-list'),
  trees: S.Record(S.String, TreeList.Model),
  maybeSelectedId: S.Option(S.String),
})
type TreeListPreviewModel = typeof TreeListPreviewModel.Type

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
          startContent: Icon.icon(item.startIcon, { class: 'size-4' }, h),
        }),
    ...(item.endIcon !== undefined
      ? { endContent: Icon.icon(item.endIcon, { class: 'size-4' }, h) }
      : item.endBadge !== undefined
        ? { endContent: Badge.badge({ children: [item.endBadge] }, h) }
        : {}),
    ...(item.children === undefined
      ? {}
      : { children: decorateItems(item.children, h) }),
  }))

const treeView = <Msg>(
  tree: { variant: TreeList.TreeListVariant; caption?: string },
  items: ReadonlyArray<TreeListFixtureItem>,
  treeModel: TreeList.Model,
  index: number,
  toParentMessage: (message: GotTreeListPreviewMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const submodel = h.submodel({
    slotId: `docs-tree-list-${String(index)}`,
    model: treeModel,
    view: TreeList.view,
    viewInputs: { items: decorateItems(items, h), variant: tree.variant },
    toParentMessage: message =>
      toParentMessage(
        GotTreeListPreviewMessage.GotTreeListPreviewMessage({
          key: `tree-${String(index)}`,
          message,
        }),
      ),
  })
  return tree.caption === undefined
    ? submodel
    : h.div(
        [h.Class('flex flex-col gap-2')],
        [
          h.div(
            [h.Class('text-xs font-semibold text-muted-foreground')],
            [tree.caption],
          ),
          submodel,
        ],
      )
}

const fixtureView = <Msg>(
  fixture: TreeListFixture,
  model: TreeListPreviewModel,
  toParentMessage: (message: GotTreeListPreviewMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const trees = fixture.trees.map((tree, index) => {
    const key = `tree-${String(index)}`
    const treeModel = model.trees[key] ?? TreeList.init({ id: key })
    return treeView(tree, fixture.items, treeModel, index, toParentMessage, h)
  })
  return fixture.trees.length > 1
    ? h.div([h.Class('flex items-start gap-6')], trees)
    : trees[0]!
}

export const treeListTailwindPreviewProgram = definePreviewProgram<
  TreeListPreviewModel,
  GotTreeListPreviewMessage
>({
  Model: TreeListPreviewModel,
  Message: GotTreeListPreviewMessage,
  init: index => {
    const fixture = treeListFixtures[index] ?? treeListFixtures[0]
    return {
      _docsPage: 'tree-list',
      trees: Object.fromEntries(
        fixture.trees.map((_tree, i) => [
          `tree-${String(i)}`,
          TreeList.init({ id: `docs-tree-list-${String(index)}-${String(i)}` }),
        ]),
      ),
      maybeSelectedId: Option.none(),
    }
  },
  update: (model, message) => {
    const tree = model.trees[message.key]
    if (tree === undefined) {
      return { model }
    }
    const treeOp__ = TreeList.update(tree, message.message)
    const commands = treeOp__.commands ?? []
    const maybeOut = Option.fromNullishOr(treeOp__.outMessage)
    return {
      model: {
        ...model,
        trees: { ...model.trees, [message.key]: treeOp__.model },
        maybeSelectedId: Option.match(maybeOut, {
          onNone: () => model.maybeSelectedId,
          onSome: selected => Option.some(selected.id),
        }),
      },
      commands: Command.mapMessages(commands, next =>
        GotTreeListPreviewMessage.GotTreeListPreviewMessage({
          key: message.key,
          message: next,
        }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = treeListFixtures[index] ?? treeListFixtures[0]
    return h.div(
      [h.Class('w-full max-w-xl')],
      [fixtureView(fixture, model, message => message, h)],
    )
  },
})
