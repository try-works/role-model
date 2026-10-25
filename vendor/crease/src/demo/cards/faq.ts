import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Accordion from '@/ui/accordion'
import { button } from '@/ui/button'
import { card, cardContent, cardFooter } from '@/ui/card'
import * as Tabs from '@/ui/tabs'

type Question = Readonly<{
  q: string
  a: string
}>

const GENERAL_QUESTIONS: ReadonlyArray<Question> = [
  {
    q: 'How secure is my financial data with Ledger?',
    a: 'We use bank-level AES-256 encryption, SOC 2 Type II certified infrastructure, and never store your credentials. All connections use read-only access tokens. We are a SEC registered investment advisor.',
  },
  {
    q: 'How do I connect my bank or investment accounts?',
    a: 'Go to Settings > Linked Accounts and search for your institution. We support over 12,000 banks and brokerages via Plaid and MX.',
  },
  {
    q: 'Can I export my data for tax purposes?',
    a: 'Yes. Navigate to Reports > Tax Export to download a CSV or PDF summary of your transactions, dividends, and capital gains for any tax year.',
  },
]

const BILLING_QUESTIONS: ReadonlyArray<Question> = [
  {
    q: 'What is the difference between Basic and Pro pricing tiers?',
    a: 'Basic includes budgeting, goal tracking, and up to 3 linked accounts. Pro adds unlimited accounts, dividend tracking, portfolio analysis, and priority support.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings > Billing > Manage Plan and click Cancel. Your access continues until the end of your current billing period.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes. All new accounts start with a 14-day Pro trial. No credit card required.',
  },
]

const GOALS_QUESTIONS: ReadonlyArray<Question> = [
  {
    q: 'How do I set up a custom financial goal?',
    a: "Click New Goal from the Savings Targets card. Choose a category, set a target amount and date, and we'll calculate the monthly contribution needed.",
  },
  {
    q: 'Can I track multiple goals at once?',
    a: 'Yes. Pro accounts can track unlimited goals. Basic accounts support up to 3 active goals.',
  },
  {
    q: 'How are monthly contributions calculated?',
    a: 'We divide the remaining amount by the number of months until your target date, adjusted for your current savings rate and any auto-transfer schedules.',
  },
]

export const Model = S.Struct({
  tabs: Tabs.Model,
  selectedTab: S.String,
  general: Accordion.Model,
  billing: Accordion.Model,
  goals: Accordion.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotTabsMessage: {
    message: Tabs.Message,
  },
  GotGeneralMessage: {
    message: Accordion.Message,
  },
  GotBillingMessage: {
    message: Accordion.Message,
  },
  GotGoalsMessage: {
    message: Accordion.Message,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotTabsMessage: ({ message: tabsMessage }) => {
        const {
          model: tabs,
          commands: tabsCommands__,
          outMessage: tabsOut__,
        } = Tabs.update(model.tabs, tabsMessage)
        const commands = tabsCommands__ ?? []
        const maybeSelection = Option.fromNullishOr(tabsOut__)

        return {
          model: modifyFields(model, {
            tabs: () => tabs,
            selectedTab: current =>
              Option.match(maybeSelection, {
                onNone: () => current,
                onSome: selection => selection.value,
              }),
          }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotTabsMessage({ message: nextMessage }),
          ),
        }
      },
      GotGeneralMessage: ({ message: accordionMessage }) => {
        const { model: general, commands: generalCommands__ } =
          Accordion.update(model.general, accordionMessage)
        const commands = generalCommands__ ?? []

        return {
          model: modifyFields(model, { general: () => general }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotGeneralMessage({ message: nextMessage }),
          ),
        }
      },
      GotBillingMessage: ({ message: accordionMessage }) => {
        const { model: billing, commands: billingCommands__ } =
          Accordion.update(model.billing, accordionMessage)
        const commands = billingCommands__ ?? []

        return {
          model: modifyFields(model, { billing: () => billing }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotBillingMessage({ message: nextMessage }),
          ),
        }
      },
      GotGoalsMessage: ({ message: accordionMessage }) => {
        const { model: goals, commands: goalsCommands__ } = Accordion.update(
          model.goals,
          accordionMessage,
        )
        const commands = goalsCommands__ ?? []

        return {
          model: modifyFields(model, { goals: () => goals }),
          commands: Command.mapMessages(commands, nextMessage =>
            Message.GotGoalsMessage({ message: nextMessage }),
          ),
        }
      },
    }),
  )

const accordionInit = (id: string): Accordion.Model =>
  Accordion.init({
    id,
    type: 'single',
    value: ['item-0'],
  })

export const init = (): Model => ({
  tabs: Tabs.init({ id: 'faq-tabs' }),
  selectedTab: 'general',
  general: accordionInit('faq-general'),
  billing: accordionInit('faq-billing'),
  goals: accordionInit('faq-goals'),
})

const questionList = (
  model: Accordion.Model,
  questions: ReadonlyArray<Question>,
  toParentMessage: (message: Accordion.Message) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: Accordion.view,
    viewInputs: {
      items: questions.map((item, index) => ({
        value: `item-${index}`,
        trigger: item.q,
        content: item.a,
      })),
    },
    toParentMessage,
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card<Message>(
    {
      children: [
        cardContent(
          {
            children: [
              Tabs.tabs<Message>(
                {
                  model: model.tabs,
                  selectedValue: model.selectedTab,
                  toParentMessage: message =>
                    Message.GotTabsMessage({ message }),
                  listClass: 'w-full',
                  triggerClass: 'flex-1',
                  tabs: [
                    {
                      value: 'general',
                      label: 'General',
                      content: questionList(
                        model.general,
                        GENERAL_QUESTIONS,
                        message => Message.GotGeneralMessage({ message }),
                        h,
                      ),
                    },
                    {
                      value: 'billing',
                      label: 'Billing',
                      content: questionList(
                        model.billing,
                        BILLING_QUESTIONS,
                        message => Message.GotBillingMessage({ message }),
                        h,
                      ),
                    },
                    {
                      value: 'goals',
                      label: 'Goals',
                      content: questionList(
                        model.goals,
                        GOALS_QUESTIONS,
                        message => Message.GotGoalsMessage({ message }),
                        h,
                      ),
                    },
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
              button(
                {
                  variant: 'outline',
                  class: 'w-full',
                  children: ['Contact Support'],
                },
                h,
              ),
              button(
                { variant: 'link', class: 'w-full', children: ['Learn More'] },
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

// Card summary: stateful? yes. Submodels wired: Tabs and three Accordions. PORT NOTEs: none.
