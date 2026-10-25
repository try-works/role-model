import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  tabsFixtures,
  type TabsCardSpec,
  type TabsFixture,
  type TabsTabSpec,
} from '@/docs/components/pages/tabs/shared'
import * as Card from '@/ui/card'
import * as Icon from '@/lib/icon'
import * as Tabs from '@/ui/tabs'

const TabValue = S.String
type TabValue = typeof TabValue.Type
const ExampleTabs = Tabs.create<TabValue>()

const GotTabsMessage = defineMessageUnion({
  GotTabsMessage: { message: Tabs.Message },
})
type GotTabsMessage = typeof GotTabsMessage.Type

const TabsPreviewModel = S.Struct({
  _docsPage: S.Literal('tabs'),
  tabs: Tabs.Model,
  selectedTab: S.String,
})
type TabsPreviewModel = typeof TabsPreviewModel.Type

const cardView = (card: TabsCardSpec, h: HtmlBuilder<GotTabsMessage>): Html =>
  Card.card(
    {
      children: [
        Card.cardHeader(
          {
            children: [
              Card.cardTitle({ children: [card.title] }, h),
              Card.cardDescription({ children: [card.description] }, h),
            ],
          },
          h,
        ),
        Card.cardContent(
          {
            children: [card.text],
          },
          h,
        ),
      ],
    },
    h,
  )

const tabConfig = (
  tab: TabsTabSpec,
  h: HtmlBuilder<GotTabsMessage>,
): {
  value: string
  label: Html | string
  icon?: Html
  isLabelHidden?: boolean
  content: Html | string
  isDisabled?: boolean
} => ({
  value: tab.value,
  label: tab.label,
  ...(tab.icon === undefined ? {} : { icon: Icon.icon(tab.icon, {}, h) }),
  ...(tab.isLabelHidden === true ? { isLabelHidden: true } : {}),
  content: tab.card === undefined ? tab.content : cardView(tab.card, h),
  ...(tab.isDisabled === true ? { isDisabled: true } : {}),
})

const tabsView = (
  fixture: TabsFixture,
  model: TabsPreviewModel,
  h: HtmlBuilder<GotTabsMessage>,
): Html =>
  ExampleTabs.tabs(
    {
      model: model.tabs,
      selectedValue: model.selectedTab,
      toParentMessage: message => GotTabsMessage.GotTabsMessage({ message }),
      ariaLabel: fixture.ariaLabel,
      tabs: fixture.tabs.map(tab => tabConfig(tab, h)),
      ...(fixture.variant === 'line' ? { variant: 'line' as const } : {}),
      ...(fixture.orientation === 'vertical'
        ? { orientation: 'vertical' as const }
        : {}),
      ...(fixture.rtl === true ? { direction: 'rtl' as const } : {}),
      ...(fixture.kind === 'demo' ? { class: 'w-100' } : {}),
    },
    h,
  )

export const tabsTailwindPreviewProgram = definePreviewProgram<
  TabsPreviewModel,
  GotTabsMessage
>({
  Model: TabsPreviewModel,
  Message: GotTabsMessage,
  init: index => {
    const fixture = tabsFixtures[index] ?? tabsFixtures[0]
    return {
      _docsPage: 'tabs',
      tabs: Tabs.init({
        id: `docs-tabs-${String(index)}`,
        ...(fixture.manual === true
          ? { activationMode: 'Manual' as const }
          : {}),
      }),
      selectedTab: fixture.tabs[0]?.value ?? 'overview',
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotTabsMessage': {
        const next = ExampleTabs.update(model.tabs, message.message)
        const commands = next.commands ?? []
        return {
          model: {
            ...model,
            tabs: next.model,
            selectedTab: Option.match(Option.fromNullishOr(next.outMessage), {
              onNone: () => model.selectedTab,
              onSome: selected => selected.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            GotTabsMessage.GotTabsMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    tabsView(tabsFixtures[index] ?? tabsFixtures[0], model, h),
})
