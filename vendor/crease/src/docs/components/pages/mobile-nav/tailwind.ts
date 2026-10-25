import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type MobileNavFixture,
  type NavSectionSpec,
  mobileNavFixtures,
} from '@/docs/components/pages/mobile-nav/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as MobileNav from '@/ui/mobile-nav'
import * as Sidebar from '@/ui/sidebar'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('mobile-nav'),
  nav: MobileNav.Model,
})
type PreviewModel = typeof PreviewModel.Type

const PreviewMessage = defineMessageUnion({
  ClickedOpenNavPreview: {},
  GotNavPreviewMessage: { message: MobileNav.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

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
                                      ]({ class: 'size-4' }, h),
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
    [h.Class('flex flex-col gap-2 p-2')],
    fixture.sections.map(section => navSection(h, section)),
  )

const trigger = (
  fixture: MobileNavFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  switch (fixture.trigger) {
    case 'icon':
      return Button.button(
        {
          variant: 'ghost',
          size: 'icon',
          ariaLabel: 'Open Navigation',
          onClick: PreviewMessage.ClickedOpenNavPreview(),
          children: [Icon.menu({ class: 'size-5' }, h)],
        },
        h,
      )
    case 'labeled':
      return Button.button(
        {
          variant: 'default',
          onClick: PreviewMessage.ClickedOpenNavPreview(),
          children: ['Open from Right'],
        },
        h,
      )
    case 'toggle':
      return h.div(
        [h.Class('flex items-center gap-3')],
        [
          MobileNav.mobileNavToggle(
            {
              controls: model.nav.dialog.id,
              isExpanded: model.nav.dialog.isOpen,
              message: PreviewMessage.ClickedOpenNavPreview(),
            },
            h,
          ),
          h.p([h.Class('text-base font-bold')], ['Page title']),
        ],
      )
    case 'togglelabeled':
      return h.div(
        [h.Class('flex items-center gap-3')],
        [
          MobileNav.mobileNavToggle(
            {
              controls: model.nav.dialog.id,
              isExpanded: model.nav.dialog.isOpen,
              message: PreviewMessage.ClickedOpenNavPreview(),
              label: 'Open menu',
            },
            h,
          ),
          h.p([h.Class('text-base font-bold')], ['Page title']),
        ],
      )
  }
}

export const mobileNavTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = fixtureFor(index)
    return {
      _docsPage: 'mobile-nav',
      nav:
        fixture.side === 'end'
          ? MobileNav.init({
              id: `docs-mobile-nav-${String(index)}`,
              side: 'end',
            })
          : MobileNav.init({ id: `docs-mobile-nav-${String(index)}` }),
    }
  },
  update: (model, message): Update.Return<PreviewModel, PreviewMessage> => {
    switch (message._tag) {
      case 'ClickedOpenNavPreview': {
        const result = MobileNav.open(model.nav)
        return {
          model: { ...model, nav: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            PreviewMessage.GotNavPreviewMessage({ message: next }),
          ),
        }
      }
      case 'GotNavPreviewMessage': {
        const result = MobileNav.update(model.nav, message.message)
        return {
          model: { ...model, nav: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            PreviewMessage.GotNavPreviewMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = fixtureFor(index)
    return h.main(
      [h.Class('flex min-h-40 items-center justify-center p-8')],
      [
        trigger(fixture, model, h),
        MobileNav.mobileNav(
          {
            model: model.nav,
            toParentMessage: (message: MobileNav.Message): PreviewMessage =>
              PreviewMessage.GotNavPreviewMessage({ message }),
            ...(fixture.navTitle === undefined
              ? {}
              : { title: fixture.navTitle }),
            content: navContent(h, fixture),
          },
          h,
        ),
      ],
    )
  },
})
