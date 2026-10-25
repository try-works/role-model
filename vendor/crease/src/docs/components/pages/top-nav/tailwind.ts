import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  topNavFixtures,
  type TopNavFixture,
  type TopNavFixtureEndItem,
  type TopNavFixtureEntry,
  type TopNavFixtureFeaturedCard,
  type TopNavFixtureHeading,
  type TopNavFixtureMegaItem,
  type TopNavFixtureMenuItem,
  type TopNavFixtureNav,
} from '@/docs/components/pages/top-nav/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as TopNav from '@/ui/top-nav'

const GotTopNavPreviewMessage = defineMessageUnion({
  GotTopNavPreviewMessage: {
    key: S.String,
    message: TopNav.Message,
  },
})
type GotTopNavPreviewMessage = typeof GotTopNavPreviewMessage.Type

const TopNavPreviewModel = S.Struct({
  _docsPage: S.Literal('top-nav'),
  navs: S.Record(S.String, TopNav.Model),
  maybeSelectedId: S.Option(S.String),
})
type TopNavPreviewModel = typeof TopNavPreviewModel.Type

const decorateMenuItem = <Msg>(
  item: TopNavFixtureMenuItem,
  h: HtmlBuilder<Msg>,
): TopNav.TopNavMenuItemData => ({
  title: item.title,
  ...(item.description === undefined ? {} : { description: item.description }),
  ...(item.icon === undefined
    ? {}
    : { icon: Icon.icon(item.icon, { class: 'size-5' }, h) }),
  ...(item.href === undefined ? {} : { href: item.href }),
})

const decorateFeaturedCard = (
  card: TopNavFixtureFeaturedCard,
): TopNav.TopNavMegaMenuFeaturedCardData => ({
  title: card.title,
  ...(card.description === undefined ? {} : { description: card.description }),
  ...(card.image === undefined ? {} : { image: card.image }),
  ...(card.imageAlt === undefined ? {} : { imageAlt: card.imageAlt }),
  ...(card.linkLabel === undefined ? {} : { linkLabel: card.linkLabel }),
  ...(card.linkHref === undefined ? {} : { linkHref: card.linkHref }),
})

const decorateEntry = <Msg>(
  entry: TopNavFixtureEntry,
  h: HtmlBuilder<Msg>,
): TopNav.TopNavEntry => {
  if (entry.kind === 'menu') {
    return {
      kind: 'menu',
      label: entry.label,
      items: entry.items.map(item => decorateMenuItem(item, h)),
    }
  }
  if (entry.kind === 'megaMenu') {
    return {
      kind: 'megaMenu',
      label: entry.label,
      items: entry.items.map(item => decorateMenuItem(item, h)),
      ...(entry.featured === undefined
        ? {}
        : { featured: decorateFeaturedCard(entry.featured) }),
    }
  }
  return {
    label: entry.label,
    ...(entry.icon === undefined ? {} : { icon: entry.icon }),
    ...(entry.isSelected === true ? { isSelected: true } : {}),
    ...(entry.isDisabled === true ? { isDisabled: true } : {}),
    ...(entry.href === undefined ? {} : { href: entry.href }),
    ...(entry.onSelect === true ? { onSelect: true } : {}),
  }
}

const decorateHeading = <Msg>(
  heading: TopNavFixtureHeading,
  h: HtmlBuilder<Msg>,
): TopNav.TopNavHeadingData => ({
  ...(heading.heading === undefined ? {} : { heading: heading.heading }),
  ...(heading.logoIcon === undefined
    ? {}
    : {
        logo:
          heading.logoPlain === true
            ? Icon.icon(heading.logoIcon, { class: 'size-5' }, h)
            : h.span(
                [
                  h.Class(
                    'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  ),
                ],
                [Icon.icon(heading.logoIcon, { class: 'size-4' }, h)],
              ),
      }),
  ...(heading.headingHref === undefined
    ? {}
    : { headingHref: heading.headingHref }),
  ...(heading.superheading === undefined
    ? {}
    : { superheading: heading.superheading }),
  ...(heading.subheading === undefined
    ? {}
    : { subheading: heading.subheading }),
  ...(heading.menu === undefined
    ? {}
    : {
        menu: heading.menu.map(label => ({ label, href: '#' })),
      }),
})

const decorateEndItem = <Msg>(
  item: TopNavFixtureEndItem,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (item.kind) {
    case 'ghostIcon':
      return Button.button(
        {
          variant: 'ghost',
          size: 'icon-sm',
          ariaLabel: item.label,
          children: [Icon.icon(item.icon, { class: 'size-4' }, h)],
        },
        h,
      )
    case 'ghost':
      return Button.button({ variant: 'ghost', children: [item.label] }, h)
    case 'primary':
      return Button.button({ children: [item.label] }, h)
    case 'icon':
      return Icon.icon(item.icon, { class: 'size-5' }, h)
  }
}

const decorateEndContent = <Msg>(
  items: ReadonlyArray<TopNavFixtureEndItem>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class('flex items-center gap-1')],
    items.map(item => decorateEndItem(item, h)),
  )

