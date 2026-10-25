import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { radarCard, radarOption } from './radar-shared'
const HOST_ID = 'chart-radar-grid-none'
Chart.registerChart(HOST_ID, theme =>
  radarOption(theme, { splitLine: false, axisLine: false, dots: true }),
)
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  radarCard({ hostId: HOST_ID, title: 'Radar Chart - Grid None', toMessage }, h)
