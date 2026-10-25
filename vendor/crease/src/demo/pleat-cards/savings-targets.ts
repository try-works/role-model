import { Style, When } from '@pleat/core'
import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { button } from '@/pleat/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/pleat/card'
import { field, fieldDescription, fieldGroup, fieldLabel } from '@/pleat/field'
import {
  inputGroup,
  inputGroupAddon,
  inputGroupInput,
  inputGroupText,
} from '@/pleat/input-group'
import { item, itemContent, itemFooter, itemGroup } from '@/pleat/item'
import { nativeSelect } from '@/pleat/native-select'
import { progress } from '@/pleat/progress'
import { reset } from '@/pleat/reset'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  amount: Style.make({
    fontSize: '1.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '2.25rem',
  }),
  button: Style.make({ width: '100%' }),
  cardDescription: Style.make({ textAlign: 'center' }),
  content: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
  }),
  details: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  flex: layoutStyle({ flexGrow: 1 }),
  footer: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  grid: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }).pipe(
    Style.when(When.minWidth('1920px'), { gap: '3rem' }),
    Style.when(When.minWidth('768px'), { gap: '2.5rem' }),
  ),
  label: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  row: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  targets: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  title: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textTransform: 'uppercase',
  }),
  value: Style.make({
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  valueMedium: Style.make({
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
}

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
      orientation: 'vertical',
      children: [
        itemContent(
          {
            spacing: 'md',
            children: [
              /* Mirrors ui/item itemDescription: the p carries the eyebrow
                 classes directly, keeping the line box at text-xs height. */
              h.p(
                [
                  h.DataAttribute('slot', 'item-description'),
                  h.Class(className(reset.text, styles.title)),
                  h.Style({ WebkitLineClamp: '2' }),
                ],
                [title],
              ),
              h.span([h.Class(className(styles.amount))], [amount]),
              progress(
                {
                  value: percentage,
                  ariaLabel: `${title} savings progress`,
                },
                h,
              ),
            ],
          },
          h,
        ),
        itemFooter(
          {
            children: [
              h.span(
                [h.Class(className(styles.label))],
                [`${String(percentage)}% achieved`],
              ),
              h.span([h.Class(className(styles.valueMedium))], [saved]),
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
    [h.Class(className(styles.grid))],
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
                  h.div(
                    [h.Class(className(styles.targets))],
                    [
                      itemGroup(
                        {
                          spacing: 'md',
                          children: [
                            target('Retirement', '$420,000', 65, '$273,000', h),
                            target('Real Estate', '$85,000', 32, '$27,200', h),
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
            cardFooter(
              {
                children: [
                  cardDescription(
                    {
                      children: [
                        h.span(
                          [h.Class(className(styles.cardDescription))],
                          ['You have not met your targets for this year.'],
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
                children: [
                  h.div(
                    [h.Class(className(styles.content))],
                    [
                      fieldGroup(
                        {
                          layoutStyle: styles.flex,
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
                                        {
                                          value: 'market',
                                          label: 'Market Order',
                                        },
                                        {
                                          value: 'limit',
                                          label: 'Limit Order',
                                        },
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
                              [h.Class(className(styles.details))],
                              [
                                h.div(
                                  [h.Class(className(styles.row))],
                                  [
                                    h.span(
                                      [h.Class(className(styles.label))],
                                      ['Estimated Shares'],
                                    ),
                                    h.span(
                                      [h.Class(className(styles.value))],
                                      ['1.95'],
                                    ),
                                  ],
                                ),
                                h.div(
                                  [h.Class(className(styles.row))],
                                  [
                                    h.span(
                                      [h.Class(className(styles.label))],
                                      ['Buying Power'],
                                    ),
                                    h.span(
                                      [h.Class(className(styles.value))],
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
                  ),
                ],
              },
              h,
            ),
            cardFooter(
              {
                children: [
                  h.div(
                    [h.Class(className(styles.footer))],
                    [
                      h.div(
                        [h.Class(className(styles.button))],
                        [button({ children: ['Review Order'] }, h)],
                      ),
                      cardDescription(
                        {
                          children: [
                            h.span(
                              [h.Class(className(styles.cardDescription))],
                              [
                                'Trades are typically executed within minutes during market hours.',
                              ],
                            ),
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