const navView = <Msg>(
  nav: TopNavFixtureNav,
  navModel: TopNav.Model,
  index: number,
  toParentMessage: (message: GotTopNavPreviewMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: `docs-top-nav-${String(index)}`,
    model: navModel,
    view: TopNav.view,
    viewInputs: {
      ...(nav.label === undefined ? {} : { label: nav.label }),
      ...(nav.heading === undefined
        ? {}
        : { heading: decorateHeading(nav.heading, h) }),
      ...(nav.startItems === undefined
        ? {}
        : {
            startItems: nav.startItems.map(entry => decorateEntry(entry, h)),
          }),
      ...(nav.centerItems === undefined
        ? {}
        : {
            centerItems: nav.centerItems.map(entry => decorateEntry(entry, h)),
          }),
      ...(nav.endContent === undefined
        ? {}
        : { endContent: decorateEndContent(nav.endContent, h) }),
      ...(nav.width600 === true ? { class: 'w-150 max-w-full' } : {}),
    },
    toParentMessage: message =>
      toParentMessage(
        GotTopNavPreviewMessage.GotTopNavPreviewMessage({
          key: `nav-${String(index)}`,
          message,
        }),
      ),
  })

const fixtureView = <Msg>(
  fixture: TopNavFixture,
  model: TopNavPreviewModel,
  toParentMessage: (message: GotTopNavPreviewMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  if (fixture.kind === 'megaItems') {
    return h.div(
      [h.Class('grid w-full max-w-2xl grid-cols-2 gap-2')],
      fixture.megaItems.map(item => megaItemView(item, h)),
    )
  }
  if (fixture.kind === 'featuredCard') {
    return h.div(
      [h.Class('w-full max-w-72')],
      [
        TopNav.topNavMegaMenuFeaturedCard(
          decorateFeaturedCard(fixture.featuredCard),
          h,
        ),
      ],
    )
  }
  const navs = fixture.navs.map((nav, index) => {
    const key = `nav-${String(index)}`
    const navModel = model.navs[key] ?? TopNav.init({ id: key })
    return navView(nav, navModel, index, toParentMessage, h)
  })
  return fixture.navs.length > 1
    ? h.div([h.Class('flex w-full max-w-3xl flex-col gap-6')], navs)
    : h.div([h.Class('w-full max-w-3xl')], navs)
}

const megaItemView = <Msg>(
  item: TopNavFixtureMegaItem,
  h: HtmlBuilder<Msg>,
): Html =>
  TopNav.topNavMegaMenuItem(
    {
      title: item.title,
      ...(item.description === undefined
        ? {}
        : { description: item.description }),
      ...(item.icon === undefined
        ? {}
        : { icon: Icon.icon(item.icon, { class: 'size-5' }, h) }),
      ...(item.href === undefined ? {} : { href: item.href }),
    },
    undefined,
    h,
  )

export const topNavTailwindPreviewProgram = definePreviewProgram<
  TopNavPreviewModel,
  GotTopNavPreviewMessage
>({
  Model: TopNavPreviewModel,
  Message: GotTopNavPreviewMessage,
  init: index => {
    const fixture = topNavFixtures[index] ?? topNavFixtures[0]
    return {
      _docsPage: 'top-nav',
      navs:
        fixture.kind === 'navs'
          ? Object.fromEntries(
              fixture.navs.map((_nav, i) => [
                `nav-${String(i)}`,
                TopNav.init({
                  id: `docs-top-nav-${String(index)}-${String(i)}`,
                }),
              ]),
            )
          : {},
      maybeSelectedId: Option.none(),
    }
  },
  update: (model, message) => {
    const nav = model.navs[message.key]
    if (nav === undefined) {
      return { model }
    }
    const result = TopNav.update(nav, message.message)
    const commands = result.commands ?? []
    const maybeOut = Option.fromNullishOr(result.outMessage)
    return {
      model: {
        ...model,
        navs: { ...model.navs, [message.key]: result.model },
        maybeSelectedId: Option.match(maybeOut, {
          onNone: () => model.maybeSelectedId,
          onSome: out =>
            out._tag === 'SelectedTopNavItem'
              ? Option.some(out.id)
              : out._tag === 'SelectedTopNavMenuItem'
                ? Option.some(out.itemTitle)
                : model.maybeSelectedId,
        }),
      },
      commands: Command.mapMessages(commands, next =>
        GotTopNavPreviewMessage.GotTopNavPreviewMessage({
          key: message.key,
          message: next,
        }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = topNavFixtures[index] ?? topNavFixtures[0]
    return h.div(
      [h.Class('w-full max-w-3xl')],
      [fixtureView(fixture, model, message => message, h)],
    )
  },
})
