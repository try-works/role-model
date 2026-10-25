import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type VisuallyHiddenFixture,
  vhActions,
  vhItems,
  visuallyHiddenFixtures,
  vhStats,
} from '@/docs/components/pages/visually-hidden/shared'
import { icon } from '@/lib/icon'
import * as Badge from '@/ui/badge'
import * as Button from '@/ui/button'
import * as Card from '@/ui/card'
import * as Stack from '@/ui/stack'
import * as VisuallyHidden from '@/ui/visually-hidden'

const COLUMNS = ['Backlog', 'In progress', 'Done'] as const

const VisuallyHiddenPreviewMessageUnion = defineMessageUnion({
  MovedTask: {},
})
type VisuallyHiddenPreviewMessage =
  typeof VisuallyHiddenPreviewMessageUnion.Type
const VisuallyHiddenPreviewModel = S.Struct({
  _docsPage: S.Literal('visually-hidden'),
  column: S.Number,
})
type VisuallyHiddenPreviewModel = typeof VisuallyHiddenPreviewModel.Type

const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-xs text-muted-foreground')], [text])
const body = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-sm')], [text])
const display = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-[29px] leading-9 font-normal')], [text])

const mutedCard = <Msg>(
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      size: 'sm',
      class: 'bg-muted border-transparent shadow-none',
      children: [Card.cardContent({ children: [...children] }, h)],
    },
    h,
  )

const showcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 5,
      hAlign: 'center',
      children: [
        Stack.hStack(
          {
            gap: 6,
            vAlign: 'stretch',
            wrap: 'wrap',
            hAlign: 'center',
            children: [
              mutedCard(
                [
                  Stack.vStack(
                    {
                      gap: 4,
                      hAlign: 'center',
                      children: [
                        supporting('What you see', h),
                        Stack.hStack(
                          {
                            gap: 2,
                            children: vhActions.map(action =>
                              Button.button(
                                {
                                  variant: 'ghost',
                                  size: 'icon',
                                  ariaLabel: action.label,
                                  children: [
                                    icon(action.icon, { class: 'size-4' }, h),
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
                h,
              ),
              mutedCard(
                [
                  Stack.vStack(
                    {
                      gap: 4,
                      hAlign: 'start',
                      children: [
                        Stack.hStack(
                          {
                            gap: 2,
                            vAlign: 'center',
                            children: [
                              icon(
                                'volume-2',
                                { class: 'size-4 text-muted-foreground' },
                                h,
                              ),
                              supporting('What a screen reader hears', h),
                            ],
                          },
                          h,
                        ),
                        Stack.vStack(
                          {
                            gap: 2,
                            children: vhActions.map(action =>
                              body(`${action.label}, button`, h),
                            ),
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
                h,
              ),
            ],
          },
          h,
        ),
        VisuallyHidden.visuallyHidden(
          {
            as: 'div',
            ariaLive: 'polite',
            children: ['Actions available: Download, Share, Delete.'],
          },
          h,
        ),
      ],
    },
    h,
  )

const liveRegionView = (
  model: VisuallyHiddenPreviewModel,
  h: HtmlBuilder<VisuallyHiddenPreviewMessage>,
): Html => {
  const current = COLUMNS[model.column] ?? COLUMNS[0]
  return Stack.vStack(
    {
      gap: 4,
      hAlign: 'start',
      children: [
        supporting(
          'Drag-and-drop and other visual-only changes are silent to screen readers. A live region narrates them.',
          h,
        ),
        Stack.hStack(
          {
            gap: 3,
            vAlign: 'center',
            children: [
              Button.button(
                {
                  variant: 'secondary',
                  children: ['Move task'],
                  onClick: VisuallyHiddenPreviewMessageUnion.MovedTask(),
                },
                h,
              ),
              h.p(
                [h.Class('text-sm')],
                ['Task is in ', h.span([h.Class('font-bold')], [current])],
              ),
            ],
          },
          h,
        ),
        VisuallyHidden.visuallyHidden(
          {
            as: 'div',
            ariaLive: 'polite',
            children: [`Task moved to ${current}`],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const headingView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 3,
      hAlign: 'start',
      children: [
        supporting(
          'The layout makes this group obvious to sighted users. A hidden heading gives screen-reader users the same landmark to jump to.',
          h,
        ),
        VisuallyHidden.visuallyHidden(
          { as: 'h2', children: ['Build status'] },
          h,
        ),
        Stack.vStack(
          {
            gap: 2,
            children: vhItems.map(item =>
              mutedCard(
                [
                  Stack.hStack(
                    {
                      gap: 3,
                      vAlign: 'center',
                      children: [
                        body(item.name, h),
                        Badge.badge(
                          {
                            variant:
                              item.variant === 'error'
                                ? 'destructive'
                                : 'secondary',
                            children: [item.status],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
                h,
              ),
            ),
          },
          h,
        ),
      ],
    },
    h,
  )

const supplementaryView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 4,
      wrap: 'wrap',
      children: vhStats.map(stat =>
        mutedCard(
          [
            Stack.vStack(
              {
                gap: 1,
                children: [
                  supporting(stat.label, h),
                  display(stat.value, h),
                  Stack.hStack(
                    {
                      gap: 1,
                      vAlign: 'center',
                      children: [
                        icon(
                          stat.direction === 'up' ? 'arrow-up' : 'arrow-down',
                          {
                            class:
                              stat.direction === 'up'
                                ? 'size-4 text-accent-foreground'
                                : 'size-4 text-muted-foreground',
                          },
                          h,
                        ),
                        body(stat.delta, h),
                        VisuallyHidden.visuallyHidden(
                          {
                            children: [
                              stat.direction === 'up'
                                ? ' increase'
                                : ' decrease',
                              ' from last month',
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
          h,
        ),
      ),
    },
    h,
  )

const viewFor = (
  fixture: VisuallyHiddenFixture,
  model: VisuallyHiddenPreviewModel,
  h: HtmlBuilder<VisuallyHiddenPreviewMessage>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return showcaseView(h)
    case 'liveRegion':
      return liveRegionView(model, h)
    case 'heading':
      return headingView(h)
    case 'supplementary':
      return supplementaryView(h)
  }
}

export const visuallyHiddenTailwindPreviewProgram = definePreviewProgram<
  VisuallyHiddenPreviewModel,
  VisuallyHiddenPreviewMessage
>({
  Model: VisuallyHiddenPreviewModel,
  Message: VisuallyHiddenPreviewMessageUnion,
  init: () => ({ _docsPage: 'visually-hidden', column: 0 }),
  update: (model, message) => {
    switch (message._tag) {
      case 'MovedTask':
        return {
          model: {
            ...model,
            column: (model.column + 1) % COLUMNS.length,
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = visuallyHiddenFixtures[index] ?? visuallyHiddenFixtures[0]
    return viewFor(fixture, model, h)
  },
})
