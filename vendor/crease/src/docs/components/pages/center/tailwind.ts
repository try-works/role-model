import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  type CenterFixture,
  centerFixtures,
} from '@/docs/components/pages/center/shared'
import { icon } from '@/lib/icon'
import * as Button from '@/ui/button'
import * as Card from '@/ui/card'
import * as Center from '@/ui/center'
import * as Stack from '@/ui/stack'

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
              h.h4([h.Class('text-sm font-semibold')], ['Centered content']),
              h.p(
                [h.Class('text-sm text-muted-foreground')],
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
        children: [icon(name, { class: 'size-4' }, h)],
      },
      h,
    )
  return Card.card(
    {
      size: 'sm',
      class: 'w-[520px]',
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
      class: 'w-[400px]',
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
                          icon(
                            'inbox',
                            { class: 'size-6 text-muted-foreground' },
                            h,
                          ),
                          h.p(
                            [h.Class('text-sm font-semibold')],
                            ['No messages yet'],
                          ),
                          h.p(
                            [h.Class('text-xs text-muted-foreground')],
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

export type CenterStaticPreview = <Msg>(
  model: Readonly<Record<string, never>>,
  h: HtmlBuilder<Msg>,
) => Html

const previewFor = (fixture: CenterFixture): CenterStaticPreview => {
  switch (fixture.kind) {
    case 'showcase':
      return (_m, h) => showcaseView(h)
    case 'horizontal':
      return (_m, h) => horizontalView(h)
    case 'insideCard':
      return (_m, h) => insideCardView(h)
  }
}

export const centerTailwindPreviews: ReadonlyArray<CenterStaticPreview> =
  centerFixtures.map(previewFor)
