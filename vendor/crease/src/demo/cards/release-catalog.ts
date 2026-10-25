import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/demo/icon-preview'
import { badge } from '@/ui/badge'
import { card, cardContent, cardHeader } from '@/ui/card'
import { inputGroup, inputGroupAddon, inputGroupInput } from '@/ui/input-group'
import {
  item,
  itemContent,
  itemDescription,
  itemGroup,
  itemMedia,
  itemTitle,
} from '@/ui/item'
import { toggleGroup } from '@/ui/toggle-group'

const HOLDINGS = [
  {
    ticker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'ETF',
    added: 'Jan 2021',
    shares: '112',
    value: '$48,230.40',
  },
  {
    ticker: 'VIG',
    name: 'Vanguard Dividend Appreciation',
    type: 'ETF',
    added: 'Mar 2022',
    shares: '450',
    value: '$26,033.79',
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    type: 'Stock',
    added: 'Nov 2020',
    shares: '85',
    value: '$18,488.90',
  },
  {
    ticker: 'O',
    name: 'Realty Income Corp',
    type: 'REIT',
    added: 'Jun 2023',
    shares: '320',
    value: '$15,136.59',
  },
] as const

export const Model = S.Struct({
  search: S.String,
  category: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedSearch: { value: S.String },
  SelectedCategory: { value: S.String },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const init = (): Model => ({ search: '', category: 'etfs' })

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedSearch: ({ value }) => ({ model: { ...model, search: value } }),
      SelectedCategory: ({ value }) => ({
        model: { ...model, category: value },
      }),
    }),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              h.div(
                [h.Class('flex items-center justify-between gap-3')],
                [
                  inputGroup(
                    {
                      class: 'max-w-sm',
                      children: [
                        inputGroupAddon(
                          {
                            children: [Icon.icon('search', {}, h)],
                          },
                          h,
                        ),
                        inputGroupInput(
                          {
                            id: 'release-catalog-search',
                            value: model.search,
                            onInput: value => Message.UpdatedSearch({ value }),
                            placeholder: 'Search holdings or tickers...',
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  toggleGroup(
                    {
                      value: model.category,
                      onToggle: value => Message.SelectedCategory({ value }),
                      variant: 'outline',
                      class: 'gap-1',
                      items: [
                        {
                          value: 'stocks',
                          class: 'rounded-md border-l',
                          children: ['Stocks'],
                        },
                        {
                          value: 'etfs',
                          class: 'rounded-md border-l',
                          children: ['ETFs'],
                        },
                        {
                          value: 'reits',
                          class: 'rounded-md border-l',
                          children: ['REITs'],
                        },
                      ],
                    },
                    h,
                  ),
                ],
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
                  children: HOLDINGS.map(holding =>
                    item(
                      {
                        variant: 'muted',
                        children: [
                          itemMedia(
                            {
                              children: [
                                h.div(
                                  [
                                    h.Class(
                                      'flex size-10 items-center justify-center rounded-lg border bg-transparent text-xs font-medium',
                                    ),
                                  ],
                                  [holding.ticker],
                                ),
                              ],
                            },
                            h,
                          ),
                          itemContent(
                            {
                              children: [
                                itemTitle({ children: [holding.name] }, h),
                                itemDescription(
                                  {
                                    class: 'text-xs tracking-wider uppercase',
                                    children: [
                                      `${holding.shares} Shares · ${holding.added}`,
                                    ],
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          h.div(
                            [h.Class('flex shrink-0 items-center gap-6')],
                            [
                              badge(
                                {
                                  variant: 'outline',
                                  children: [holding.type],
                                },
                                h,
                              ),
                              h.div(
                                [h.Class('flex flex-col items-end gap-0.5')],
                                [
                                  h.span(
                                    [
                                      h.Class(
                                        'text-xs tracking-wider text-muted-foreground uppercase',
                                      ),
                                    ],
                                    ['Value'],
                                  ),
                                  h.span(
                                    [h.Class('font-medium tabular-nums')],
                                    [holding.value],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      },
                      h,
                    ),
                  ),
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
  )
}

/*
Minimal wiring:
const model = init()
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
const cardView = view(model)
*/
// Stateful? yes. Submodels wired: none (local input and toggle state). PORT NOTEs: none.
