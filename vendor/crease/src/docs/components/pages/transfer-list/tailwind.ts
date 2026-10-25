import { Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  optionsFor,
  transferListFixtures,
  type TransferListFixture,
} from '@/docs/components/pages/transfer-list/shared'
import * as TransferList from '@/ui/transfer-list'

const FixtureOption = S.Struct({
  value: S.String,
  label: S.String,
  description: S.optional(S.String),
  group: S.optional(S.String),
  isTransferDisabled: S.optional(S.Boolean),
  isReorderDisabled: S.optional(S.Boolean),
  disabledMessage: S.optional(S.String),
})

const Got = defineMessageUnion({
  GotListMessage: { message: TransferList.Message },
  GotList2Message: { message: TransferList.Message },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('transfer-list'),
  list: TransferList.Model,
  list2: TransferList.Model,
  options: S.Array(FixtureOption),
  isReorderable: S.Boolean,
})
type Model = typeof Model.Type

const cleanOptions = (
  rows: ReadonlyArray<typeof FixtureOption.Type>,
): ReadonlyArray<TransferList.TransferListOption> =>
  rows.map(row => ({
    value: row.value,
    label: row.label,
    ...(row.description === undefined ? {} : { description: row.description }),
    ...(row.group === undefined ? {} : { group: row.group }),
    ...(row.isTransferDisabled === undefined
      ? {}
      : { isTransferDisabled: row.isTransferDisabled }),
    ...(row.isReorderDisabled === undefined
      ? {}
      : { isReorderDisabled: row.isReorderDisabled }),
    ...(row.disabledMessage === undefined
      ? {}
      : { disabledMessage: row.disabledMessage }),
  }))

const renderList = (
  fixture: TransferListFixture,
  model: Model,
  h: HtmlBuilder<Got>,
): Html =>
  TransferList.transferList(
    {
      model: model.list,
      toParentMessage: message => Got.GotListMessage({ message }),
      label: fixture.label,
      description: fixture.listDescription,
      options: cleanOptions(model.options),
      selectedLabel: fixture.selectedLabel,
      availableLabel: fixture.availableLabel,
      ...(fixture.hasSearch === true ? { hasSearch: true } : {}),
      ...(fixture.searchLabel === undefined
        ? {}
        : { searchLabel: fixture.searchLabel }),
      ...(fixture.searchPlaceholder === undefined
        ? {}
        : { searchPlaceholder: fixture.searchPlaceholder }),
      isReorderable: model.isReorderable,
      ...(fixture.hasSelectAll === true ? { hasSelectAll: true } : {}),
      ...(fixture.hasClear === true ? { hasClear: true } : {}),
      ...(fixture.selectedEmptyText === undefined
        ? {}
        : { selectedEmptyText: fixture.selectedEmptyText }),
      ...(fixture.availableEmptyText === undefined
        ? {}
        : { availableEmptyText: fixture.availableEmptyText }),
      ...(fixture.noResultsText === undefined
        ? {}
        : { noResultsText: fixture.noResultsText }),
    },
    h,
  )

const fixtureView = (
  fixture: TransferListFixture,
  model: Model,
  h: HtmlBuilder<Got>,
): Html => {
  if (fixture.layout !== 'empty-pair') {
    return renderList(fixture, model, h)
  }
  return h.div(
    [h.Class('flex flex-col gap-6')],
    [
      renderList(fixture, model, h),
      h.hr([h.Class('border-border')]),
      TransferList.transferList(
        {
          model: model.list2,
          toParentMessage: message => Got.GotList2Message({ message }),
          label: 'Report fields',
          description:
            'A query that matches nothing replaces both panels with the no-results copy.',
          options: cleanOptions(model.options),
          selectedLabel: 'In report',
          availableLabel: 'Available',
          hasSearch: true,
          searchLabel: 'Search report fields',
          searchPlaceholder: 'Try a term that matches nothing',
          noResultsText: 'No field matches that search.',
        },
        h,
      ),
    ],
  )
}

export const transferListTailwindPreviewProgram = definePreviewProgram<
  Model,
  Got
>({
  Model,
  Message: Got,
  init: index => {
    const fixture = transferListFixtures[index] ?? transferListFixtures[0]
    return {
      _docsPage: 'transfer-list',
      list: TransferList.init({
        id: `docs-transfer-list-${String(index)}`,
        value: fixture.initialValue,
      }),
      list2: TransferList.init({
        id: `docs-transfer-list-2-${String(index)}`,
        value: ['name'],
      }),
      options: [...optionsFor(fixture.options)],
      isReorderable: fixture.isReorderable ?? true,
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotListMessage': {
        const next = TransferList.update(
          model.list,
          message.message,
          cleanOptions(model.options),
          model.isReorderable,
        )
        return {
          model: { ...model, list: next.model },
          commands: Command.mapMessages(next.commands ?? [], next =>
            Got.GotListMessage({ message: next }),
          ),
        }
      }
      case 'GotList2Message': {
        const next = TransferList.update(
          model.list2,
          message.message,
          cleanOptions(model.options),
          model.isReorderable,
        )
        return {
          model: { ...model, list2: next.model },
          commands: Command.mapMessages(next.commands ?? [], next =>
            Got.GotList2Message({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = transferListFixtures[index] ?? transferListFixtures[0]
    return fixtureView(fixture, model, h)
  },
  subscriptions: Subscription.aggregate<Model, Got>()(
    Subscription.lift({
      listPointer: TransferList.subscriptions.documentPointer,
      listEscape: TransferList.subscriptions.documentEscape,
      listKeyboard: TransferList.subscriptions.documentKeyboard,
      listAutoScroll: TransferList.subscriptions.autoScroll,
    })<Model, Got>({
      toChildModel: model => model.list.dnd,
      toParentMessage: message =>
        Got.GotListMessage({
          message: TransferList.Message.GotDndMessage({ message }),
        }),
    }),
    Subscription.lift({
      list2Pointer: TransferList.subscriptions.documentPointer,
      list2Escape: TransferList.subscriptions.documentEscape,
      list2Keyboard: TransferList.subscriptions.documentKeyboard,
      list2AutoScroll: TransferList.subscriptions.autoScroll,
    })<Model, Got>({
      toChildModel: model => model.list2.dnd,
      toParentMessage: message =>
        Got.GotList2Message({
          message: TransferList.Message.GotDndMessage({ message }),
        }),
    }),
  ),
})
