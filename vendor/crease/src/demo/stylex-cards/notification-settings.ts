import type { Update } from 'foldkit'
import { Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as stylex from '@stylexjs/stylex'

import { button } from '@/stylex/button'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import * as Checkbox from '@/stylex/checkbox'
import { className } from '@/stylex/style'

const styles = stylex.create({
  action: { display: 'grid', width: '100%' },
  fieldGroup: {
    gap: '1.375rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
})

const notifications = [
  {
    key: 'transactions',
    label: 'Transaction alerts',
    description: 'Deposits, withdrawals, and transfers.',
  },
  {
    key: 'security',
    label: 'Security alerts',
    description: 'Login attempts and account changes.',
  },
  {
    key: 'goals',
    label: 'Goal milestones',
    description: 'Updates at 25%, 50%, 75%, and 100%.',
  },
  {
    key: 'market',
    label: 'Market updates',
    description: 'Daily portfolio summary and price alerts.',
  },
] as const

export const Model = S.Struct({
  transactions: S.Boolean,
  security: S.Boolean,
  goals: S.Boolean,
  market: S.Boolean,
})
export type Model = typeof Model.Type

export const NotificationTarget = S.Literals([
  'all',
  'transactions',
  'security',
  'goals',
  'market',
])
export type NotificationTarget = typeof NotificationTarget.Type
export const ToggledNotification = defineMessageUnion({
  ToggledNotification: {
    target: NotificationTarget,
    isChecked: S.Boolean,
  },
})
export const Message = ToggledNotification
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

const childStates = (model: Model): ReadonlyArray<boolean> => [
  model.transactions,
  model.security,
  model.goals,
  model.market,
]

export const update = (model: Model, message: Message): UpdateReturn => {
  if (message.target === 'all') {
    return {
      model: {
        transactions: message.isChecked,
        security: message.isChecked,
        goals: message.isChecked,
        market: message.isChecked,
      },
    }
  }
  return { model: { ...model, [message.target]: message.isChecked } }
}

export const init = (): Model => ({
  transactions: true,
  security: true,
  goals: false,
  market: false,
})

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const states = childStates(model)
  const allChecked = states.every(Boolean)
  const someChecked = states.some(Boolean) && !allChecked

  return card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Notifications'] }, h),
              cardDescription(
                {
                  children: ['Choose what you want to be notified about.'],
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
                [
                  h.DataAttribute('slot', 'field-group'),
                  h.Class(className(styles.fieldGroup)),
                ],
                [
                  Checkbox.checkbox(
                    {
                      id: 'notification-settings-all',
                      isChecked: allChecked,
                      onToggle: isChecked =>
                        ToggledNotification.ToggledNotification({
                          target: 'all',
                          isChecked,
                        }),
                      label: 'Select all',
                      isIndeterminate: someChecked,
                    },
                    h,
                  ),
                  ...notifications.map(notification =>
                    Checkbox.checkbox(
                      {
                        id: `notification-settings-${notification.key}`,
                        isChecked: model[notification.key],
                        onToggle: isChecked =>
                          ToggledNotification.ToggledNotification({
                            target: notification.key,
                            isChecked,
                          }),
                        label: notification.label,
                        description: notification.description,
                      },
                      h,
                    ),
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
                [h.Class(className(styles.action))],
                [button({ children: ['Save Preferences'] }, h)],
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
Stateful? yes.
Submodels wired: Checkbox (select all and four notification choices).
PORT NOTEs: The shared Checkbox wrapper owns its label/description layout, so each source horizontal Field is represented by that equivalent accessible wrapper.
*/
