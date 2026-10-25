import type { Update } from 'foldkit'
import * as stylex from '@stylexjs/stylex'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/demo/icon-preview'
import { badge } from '@/stylex/badge'
import { card, cardContent, cardHeader } from '@/stylex/card'
import {
  inputGroup,
  inputGroupAddon,
  inputGroupInput,
} from '@/stylex/input-group'
import {
  item,
  itemContent,
  itemGroup,
  itemMedia,
  itemTitle,
} from '@/stylex/item'
import { toggleGroup } from '@/stylex/toggle-group'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'
import { cardTokens } from './complex-card-tokens.stylex'

const styles = stylex.create({
  controls: {
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  /* TW: itemDescription base styles plus 'text-xs tracking-wider uppercase'. */
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textTransform: 'uppercase',
  },
  holdingMedia: {
    borderColor: tokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: cardTokens.transparent,
    display: 'flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    height: '2.5rem',
    width: '2.5rem',
  },
  input: { maxWidth: '24rem' },
  meta: { gap: '1.5rem', alignItems: 'center', display: 'flex', flexShrink: 0 },
  toggle: { gap: '0.25rem' },
  value: {
    gap: '0.125rem',
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'column',
  },
  valueAmount: { fontVariantNumeric: 'tabular-nums', fontWeight: 500 },
  valueLabel: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textTransform: 'uppercase',
  },
})

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
                [h.Class(className(styles.controls))],
                [
                  h.div(
                    [h.Class(className(styles.input))],
                    [
                      inputGroup(
                        {
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
                                onInput: value =>
                                  Message.UpdatedSearch({ value }),
                                placeholder: 'Search holdings or tickers...',
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class(className(styles.toggle))],
                    [
                      toggleGroup(
                        {
                          value: model.category,
                          onToggle: value =>
                            Message.SelectedCategory({ value }),
                          variant: 'outline',
                          items: [
                            {
                              value: 'stocks',
                              children: ['Stocks'],
                            },
                            {
                              value: 'etfs',
                              children: ['ETFs'],
                            },
                            {
                              value: 'reits',
                              children: ['REITs'],
                            },
                          ],
                        },
                        h,
                      ),
                    ],
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
                                  [h.Class(className(styles.holdingMedia))],
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
                                /* Mirrors ui/item itemDescription: the p
                                   carries the description classes directly. */
                                h.p(
                                  [
                                    h.DataAttribute('slot', 'item-description'),
                                    h.Class(
                                      className(reset.text, styles.description),
                                    ),
                                    h.Style({ WebkitLineClamp: '2' }),
                                  ],
                                  [
                                    `${holding.shares} Shares · ${holding.added}`,
                                  ],
                                ),
                              ],
                            },
                            h,
                          ),
                          h.div(
                            [h.Class(className(styles.meta))],
                            [
                              badge(
                                {
                                  variant: 'outline',
                                  children: [holding.type],
                                },
                                h,
                              ),
                              h.div(
                                [h.Class(className(styles.value))],
                                [
                                  h.span(
                                    [h.Class(className(styles.valueLabel))],
                                    ['Value'],
                                  ),
                                  h.span(
                                    [h.Class(className(styles.valueAmount))],
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
