import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  listInputFixtures,
  type Guest,
} from '@/docs/components/pages/list-input/shared'
import * as Input from '@/ui/input'
import * as ListInput from '@/ui/list-input'

const GotListInputMessage = defineMessageUnion({
  GotListInputMessage: {
    message: ListInput.Message,
  },
})
type GotListInputMessage = typeof GotListInputMessage.Type

const GuestSchema = S.Struct({ id: S.String, name: S.String, email: S.String })
const ListInputPreviewModel = S.Struct({
  _docsPage: S.Literal('list-input'),
  input: ListInput.Model,
  guests: S.Array(GuestSchema),
})
type ListInputPreviewModel = typeof ListInputPreviewModel.Type

const guestColumns = <Msg>(
  h: HtmlBuilder<Msg>,
): ReadonlyArray<ListInput.ListInputColumn<Guest, Msg>> => [
  {
    key: 'name',
    header: 'Name',
    width: { type: 'proportional', value: 1 },
    renderInput: ctx =>
      Input.input(
        {
          id: `docs-list-input-name-${String(ctx.index)}`,
          value: ctx.item.name,
          onChange: name => ctx.updateItem({ ...ctx.item, name }, 'name'),
          isDisabled: ctx.isDisabled,
          isInvalid: ctx.status?.type === 'error',
        },
        h,
      ),
  },
  {
    key: 'email',
    header: 'Email',
    width: { type: 'proportional', value: 2 },
    renderInput: ctx =>
      Input.input(
        {
          id: `docs-list-input-email-${String(ctx.index)}`,
          type: 'email',
          value: ctx.item.email,
          onChange: email => ctx.updateItem({ ...ctx.item, email }, 'email'),
          isDisabled: ctx.isDisabled,
          isInvalid: ctx.status?.type === 'error',
        },
        h,
      ),
  },
]

export const listInputTailwindPreviewProgram = definePreviewProgram<
  ListInputPreviewModel,
  GotListInputMessage
>({
  Model: ListInputPreviewModel,
  Message: GotListInputMessage,
  init: index => {
    const fixture = listInputFixtures[index] ?? listInputFixtures[0]
    return {
      _docsPage: 'list-input',
      input: ListInput.init({ id: `docs-list-input-${String(index)}` }),
      guests: [...fixture.initialGuests],
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotListInputMessage': {
        const next = ListInput.update(model.input, message.message)
        const commands = next.commands ?? []
        const out = next.outMessage
        const guests = (() => {
          if (out === undefined) return model.guests
          switch (out._tag) {
            case 'ItemAdded':
              return [...model.guests, out.item as Guest]
            case 'ItemRemoved':
              return model.guests.filter((_, i) => i !== out.index)
            case 'ItemUpdated':
              return model.guests.map((guest, i) =>
                i === out.index ? (out.nextItem as Guest) : guest,
              )
            case 'ItemReordered':
              return ListInput.moveItem(
                model.guests,
                out.fromIndex,
                out.toIndex,
              )
          }
        })()
        return {
          model: { ...model, input: next.model, guests },
          commands: Command.mapMessages(commands, next2 =>
            GotListInputMessage.GotListInputMessage({ message: next2 }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = listInputFixtures[index] ?? listInputFixtures[0]
    return h.div(
      [h.Class('w-full max-w-2xl')],
      [
        ListInput.listInput(
          {
            model: model.input,
            toParentMessage: message =>
              GotListInputMessage.GotListInputMessage({ message }),
            id: `docs-list-input-${String(index)}`,
            label: 'Guests',
            itemName: 'guest',
            value: model.guests,
            getItemKey: guest => guest.id,
            createItem: () => ({
              id: `g-${String(model.guests.length + 1)}`,
              name: '',
              email: '',
            }),
            columns: guestColumns(h),
            ...(fixture.isReorderable === true ? { isReorderable: true } : {}),
            ...(fixture.maxItems === undefined
              ? {}
              : { maxItems: fixture.maxItems }),
            ...(fixture.hasFieldStatus === true
              ? {
                  getFieldStatus: (guest: Guest, key: string) =>
                    key === 'email' && guest.email === ''
                      ? {
                          type: 'error' as const,
                          message: 'Enter an email address',
                        }
                      : undefined,
                }
              : {}),
            ...(fixture.hasListStatus === true && model.guests.length === 0
              ? {
                  status: {
                    type: 'error' as const,
                    message: 'Add at least one guest',
                  },
                }
              : {}),
          },
          h,
        ),
      ],
    )
  },
})
