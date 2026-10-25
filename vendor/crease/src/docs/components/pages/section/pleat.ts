import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type SectionFixture,
  sectionFeatures,
  sectionFixtures,
} from '@/docs/components/pages/section/shared'
import { icon } from '@/lib/icon'
import { className } from '@/pleat/style'
import * as Button from '@/pleat/button'
import * as Section from '@/pleat/section'
import * as Stack from '@/pleat/stack'

const styles = {
  boldBody: Style.make({
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  bodyMuted: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  body: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  display: Style.make({
    fontSize: '1.8125rem',
    fontWeight: 400,
    lineHeight: '1.2414',
  }),
}

const boldBody = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.boldBody))], [text])
const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.supporting))], [text])
const bodyMuted = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.bodyMuted))], [text])
const body = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.body))], [text])
const display = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.display))], [text])

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
                                icon('check', {}, h),
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

const viewFor = <Msg>(fixture: SectionFixture, h: HtmlBuilder<Msg>): Html => {
  switch (fixture.kind) {
    case 'variants':
      return variantsView(h)
    case 'wash':
      return washView(h)
    case 'dividers':
      return dividersView(h)
  }
}

export const sectionPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => viewFor(sectionFixtures[exampleIndex] ?? sectionFixtures[0], h)
