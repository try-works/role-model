import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { radarCard, radarOption } from './radar-shared'
const HOST_ID = 'chart-radar-lines-only'
Chart.registerChart(HOST_ID, theme =>
  radarOption(theme, {
    desktop: [186, 185, 207, 173, 160, 174],
    mobile: [160, 170, 180, 160, 190, 204],
    linesOnly: true,
    axisLine: false,
  }),
)
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  radarCard(
    { hostId: HOST_ID, title: 'Radar Chart - Lines Only', toMessage },
    h,
  )
