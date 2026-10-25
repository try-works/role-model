import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  stackAlignmentRows,
  stackFixtures,
  stackGapGroups,
  stackShowcaseGroups,
  stackUsers,
  type StackFixture,
} from '@/docs/components/pages/stack/shared'
import * as Avatar from '@/ui/avatar'
import * as Badge from '@/ui/badge'
import * as Button from '@/ui/button'
import * as Card from '@/ui/card'
import * as Stack from '@/ui/stack'

export type StackStaticPreview = <Msg>(
  model: Readonly<Record<string, never>>,
  h: HtmlBuilder<Msg>,
) => Html

const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-xs text-muted-foreground')], [text])

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
                          h.p([h.Class('text-sm font-semibold')], [user.name]),
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
        h.h5([h.Class('text-xs font-semibold')], ['Weekly Report']),
        h.p(
          [h.Class('text-sm text-muted-foreground')],
          ['VStack arranges its children in a vertical column.'],
        ),
        h.p(
          [h.Class('text-sm text-muted-foreground')],
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

const previewFor = (fixture: StackFixture): StackStaticPreview => {
  switch (fixture.kind) {
    case 'directions':
      return (_m, h) => directionsView(h)
    case 'alignment':
      return (_m, h) => alignmentView(h)
    case 'fillItem':
      return (_m, h) => fillItemView(h)
    case 'hBasic':
      return (_m, h) => hBasicView(h)
    case 'hShowcase':
      return (_m, h) => hShowcaseView(h)
    case 'vBasic':
      return (_m, h) => vBasicView(h)
    case 'vShowcase':
      return (_m, h) => vShowcaseView(h)
    case 'itemFill':
      return (_m, h) => itemFillView(h)
    case 'itemShowcase':
      return (_m, h) => itemShowcaseView(h)
  }
}

export const stackTailwindPreviews: ReadonlyArray<StackStaticPreview> =
  stackFixtures.map(previewFor)
