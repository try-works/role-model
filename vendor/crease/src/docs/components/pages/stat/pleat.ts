import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  statFixtures,
  type StatItem,
} from '@/docs/components/pages/stat/shared'
import { className } from '@/pleat/style'
import * as Card from '@/pleat/card'
import * as Stat from '@/pleat/stat'
import { tokens } from '../../../../pleat/tokens'

const styles = {
  grid: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  }),
  row: Style.make({ gap: '2rem', alignItems: 'flex-end', display: 'flex' }),
  sparkline: Style.make({
    color: tokens.primary,
    display: 'block',
    height: '2.25rem',
    width: '100%',
  }),
}

const sparkline = <Msg>(h: HtmlBuilder<Msg>) =>
  h.svg(
    [
      h.ViewBox('0 0 160 36'),
      h.Role('img'),
      h.AriaLabel('Rising trend'),
      h.Class(className(reset.svg, styles.sparkline)),
    ],
    [
      h.polyline(
        [
          h.Points('0,28 24,26 48,30 72,18 96,20 120,10 160,8'),
          h.Fill('none'),
          h.Stroke('currentColor'),
          h.StrokeWidth('3'),
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
        ],
        [],
      ),
    ],
  )

const statView = <Msg>(item: StatItem, h: HtmlBuilder<Msg>) =>
  Stat.stat(
    {
      label: item.label,
      value: item.value,
      ...(item.delta === undefined ? {} : { delta: item.delta }),
      ...(item.description === undefined
        ? {}
        : { description: item.description }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.withMedia === true ? { media: [sparkline(h)] } : {}),
    },
    h,
  )

const inCard = <Msg>(item: StatItem, h: HtmlBuilder<Msg>) =>
  Card.card(
    { children: [Card.cardContent({ children: [statView(item, h)] }, h)] },
    h,
  )

export const statPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = statFixtures[exampleIndex] ?? statFixtures[0]
  return fixture.layout === 'cards'
    ? h.div(
        [h.Class(className(styles.grid))],
        fixture.items.map(item => inCard(item, h)),
      )
    : fixture.layout === 'row'
      ? h.div(
          [h.Class(className(styles.row))],
          fixture.items.map(item => statView(item, h)),
        )
      : inCard(fixture.items[0] ?? { label: '', value: '' }, h)
}
