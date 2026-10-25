import * as stylex from '@stylexjs/stylex'
import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { badge } from '@/stylex/badge'
import * as Calendar from '@/stylex/calendar'
import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import {
  item,
  itemContent,
  itemDescription,
  itemGroup,
  itemTitle,
} from '@/stylex/item'
import { className } from '@/stylex/style'

const styles = stylex.create({
  calendar: { width: '100%' },
  content: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  centered: { display: 'flex', justifyContent: 'center' },
})

const payments = [
  {
    title: 'Netflix Subscription',
    date: 'Apr 15, 2024',
    amount: '$19.99',
  },
  {
    title: 'Rent Payment',
    date: 'Apr 1, 2024',
    amount: '$2,400.00',
  },
  {
    title: 'Auto Insurance',
    date: 'Apr 22, 2024',
    amount: '$186.00',
  },
] as const

export const Model = S.Struct({
  calendar: Calendar.Model,
  selectedDate: S.Option(FoldkitCalendar.CalendarDate),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotCalendarMessage: {
    message: Calendar.Message,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotCalendarMessage: ({ message: childMessage }) => {
        const {
          model: calendar,
          commands: calendarCommands__,
          outMessage: calendarOut__,
        } = Calendar.update(model.calendar, childMessage)
        const commands = calendarCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(calendarOut__)
        return {
          model: modifyFields(model, {
            calendar: () => calendar,
            selectedDate: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection =>
                  selection._tag === 'SelectedDate'
                    ? Option.some(selection.date)
                    : current,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotCalendarMessage({ message: next }),
          ),
        }
      },
    }),
  )

export const init = (): Model => {
  const now = new Date()
  const today = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }

  return {
    calendar: Calendar.init({
      id: 'upcoming-payments-calendar',
      today,
      initialViewDate: today,
    }),
    selectedDate: Option.some(today),
  }
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Upcoming Payments'] }, h),
              cardDescription(
                {
                  children: ['Select a date to view scheduled payments.'],
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
                [h.Class(className(styles.content))],
                [
                  itemGroup(
                    {
                      children: [
                        item(
                          {
                            variant: 'outline',
                            children: [
                              h.div(
                                [h.Class(className(styles.centered))],
                                [
                                  h.div(
                                    [h.Class(className(styles.calendar))],
                                    [
                                      Calendar.calendar(
                                        {
                                          model: model.calendar,
                                          maybeSelectedDate: model.selectedDate,
                                          size: 'comfortable',
                                          toParentMessage: message =>
                                            Message.GotCalendarMessage({
                                              message,
                                            }),
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
                      ],
                    },
                    h,
                  ),
                  itemGroup(
                    {
                      children: payments.map(payment =>
                        item(
                          {
                            variant: 'muted',
                            children: [
                              itemContent(
                                {
                                  children: [
                                    itemTitle({ children: [payment.title] }, h),
                                    itemDescription(
                                      { children: [payment.date] },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                              badge(
                                {
                                  variant: 'secondary',
                                  children: [payment.amount],
                                },
                                h,
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
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

/*
Stateful? yes.
Submodels wired: Calendar (single selected date).
PORT NOTEs: none.
*/
