import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type CenterFixture,
  centerFixtures,
} from '@/docs/components/pages/center/shared'
import { icon } from '@/lib/icon'
import { className } from '@/stylex/style'
import * as Button from '@/stylex/button'
import * as Card from '@/stylex/card'
import * as Center from '@/stylex/center'
import * as Stack from '@/stylex/stack'

const styles = stylex.create({
  heading: { fontSize: '0.875rem', fontWeight: 600, lineHeight: '1.25rem' },
  body: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  supporting: {
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  icon: {
    color: 'var(--muted-foreground)',
    height: '1.5rem',
    width: '1.5rem',
  },
  iconBtn4: { flexShrink: 0, height: '1rem', width: '1rem' },
  cardWide: { width: '32.5rem' },
  cardNarrow: { width: '25rem' },
})

const showcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Center.center(
    {
      axis: 'both',
      width: '100%',
      height: 240,
      children: [
        Stack.vStack(
          {
            gap: 2,
            hAlign: 'center',
            children: [
              h.h4(
                [h.Class(className(reset.text, styles.heading))],
                ['Centered content'],
              ),
              h.p(
                [h.Class(className(reset.text, styles.body))],
                ['Horizontally and vertically aligned.'],
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

const horizontalView = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const iconButton = (name: string, label: string): Html =>
    Button.button(
      {
        variant: 'ghost',
        size: 'icon-sm',
        ariaLabel: label,
        children: [icon(name, { class: className(styles.iconBtn4) }, h)],
      },
      h,
    )
  return Card.card(
    {
      size: 'sm',
      layoutStyle: styles.cardWide,
      children: [
        Card.cardContent(
          {
            children: [
              Center.center(
                {
                  axis: 'horizontal',
                  width: '100%',
                  children: [
                    Stack.hStack(
                      {
                        gap: 0,
                        vAlign: 'center',
                        children: [
                          iconButton('bold', 'Bold'),
                          iconButton('italic', 'Italic'),
                          iconButton('underline', 'Underline'),
                          iconButton('list', 'List'),
                          iconButton('link', 'Link'),
                          iconButton('image', 'Image'),
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
      ],
    },
    h,
  )
}

const insideCardView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Card.card(
    {
      size: 'sm',
      layoutStyle: styles.cardNarrow,
      children: [
        Card.cardContent(
          {
            children: [
              Center.center(
                {
                  height: 200,
                  children: [
                    Stack.vStack(
                      {
                        gap: 2,
                        hAlign: 'center',
                        children: [
                          icon('inbox', { class: className(styles.icon) }, h),
                          h.p(
                            [h.Class(className(reset.text, styles.heading))],
                            ['No messages yet'],
                          ),
                          h.p(
                            [h.Class(className(reset.text, styles.supporting))],
                            ['Messages from your team will appear here.'],
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
      ],
    },
    h,
  )

const viewFor = <Msg>(fixture: CenterFixture, h: HtmlBuilder<Msg>): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return showcaseView(h)
    case 'horizontal':
      return horizontalView(h)
    case 'insideCard':
      return insideCardView(h)
  }
}

export const centerStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => viewFor(centerFixtures[exampleIndex] ?? centerFixtures[0], h)
