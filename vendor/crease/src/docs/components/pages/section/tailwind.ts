import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  type SectionFixture,
  sectionFeatures,
  sectionFixtures,
} from '@/docs/components/pages/section/shared'
import { icon } from '@/lib/icon'
import * as Button from '@/ui/button'
import * as Section from '@/ui/section'
import * as Stack from '@/ui/stack'

const boldBody = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-sm font-semibold')], [text])
const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-xs text-muted-foreground')], [text])
const bodyMuted = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-sm text-muted-foreground')], [text])
const body = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-sm')], [text])
const display = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-[29px] leading-9 font-normal')], [text])

const variantsView = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const inner = (title: string, desc: string): Html =>
    Stack.vStack(
      { gap: 1, children: [boldBody(title, h), supporting(desc, h)] },
      h,
    )
  return Stack.vStack(
    {
      gap: 6,
      children: [
        Section.section(
          {
            variant: 'section',
            padding: 5,
            children: [inner('Section', 'White background.')],
          },
          h,
        ),
        Section.section(
          {
            variant: 'muted',
            padding: 5,
            children: [inner('Wash', 'Gray background.')],
          },
          h,
        ),
        Section.section(
          {
            variant: 'transparent',
            padding: 5,
            children: [
              inner('Transparent', 'No background, shows the color behind it.'),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const washView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 2,
      children: [
        Section.section(
          {
            variant: 'section',
            padding: 4,
            children: [
              Stack.vStack(
                {
                  gap: 3,
                  hAlign: 'center',
                  children: [
                    Stack.vStack(
                      {
                        gap: 1,
                        hAlign: 'center',
                        children: [
                          display('Pro Plan', h),
                          bodyMuted(
                            'Everything you need to scale your team.',
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    Stack.vStack(
                      {
                        gap: 2,
                        children: sectionFeatures.map(feature =>
                          Stack.hStack(
                            {
                              gap: 2,
                              vAlign: 'center',
                              children: [
                                icon('check', { class: 'size-4' }, h),
                                body(feature, h),
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
        ),
        Section.section(
          {
            variant: 'muted',
            padding: 6,
            children: [
              Stack.vStack(
                {
                  gap: 2,
                  hAlign: 'center',
                  children: [
                    Stack.hStack(
                      {
                        gap: 2,
                        vAlign: 'center',
                        children: [display('$49', h), supporting('/ month', h)],
                      },
                      h,
                    ),
                    Button.button({ children: ['Upgrade'] }, h),
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
  )

const dividersView = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const row = (
    title: string,
    desc: string,
    dividers?: ReadonlyArray<'top' | 'bottom' | 'start' | 'end'>,
  ): Html =>
    Section.section(
      {
        variant: 'section',
        padding: 5,
        ...(dividers === undefined ? {} : { dividers }),
        children: [
          Stack.vStack(
            { gap: 1, children: [boldBody(title, h), bodyMuted(desc, h)] },
            h,
          ),
        ],
      },
      h,
    )
  return Stack.vStack(
    {
      gap: 0,
      children: [
        row('Account', 'Manage your profile, email, and password.', ['bottom']),
        row('Notifications', 'Choose what updates you receive and how.', [
          'bottom',
        ]),
        row('Privacy', 'Control who can see your activity and data.'),
      ],
    },
    h,
  )
}

export type SectionStaticPreview = <Msg>(
  model: Readonly<Record<string, never>>,
  h: HtmlBuilder<Msg>,
) => Html

const previewFor = (fixture: SectionFixture): SectionStaticPreview => {
  switch (fixture.kind) {
    case 'variants':
      return (_m, h) => variantsView(h)
    case 'wash':
      return (_m, h) => washView(h)
    case 'dividers':
      return (_m, h) => dividersView(h)
  }
}

export const sectionTailwindPreviews: ReadonlyArray<SectionStaticPreview> =
  sectionFixtures.map(previewFor)
