import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type GridFixture,
  gridFixtures,
  gridGalleryCards,
  gridMetrics,
  gridStats,
  gridTeams,
} from '@/docs/components/pages/grid/shared'
import * as Card from '@/ui/card'
import * as Grid from '@/ui/grid'
import * as Resizable from '@/ui/resizable'
import * as Stack from '@/ui/stack'

const GridPreviewMessageUnion = defineMessageUnion({
  GotResizablePreviewMessage: { message: Resizable.Message },
})
type GridPreviewMessage = typeof GridPreviewMessageUnion.Type
const GridPreviewModel = S.Struct({
  _docsPage: S.Literal('grid'),
  resizable: Resizable.Model,
})
type GridPreviewModel = typeof GridPreviewModel.Type

const label = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-sm font-medium')], [text])
const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-xs')], [text])
const body = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class('text-sm text-muted-foreground')], [text])

const card = <Msg>(
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      size: 'sm',
      children: [Card.cardContent({ children: [...children] }, h)],
    },
    h,
  )

const tallCard = <Msg>(
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      size: 'sm',
      class: 'h-20',
      children: [Card.cardContent({ children: [...children] }, h)],
    },
    h,
  )

const cyanCard = <Msg>(
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      size: 'sm',
      class:
        'border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40',
      children: [Card.cardContent({ children: [...children] }, h)],
    },
    h,
  )

const showcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Grid.grid(
    {
      columns: 3,
      gap: 2,
      width: 400,
      children: Array.from({ length: 12 }, (_, i) =>
        card([`Item ${String(i + 1)}`], h),
      ),
    },
    h,
  )

const spanningView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Grid.grid(
    {
      columns: 3,
      gap: 4,
      width: '100%',
      maxWidth: 500,
      children: [
        Grid.gridSpan(
          {
            rows: 2,
            children: [
              cyanCard(
                [
                  Stack.vStack(
                    {
                      gap: 1,
                      children: [
                        label('Featured Release', h),
                        supporting(
                          'CreaseUI is now available with new layout primitives, refreshed tokens, and improved theming support across the system.',
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
        ...gridStats.map(stat =>
          card([label(stat.label, h), supporting(stat.value, h)], h),
        ),
        Grid.gridSpan(
          {
            columns: 'full',
            children: [
              cyanCard(
                [
                  Stack.vStack(
                    {
                      gap: 1,
                      children: [
                        label('Community Showcase', h),
                        supporting(
                          'See how teams are building with CreaseUI across the organization',
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
      ],
    },
    h,
  )

const autoFitView = (
  model: GridPreviewModel,
  h: HtmlBuilder<GridPreviewMessage>,
): Html =>
  Card.card(
    {
      class:
        'h-[400px] w-full max-w-[500px] gap-0 overflow-hidden bg-muted p-0',
      children: [
        Resizable.resizable(
          {
            model: model.resizable,
            toParentMessage: message =>
              GridPreviewMessageUnion.GotResizablePreviewMessage({ message }),
            direction: 'horizontal',
            minSize: 20,
            maxSize: 96,
            extent: 500,
            withHandle: true,
            ariaLabel: 'Resize grid',
            class: 'h-full w-full border-0',
            first: h.div(
              [h.Class('h-full overflow-auto p-4')],
              [
                Grid.grid(
                  {
                    columns: { minWidth: 180, repeat: 'fit' },
                    gap: 4,
                    width: '100%',
                    children: gridTeams.map(team =>
                      card(
                        [
                          Stack.vStack(
                            {
                              gap: 1,
                              children: [
                                label(team.name, h),
                                supporting(
                                  `${String(team.members)} members`,
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
            ),
            second: h.div([h.Class('h-full')], []),
          },
          h,
        ),
      ],
    },
    h,
  )

const dashboardView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Grid.grid(
    {
      columns: 4,
      gap: 4,
      width: '100%',
      maxWidth: 500,
      children: [
        Grid.gridSpan(
          {
            columns: 2,
            rows: 2,
            children: [
              card(
                [
                  label('Weekly Traffic', h),
                  supporting(
                    'Page views and unique visitors over the last 7 days',
                    h,
                  ),
                ],
                h,
              ),
            ],
          },
          h,
        ),
        ...gridMetrics.map(metric =>
          card([supporting(metric.label, h), label(metric.value, h)], h),
        ),
        Grid.gridSpan(
          {
            columns: 'full',
            children: [
              card(
                [
                  label('Recent Activity', h),
                  supporting('Latest events across all projects', h),
                ],
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

const galleryView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Grid.grid(
    {
      columns: { minWidth: 180 },
      gap: 5,
      width: '100%',
      maxWidth: 400,
      children: gridGalleryCards.map(item =>
        card(
          [
            Stack.vStack(
              {
                gap: 1,
                children: [
                  label(item.title, h),
                  supporting(item.description, h),
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

const spanColumnsView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Grid.grid(
    {
      columns: 3,
      gap: 3,
      width: 400,
      children: [
        Grid.gridSpan(
          {
            columns: 2,
            children: [tallCard([body('Spans 2 columns', h)], h)],
          },
          h,
        ),
        tallCard([body('1 col', h)], h),
        tallCard([body('1 col', h)], h),
        Grid.gridSpan(
          {
            columns: 2,
            children: [tallCard([body('Spans 2 columns', h)], h)],
          },
          h,
        ),
      ],
    },
    h,
  )

const spanShowcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Grid.grid(
    {
      columns: 4,
      gap: 3,
      width: 400,
      children: [
        Grid.gridSpan(
          {
            columns: 3,
            children: [tallCard([body('Spans 3 columns', h)], h)],
          },
          h,
        ),
        tallCard([body('1 col', h)], h),
        Grid.gridSpan({ rows: 2, children: [card([body('1 col', h)], h)] }, h),
        Grid.gridSpan(
          {
            columns: 3,
            children: [tallCard([body('Full-width row', h)], h)],
          },
          h,
        ),
        tallCard([body('1 col', h)], h),
        Grid.gridSpan(
          {
            columns: 2,
            children: [tallCard([body('Spans 2 columns', h)], h)],
          },
          h,
        ),
      ],
    },
    h,
  )

const viewFor = (
  fixture: GridFixture,
  model: GridPreviewModel,
  h: HtmlBuilder<GridPreviewMessage>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return showcaseView(h)
    case 'spanning':
      return spanningView(h)
    case 'autoFit':
      return autoFitView(model, h)
    case 'dashboard':
      return dashboardView(h)
    case 'gallery':
      return galleryView(h)
    case 'spanColumns':
      return spanColumnsView(h)
    case 'spanShowcase':
      return spanShowcaseView(h)
  }
}

export const gridTailwindPreviewProgram = definePreviewProgram<
  GridPreviewModel,
  GridPreviewMessage
>({
  Model: GridPreviewModel,
  Message: GridPreviewMessageUnion,
  init: () => ({
    _docsPage: 'grid',
    resizable: Resizable.init('grid-auto-fit', 96),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotResizablePreviewMessage':
        return {
          model: {
            ...model,
            resizable: Resizable.update(model.resizable, message.message),
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = gridFixtures[index] ?? gridFixtures[0]
    return viewFor(fixture, model, h)
  },
})
