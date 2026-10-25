import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { DESKTOP, MOBILE, radarCard, radarOption } from './radar-shared'
const HOST_ID = 'chart-radar-icons'
// PORT NOTE: ECharts' canvas legend cannot render the source's Lucide icons;
// the same series colors and labels are retained in the plain legend.
Chart.registerChart(HOST_ID, theme =>
  radarOption(theme, { desktop: DESKTOP, mobile: MOBILE, legend: true }),
)
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  radarCard(
    { hostId: HOST_ID, title: 'Radar Chart - Icons', toMessage, legend: true },
    h,
  )
