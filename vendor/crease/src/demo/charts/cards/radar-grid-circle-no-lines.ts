import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { radarCard, radarOption } from './radar-shared'
const HOST_ID = 'chart-radar-grid-circle-no-lines'
Chart.registerChart(HOST_ID, theme =>
  radarOption(theme, {
    desktop: [186, 305, 237, 203, 209, 214],
    shape: 'circle',
    axisLine: false,
  }),
)
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  radarCard(
    {
      hostId: HOST_ID,
      title: 'Radar Chart - Grid Circle - No lines',
      toMessage,
    },
    h,
  )
