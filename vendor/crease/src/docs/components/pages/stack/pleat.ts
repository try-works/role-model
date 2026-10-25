import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  stackAlignmentRows,
  stackFixtures,
  stackGapGroups,
  stackShowcaseGroups,
  stackUsers,
  type StackFixture,
} from '@/docs/components/pages/stack/shared'
import { className } from '@/pleat/style'
import * as Avatar from '@/pleat/avatar'
import * as Badge from '@/pleat/badge'
import * as Button from '@/pleat/button'
import * as Card from '@/pleat/card'
import * as Stack from '@/pleat/stack'

const styles = {
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  name: Style.make({
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  heading: Style.make({
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '1rem',
  }),
  body: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.supporting))], [text])

const badge = <Msg>(label: string, h: HtmlBuilder<Msg>): Html =>
  Badge.badge({ variant: 'secondary', children: [label] }, h)

const cardLabel = <Msg>(label: string, h: HtmlBuilder<Msg>): Html =>
  Card.card(
    {
      size: 'sm',
      children: [Card.cardContent({ children: [supporting(label, h)] }, h)],
    },
    h,
  )

const directionsView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 10,
      hAlign: 'center',
      children: [
        Stack.hStack(
          {
            gap: 2,
            vAlign: 'center',
            children: [
              badge('Horizontal', h),
              badge('Horizontal', h),
              badge('Horizontal', h),
            ],
          },
          h,
        ),
        Stack.vStack(
          {
            gap: 2,
            children: [
              badge('Vertical', h),
              badge('Vertical', h),
              badge('Vertical', h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

const alignmentView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.stack(
    {
      direction: 'vertical',
      gap: 3,
      width: '100%',
      maxWidth: 500,
      children: stackAlignmentRows.map(row =>
        Card.card(
          {
            size: 'sm',
            children: [
              Card.cardContent(
                {
                  children: [
                    Stack.vStack(
                      {
                        gap: 4,
                        children: [
                          supporting(row.label, h),
                          Stack.hStack(
                            {
                              gap: 1,
                              hAlign: row.hAlign,
                              children: [
                                Button.button(
                                  {
                                    variant: 'secondary',
                                    size: 'sm',
                                    children: ['Cancel'],
                                  },
                                  h,
                                ),
                                Button.button(
                                  { size: 'sm', children: ['Save'] },
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
              ),
            ],
          },
          h,
        ),
      ),
    },
    h,
  )

const fillItemView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 3,
      width: '100%',
      maxWidth: 300,
      children: stackUsers.map(user =>
        Stack.hStack(
          {
            gap: 3,
            vAlign: 'center',
            children: [
              Stack.stackItem(
                {
                  size: 'static',
                  children: [
                    Avatar.avatar(
                      {
                        children: [
                          Avatar.avatarFallback(
                            { children: [user.initials] },
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
              Stack.stackItem(
                {
                  size: 'fill',
                  children: [
                    Stack.vStack(
                      {
                        gap: 0,
                        children: [
                          h.p(
                            [h.Class(className(reset.text, styles.name))],
                            [user.name],
                          ),
                          supporting(user.role, h),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              Stack.stackItem(
                {
                  size: 'static',
                  children: [
                    Button.button(
                      {
                        variant: 'secondary',
                        size: 'sm',
                        children: ['View'],
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
      ),
    },
    h,
  )

const hBasicView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 2,
      vAlign: 'center',
      children: [
        badge('Foldkit', h),
        badge('TypeScript', h),
        badge('Node.js', h),
      ],
    },
    h,
  )

const hShowcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 6,
      width: '100%',
      maxWidth: 400,
      children: stackShowcaseGroups.map(group =>
        Stack.vStack(
          {
            gap: 2,
            children: [
              supporting(group.label, h),
              Stack.hStack(
                {
                  gap: group.gap,
                  hAlign: group.hAlign,
                  children: group.items.map(label => badge(label, h)),
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
  )

const vBasicView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 3,
      children: [
        h.h5(
          [h.Class(className(reset.text, styles.heading))],
          ['Weekly Report'],
        ),
        h.p(
          [h.Class(className(reset.text, styles.body))],
          ['VStack arranges its children in a vertical column.'],
        ),
        h.p(
          [h.Class(className(reset.text, styles.body))],
          ['The gap prop controls the spacing between each item.'],
        ),
      ],
    },
    h,
  )

const vShowcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 10,
      hAlign: 'center',
      children: stackGapGroups.map(group =>
        Stack.vStack(
          {
            gap: 2,
            children: [
              supporting(group.label, h),
              Stack.vStack(
                {
                  gap: group.gap,
                  children: [
                    badge('Step 1', h),
                    badge('Step 2', h),
                    badge('Step 3', h),
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
  )

const itemFillView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 3,
      vAlign: 'center',
      width: '100%',
      maxWidth: 400,
      children: [
        Stack.stackItem(
          { size: 'static', children: [cardLabel('Static', h)] },
          h,
        ),
        Stack.stackItem(
          {
            size: 'fill',
            children: [cardLabel('Fills remaining space', h)],
          },
          h,
        ),
      ],
    },
    h,
  )

const itemShowcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 3,
      vAlign: 'center',
      width: '100%',
      maxWidth: 500,
      children: [
        Stack.stackItem(
          { size: 'static', children: [cardLabel('Static Width', h)] },
          h,
        ),
        Stack.stackItem(
          {
            size: 'fill',
            children: [cardLabel('Fills remaining space', h)],
          },
          h,
        ),
        Stack.stackItem(
          { size: 'static', children: [cardLabel('Static Width', h)] },
          h,
        ),
      ],
    },
    h,
  )

const previewFor = <Msg>(fixture: StackFixture, h: HtmlBuilder<Msg>): Html => {
  switch (fixture.kind) {
    case 'directions':
      return directionsView(h)
    case 'alignment':
      return alignmentView(h)
    case 'fillItem':
      return fillItemView(h)
    case 'hBasic':
      return hBasicView(h)
    case 'hShowcase':
      return hShowcaseView(h)
    case 'vBasic':
      return vBasicView(h)
    case 'vShowcase':
      return vShowcaseView(h)
    case 'itemFill':
      return itemFillView(h)
    case 'itemShowcase':
      return itemShowcaseView(h)
  }
}

export const stackPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => previewFor(stackFixtures[exampleIndex] ?? stackFixtures[0], h)
