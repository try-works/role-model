import { VirtualList } from '@foldkit/ui'
import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = S.Struct({
  filter: S.String,
  sortKey: S.String,
  sortDirection: S.Literals(['ascending', 'descending']),
  selectedRowKeys: S.Array(S.String),
  list: VirtualList.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  VirtualDataTableFiltered: { value: S.String },
  VirtualDataTableSorted: { key: S.String },
  VirtualDataTableToggledRow: { key: S.String, isSelected: S.Boolean },
  VirtualDataTableToggledRows: {
    keys: S.Array(S.String),
    isSelected: S.Boolean,
  },
  GotVirtualDataTableListMessage: { message: VirtualList.Message },
})
export type Message = typeof Message.Type

export const init = (id: string, rowHeightPx = 52): Model => ({
  filter: '',
  sortKey: '',
  sortDirection: 'ascending',
  selectedRowKeys: [],
  list: VirtualList.init({ id, rowHeightPx }),
})

const withMembership = (
  values: ReadonlyArray<string>,
  key: string,
  included: boolean,
): ReadonlyArray<string> =>
  included
    ? [...new Set([...values, key])]
    : values.filter(value => value !== key)

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'VirtualDataTableFiltered':
      return { model: { ...model, filter: message.value } }
    case 'VirtualDataTableSorted':
      return {
        model: {
          ...model,
          sortKey: message.key,
          sortDirection:
            model.sortKey === message.key && model.sortDirection === 'ascending'
              ? 'descending'
              : 'ascending',
        },
      }
    case 'VirtualDataTableToggledRow':
      return {
        model: {
          ...model,
          selectedRowKeys: withMembership(
            model.selectedRowKeys,
            message.key,
            message.isSelected,
          ),
        },
      }
    case 'VirtualDataTableToggledRows':
      return {
        model: {
          ...model,
          selectedRowKeys: message.keys.reduce(
            (keys, key) => withMembership(keys, key, message.isSelected),
            model.selectedRowKeys,
          ),
        },
      }
    case 'GotVirtualDataTableListMessage': {
      const { model: list, commands: listCommands__ } = VirtualList.update(
        model.list,
        message.message,
      )
      const commands = listCommands__ ?? []
      return {
        model: { ...model, list },
        commands: Command.mapMessages(commands, next =>
          Message['GotVirtualDataTableListMessage']({ message: next }),
        ),
      }
    }
  }
}

export const subscriptions = Subscription.lift(VirtualList.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.list,
  toParentMessage: message =>
    Message['GotVirtualDataTableListMessage']({ message }),
})
