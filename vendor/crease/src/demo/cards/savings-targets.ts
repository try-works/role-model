import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { button } from '@/ui/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import { field, fieldDescription, fieldGroup, fieldLabel } from '@/ui/field'
import {
  inputGroup,
  inputGroupAddon,
  inputGroupInput,
  inputGroupText,
} from '@/ui/input-group'
import {
  item,
  itemContent,
  itemDescription,
  itemFooter,
  itemGroup,
} from '@/ui/item'
import { nativeSelect } from '@/ui/native-select'
import { progress } from '@/ui/progress'

export const Model = S.Struct({
  amount: S.String,
  orderType: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedAmount: { value: S.String },
  UpdatedOrderType: { value: S.String },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const init = (): Model => ({
  amount: '1,000.00',
  orderType: 'market',
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedAmount: ({ value }) => ({
        model: modifyFields(model, { amount: () => value }),
      }),
      UpdatedOrderType: ({ value }) => ({
        model: modifyFields(model, { orderType: () => value }),
      }),
    }),
  )

const target = (
  title: string,
  amount: string,
  percentage: number,
  saved: string,
  h: HtmlBuilder<Message>,
): Html => {
  return item<Message>(
    {
      variant: 'muted',
      class: 'flex-col items-stretch',
      children: [
        itemContent(
          {
            class: 'gap-3',
            children: [
              itemDescription(
                {
                  class:
                    'text-xs font-medium tracking-wider text-muted-foreground uppercase',
                  children: [title],
                },
                h,
              ),
              h.span(
                [h.Class('text-3xl font-semibold tabular-nums')],
                [amount],
              ),
              progress({ value: percentage }, h),
            ],
          },
          h,
        ),
        itemFooter(
          {
            children: [
              h.span(
                [h.Class('text-sm text-muted-foreground')],
                [`${String(percentage)}% achieved`],
              ),
              h.span([h.Class('text-sm font-medium tabular-nums')], [saved]),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Class('grid grid-cols-2 gap-(--gap)')],
    [
      card(
        {
          children: [
            cardHeader(
              {
                children: [
                  cardTitle({ children: ['Savings Targets'] }, h),
                  cardDescription(
                    { children: ['Active milestones for 2024'] },
                    h,
                  ),
                  cardAction(
                    {
                      children: [
                        button(
                          {
                            variant: 'outline',
                            size: 'sm',
                            children: ['New Goal'],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            cardContent(
              {
                children: [
                  itemGroup(
                    {
                      class: 'gap-3',
                      children: [
                        target('Retirement', '$420,000', 65, '$273,000', h),
                        target('Real Estate', '$85,000', 32, '$27,200', h),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            cardFooter(
              {
                children: [
                  cardDescription(
                    {
                      class: 'text-center',
                      children: [
                        'You have not met your targets for this year.',
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
      card(
        {
          children: [
            cardHeader(
              {
                children: [cardTitle({ children: ['Buy Investment'] }, h)],
              },
              h,
            ),
            cardContent(
              {
                class: 'flex flex-1 flex-col gap-3',
                children: [
                  fieldGroup(
                    {
                      class: 'flex-1',
                      children: [
                        field(
                          {
                            children: [
                              fieldLabel(
                                {
                                  for: 'savings-targets-invest-amount',
                                  children: ['Amount to Invest'],
                                },
                                h,
                              ),
                              inputGroup(
                                {
                                  children: [
                                    inputGroupAddon(
                                      {
                                        children: [
                                          inputGroupText(
                                            { children: ['$'] },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                    inputGroupInput(
                                      {
                                        id: 'savings-targets-invest-amount',
                                        value: model.amount,
                                        onInput: value =>
                                          Message.UpdatedAmount({ value }),
                                      },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        field(
                          {
                            children: [
                              fieldLabel(
                                {
                                  for: 'savings-targets-invest-type',
                                  children: ['Order Type'],
                                },
                                h,
                              ),
                              nativeSelect(
                                {
                                  id: 'savings-targets-invest-type',
                                  value: model.orderType,
                                  onChange: value =>
                                    Message.UpdatedOrderType({ value }),
                                  options: [
                                    { value: 'market', label: 'Market Order' },
                                    { value: 'limit', label: 'Limit Order' },
                                    { value: 'stop', label: 'Stop Order' },
                                  ],
                                },
                                h,
                              ),
                              fieldDescription(
                                {
                                  children: [
                                    'Market orders execute at the current price.',
                                  ],
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        h.div(
                          [h.Class('flex flex-col gap-2')],
                          [
                            h.div(
                              [h.Class('flex items-center justify-between')],
                              [
                                h.span(
                                  [h.Class('text-sm text-muted-foreground')],
                                  ['Estimated Shares'],
                                ),
                                h.span(
                                  [
                                    h.Class(
                                      'text-sm font-semibold tabular-nums',
                                    ),
                                  ],
                                  ['1.95'],
                                ),
                              ],
                            ),
                            h.div(
                              [h.Class('flex items-center justify-between')],
                              [
                                h.span(
                                  [h.Class('text-sm text-muted-foreground')],
                                  ['Buying Power'],
                                ),
                                h.span(
                                  [
                                    h.Class(
                                      'text-sm font-semibold tabular-nums',
                                    ),
                                  ],
                                  ['$12,450.00'],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            cardFooter(
              {
                class: 'flex-col gap-3',
                children: [
                  button({ class: 'w-full', children: ['Review Order'] }, h),
                  cardDescription(
                    {
                      class: 'text-center',
                      children: [
                        'Trades are typically executed within minutes during market hours.',
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
    ],
  )
}

/*
  Parent wiring: nest Model from init(), wrap Message in the parent message,
  delegate to update(), map returned commands, and call view(nestedModel).
*/
// Stateful: yes. Submodels: none; local input and native-select values are wired through Model/Message/update. PORT NOTEs: none.
