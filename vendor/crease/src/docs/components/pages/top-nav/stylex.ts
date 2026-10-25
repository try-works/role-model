import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  topNavFixtures,
  type TopNavFixture,
  type TopNavFixtureEndItem,
  type TopNavFixtureEntry,
  type TopNavFixtureFeaturedCard,
  type TopNavFixtureHeading,
  type TopNavFixtureMenuItem,
  type TopNavFixtureNav,
} from '@/docs/components/pages/top-nav/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/stylex/button'
import { className } from '@/stylex/style'
import * as TopNav from '@/stylex/top-nav'

const styles = stylex.create({
  page: { maxWidth: '48rem', width: '100%' },
  multiWrap: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '48rem',
    width: '100%',
  },
  itemsGrid: {
    gap: '0.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    maxWidth: '42rem',
    width: '100%',
  },
  cardWrap: { maxWidth: '18rem', width: '100%' },
  endRow: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  },
  logoTile: {
    borderRadius: '50%',
    alignItems: 'center',
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  },
  logoGlyph: { height: '1rem', width: '1rem' },
  plainGlyph: { height: '1.25rem', width: '1.25rem' },
  menuItemIcon: { height: '1.25rem', width: '1.25rem' },
  itemIcon: { flexShrink: 0, height: '1rem', width: '1rem' },
  endIcon: { height: '1.25rem', width: '1.25rem' },
  navWidth600: { maxWidth: '100%', width: '600px' },
})

const decorateMenuItem = <Msg>(
  item: TopNavFixtureMenuItem,
  h: HtmlBuilder<Msg>,
): TopNav.TopNavMenuItemData => ({
  title: item.title,
  ...(item.description === undefined ? {} : { description: item.description }),
  ...(item.icon === undefined
    ? {}
    : {
        icon: Icon.icon(
          item.icon,
          { class: className(styles.menuItemIcon) },
          h,
        ),
      }),
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
            ? Icon.icon(
                heading.logoIcon,
                { class: className(styles.plainGlyph) },
                h,
              )
            : h.span(
                [h.Class(className(styles.logoTile))],
                [
                  Icon.icon(
                    heading.logoIcon,
                    { class: className(styles.logoGlyph) },
                    h,
                  ),
                ],
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
          children: [
            Icon.icon(item.icon, { class: className(styles.itemIcon) }, h),
          ],
        },
        h,
      )
    case 'ghost':
      return Button.button({ variant: 'ghost', children: [item.label] }, h)
    case 'primary':
      return Button.button({ children: [item.label] }, h)
    case 'icon':
      return Icon.icon(item.icon, { class: className(styles.endIcon) }, h)
  }
}

export const topNavStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = topNavFixtures[exampleIndex] ?? topNavFixtures[0]
  if (fixture.kind === 'megaItems') {
    return h.div(
      [h.Class(className(styles.page))],
      [
        h.div(
          [h.Class(className(styles.itemsGrid))],
          fixture.megaItems.map(item =>
            TopNav.topNavMegaMenuItem(
              {
                title: item.title,
                ...(item.description === undefined
                  ? {}
                  : { description: item.description }),
                ...(item.icon === undefined
                  ? {}
                  : {
                      icon: Icon.icon(
                        item.icon,
                        { class: className(styles.menuItemIcon) },
                        h,
                      ),
                    }),
                ...(item.href === undefined ? {} : { href: item.href }),
              },
              undefined,
              h,
            ),
          ),
        ),
      ],
    )
  }
  if (fixture.kind === 'featuredCard') {
    return h.div(
      [h.Class(className(styles.page))],
      [
        h.div(
          [h.Class(className(styles.cardWrap))],
          [
            TopNav.topNavMegaMenuFeaturedCard(
              decorateFeaturedCard(fixture.featuredCard),
              h,
            ),
          ],
        ),
      ],
    )
  }
  const navs = (model as { navs: Record<string, TopNav.Model> }).navs
  const navViews = fixture.navs.map((nav: TopNavFixtureNav, index) => {
    const key = `nav-${String(index)}`
    const navModel = navs[key] ?? TopNav.init({ id: key })
    return h.submodel({
      slotId: `docs-stylex-top-nav-${String(index)}`,
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
              centerItems: nav.centerItems.map(entry =>
                decorateEntry(entry, h),
              ),
            }),
        ...(nav.endContent === undefined
          ? {}
          : {
              endContent: h.div(
                [h.Class(className(styles.endRow))],
                nav.endContent.map(item => decorateEndItem(item, h)),
              ),
            }),
        ...(nav.width600 === true ? { layoutStyle: styles.navWidth600 } : {}),
      },
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag: 'GotTopNavPreviewMessage',
            key,
            message,
          }),
        ),
    })
  })
  return h.div(
    [h.Class(className(styles.page))],
    [
      fixture.navs.length > 1
        ? h.div([h.Class(className(styles.multiWrap))], navViews)
        : h.div([h.Class(className(styles.page))], navViews),
    ],
  )
}
