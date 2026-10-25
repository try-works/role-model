import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type MobileNavFixture,
  type NavSectionSpec,
  mobileNavFixtures,
} from '@/docs/components/pages/mobile-nav/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/pleat/button'
import * as MobileNav from '@/pleat/mobile-nav'
import * as Sidebar from '@/pleat/sidebar'
import { className } from '@/pleat/style'

const styles = {
  main: Style.make({
    padding: '2rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '10rem',
  }),
  headerRow: Style.make({
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
  }),
  pageTitle: Style.make({
    fontSize: '1rem',
    fontWeight: 700,
    lineHeight: '1.5rem',
  }),
  navContent: Style.make({
    padding: '0.5rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  navIcon: Style.make({ height: '1rem', width: '1rem' }),
  toggleIcon: Style.make({ height: '1.25rem', width: '1.25rem' }),
}

type PreviewModel = Readonly<{
  nav: MobileNav.Model
}>

const msg = <Msg>(
  onMessageJson: (json: string) => Msg,
  tag: string,
  fields?: Record<string, unknown>,
): Msg => onMessageJson(JSON.stringify({ _tag: tag, ...fields }))

const fixtureFor = (index: number): MobileNavFixture =>
  mobileNavFixtures[index] ?? mobileNavFixtures[0]!

const navIcons = {
  house: Icon.house,
  folder: Icon.folder,
  chartBarStacked: Icon.chartBarStacked,
  settings: Icon.settings,
  users: Icon.users,
} as const

const navSection = <Msg>(h: HtmlBuilder<Msg>, section: NavSectionSpec): Html =>
  Sidebar.sidebarGroup(
    {
      children: [
        Sidebar.sidebarGroupLabel({ children: [section.title] }, h),
        Sidebar.sidebarGroupContent(
          {
            children: [
              Sidebar.sidebarMenu(
                {
                  children: section.items.map(item =>
                    Sidebar.sidebarMenuItem(
                      {
                        children: [
                          Sidebar.sidebarMenuButton(
                            {
                              href: item.href,
                              ...(item.isSelected === true
                                ? { isActive: true }
                                : {}),
                              children: [
                                ...(item.icon === undefined
                                  ? []
                                  : [
                                      navIcons[
                                        item.icon as keyof typeof navIcons
                                      ](
                                        { class: className(styles.navIcon) },
                                        h,
                                      ),
                                    ]),
                                item.label,
                              ],
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
          },
          h,
        ),
      ],
    },
    h,
  )

const navContent = <Msg>(
  h: HtmlBuilder<Msg>,
  fixture: MobileNavFixture,
): Html =>
  h.div(
    [h.Class(className(styles.navContent))],
    fixture.sections.map(section => navSection(h, section)),
  )

const trigger = <Msg>(
  fixture: MobileNavFixture,
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.trigger) {
    case 'icon':
      return Button.button(
        {
          variant: 'ghost',
          size: 'icon',
          ariaLabel: 'Open Navigation',
          onClick: msg(onMessageJson, 'ClickedOpenNavPreview'),
          children: [Icon.menu({ class: className(styles.toggleIcon) }, h)],
        },
        h,
      )
    case 'labeled':
      return Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedOpenNavPreview'),
          children: ['Open from Right'],
        },
        h,
      )
    case 'toggle':
      return h.div(
        [h.Class(className(styles.headerRow))],
        [
          MobileNav.mobileNavToggle(
            {
              controls: model.nav.dialog.id,
              isExpanded: model.nav.dialog.isOpen,
              message: msg(onMessageJson, 'ClickedOpenNavPreview'),
            },
            h,
          ),
          h.p(
            [h.Class(className(reset.text, styles.pageTitle))],
            ['Page title'],
          ),
        ],
      )
    case 'togglelabeled':
      return h.div(
        [h.Class(className(styles.headerRow))],
        [
          MobileNav.mobileNavToggle(
            {
              controls: model.nav.dialog.id,
              isExpanded: model.nav.dialog.isOpen,
              message: msg(onMessageJson, 'ClickedOpenNavPreview'),
              label: 'Open menu',
            },
            h,
          ),
          h.p(
            [h.Class(className(reset.text, styles.pageTitle))],
            ['Page title'],
          ),
        ],
      )
  }
}

export const mobileNavPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = fixtureFor(exampleIndex)
  const m = model as PreviewModel
  return h.main(
    [h.Class(className(styles.main))],
    [
      trigger(fixture, m, onMessageJson, h),
      MobileNav.mobileNav(
        {
          model: m.nav,
          toParentMessage: message =>
            msg(onMessageJson, 'GotNavPreviewMessage', { message }),
          ...(fixture.navTitle === undefined
            ? {}
            : { title: fixture.navTitle }),
          content: navContent(h, fixture),
        },
        h,
      ),
    ],
  )
}
