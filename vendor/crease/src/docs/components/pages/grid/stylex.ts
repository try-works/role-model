import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type GridFixture,
  gridFixtures,
  gridGalleryCards,
  gridMetrics,
  gridStats,
  gridTeams,
} from '@/docs/components/pages/grid/shared'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'
import * as Card from '@/stylex/card'
import * as Grid from '@/stylex/grid'
import * as Resizable from '@/stylex/resizable'
import * as Stack from '@/stylex/stack'

// The Tailwind Card carries `shadow-sm`, whose serialized value includes the
// theme's base ring/border shadows — overriding tokens.shadowCard verbatim so
// both renderers produce the identical box-shadow.
const CARD_SHADOW =
  'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px'

const styles = stylex.create({
  label: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  supporting: { fontSize: '0.75rem', lineHeight: '1rem' },
  body: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  cardShadow: { boxShadow: CARD_SHADOW },
  tallCard: { boxShadow: CARD_SHADOW, height: '5rem' },
  featuredCard: {
    borderColor: 'oklch(0.917 0.08 205.041)',
    backgroundColor: 'oklch(0.984 0.019 200.873)',
    boxShadow: CARD_SHADOW,
  },
  shell: {
    gap: 0,
    paddingBlock: 0,
    backgroundColor: 'var(--muted)',
    boxShadow: CARD_SHADOW,
    height: '25rem',
    maxWidth: '31.25rem',
    width: '100%',
  },
  gridPanel: { padding: '1rem', overflow: 'auto', height: '100%' },
  filler: { height: '100%' },
  group: {
    borderRadius: 'var(--radius)',
    borderWidth: 0,
    height: '100%',
    width: '100%',
  },
})

type PreviewModel = Readonly<{
  resizable: Resizable.Model
}>

const msg = <Msg>(
  onMessageJson: (json: string) => Msg,
  fields?: Record<string, unknown>,
): Msg =>
  onMessageJson(
    JSON.stringify({ _tag: 'GotResizablePreviewMessage', ...fields }),
  )

const label = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.label))], [text])
const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.supporting))], [text])
const body = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.body))], [text])

const card = <Msg>(
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      size: 'sm',
      layoutStyle: styles.cardShadow as ComponentLayoutStyle,
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
      layoutStyle: styles.tallCard as ComponentLayoutStyle,
      children: [Card.cardContent({ children: [...children] }, h)],
    },
    h,
  )

const featuredCard = <Msg>(
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      size: 'sm',
      layoutStyle: styles.featuredCard as ComponentLayoutStyle,
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
              featuredCard(
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
              featuredCard(
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

const autoFitView = <Msg>(
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Card.card(
    {
      layoutStyle: styles.shell as ComponentLayoutStyle,
      children: [
        Resizable.resizable(
          {
            model: model.resizable,
            toParentMessage: message => msg(onMessageJson, { message }),
            direction: 'horizontal',
            minSize: 20,
            maxSize: 96,
            extent: 500,
            withHandle: true,
            ariaLabel: 'Resize grid',
            layoutStyle: styles.group as ComponentLayoutStyle,
            first: h.div(
              [h.Class(className(styles.gridPanel))],
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
            second: h.div([h.Class(className(styles.filler))], []),
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

const viewFor = <Msg>(
  fixture: GridFixture,
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return showcaseView(h)
    case 'spanning':
      return spanningView(h)
    case 'autoFit':
      return autoFitView(model, onMessageJson, h)
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

export const gridStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  viewFor(
    gridFixtures[exampleIndex] ?? gridFixtures[0],
    model as PreviewModel,
    onMessageJson,
    h,
  )
