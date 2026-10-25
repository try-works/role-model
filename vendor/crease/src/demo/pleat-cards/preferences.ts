import { Style } from '@pleat/core'
import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Icon from '@/demo/icon-preview'
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
import { field, fieldLabel, fieldSeparator } from '@/pleat/field'
import * as Select from '@/pleat/select'
import * as Switch from '@/pleat/switch'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  fieldGroup: Style.make({
    gap: '1.375rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  full: layoutStyle({ width: '100%' }),
  icon: Style.make({
    display: 'inline-flex',
    flexShrink: 0,
    height: '1rem',
    width: '1rem',
  }),
  push: layoutStyle({ marginLeft: 'auto' }),
  separator: layoutStyle({ marginBlock: '-1rem' }),
  srOnly: Style.make({
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  }),
  switch: layoutStyle({ order: 2, marginLeft: 'auto' }),
}

const currencies = [
  { value: 'usd', label: 'USD — United States Dollar' },
  { value: 'eur', label: 'EUR — Euro' },
  { value: 'gbp', label: 'GBP — British Pound' },
  { value: 'jpy', label: 'JPY — Japanese Yen' },
] as const

export const Model = S.Struct({
  currency: Select.Model,
  selectedCurrency: S.String,
  publicStatistics: S.Boolean,
  emailNotifications: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotCurrencyMessage: {
    message: Select.Message,
  },
  ToggledPublicStatistics: {
    isChecked: S.Boolean,
  },
  ToggledEmailNotifications: {
    isChecked: S.Boolean,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotCurrencyMessage: ({ message: childMessage }) => {
        const {
          model: currency,
          commands: currencyCommands__,
          outMessage: currencyOut__,
        } = Select.update(model.currency, childMessage)
        const commands = currencyCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(currencyOut__)
        return {
          model: modifyFields(model, {
            currency: () => currency,
            selectedCurrency: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection =>
                  selection._tag === 'Selected' ? selection.value : current,
              }),
          }),
          commands: Command.mapMessages(commands, next =>
            Message.GotCurrencyMessage({ message: next }),
          ),
        }
      },
      ToggledPublicStatistics: ({ isChecked }) => ({
        model: { ...model, publicStatistics: isChecked },
      }),
      ToggledEmailNotifications: ({ isChecked }) => ({
        model: { ...model, emailNotifications: isChecked },
      }),
    }),
  )

export const init = (): Model => ({
  currency: Select.init({
    id: 'preferences-currency',
    isAnimated: true,
  }),
  selectedCurrency: 'usd',
  publicStatistics: true,
  emailNotifications: true,
})

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Preferences'] }, h),
              cardDescription(
                {
                  children: ['Manage your account settings and notifications.'],
                },
                h,
              ),
              cardAction(
                {
                  children: [
                    button(
                      {
                        variant: 'secondary',
                        size: 'icon',
                        children: [
                          Icon.icon('x', { class: className(styles.icon) }, h),
                          h.span(
                            [h.Class(className(styles.srOnly))],
                            ['Close Preferences'],
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
        cardContent(
          {
            children: [
              h.div(
                [
                  h.DataAttribute('slot', 'field-group'),
                  h.Class(className(styles.fieldGroup)),
                ],
                [
                  field(
                    {
                      children: [
                        fieldLabel(
                          {
                            for: 'preferences-currency-button',
                            children: ['Default Currency'],
                          },
                          h,
                        ),
                        Select.select(
                          {
                            model: model.currency,
                            maybeSelectedValue: Option.some(
                              model.selectedCurrency,
                            ),
                            toParentMessage: message =>
                              Message.GotCurrencyMessage({ message }),
                            items: currencies,
                            itemToValue: currency => currency.value,
                            itemToLabel: currency => currency.label,
                            triggerLayoutStyle: styles.full,
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  fieldSeparator({ layoutStyle: styles.separator }, h),
                  Switch.switch(
                    {
                      id: 'preferences-public-statistics',
                      isChecked: model.publicStatistics,
                      onToggle: isChecked =>
                        Message.ToggledPublicStatistics({ isChecked }),
                      label: 'Public Statistics',
                      description:
                        'Allow others to see your total stream count and listening activity',
                      layoutStyle: styles.switch,
                    },
                    h,
                  ),
                  fieldSeparator({ layoutStyle: styles.separator }, h),
                  Switch.switch(
                    {
                      id: 'preferences-email-notifications',
                      isChecked: model.emailNotifications,
                      onToggle: isChecked =>
                        Message.ToggledEmailNotifications({ isChecked }),
                      label: 'Email Notifications',
                      description:
                        'Monthly royalty reports and distribution updates',
                      layoutStyle: styles.switch,
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
              button({ variant: 'outline', children: ['Reset'] }, h),
              button(
                {
                  layoutStyle: styles.push,
                  children: ['Save Preferences'],
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

/*
Stateful? yes.
Submodels wired: Select (currency), Switch (public statistics, email notifications).
PORT NOTEs: Switch wrapper content is reordered with utility classes to match the source's horizontal Field layout.
*/
