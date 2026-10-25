import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { DESKTOP, MOBILE, radarCard, radarOption } from './radar-shared'
const HOST_ID = 'chart-radar-radius'
// PORT NOTE: Recharts can label one PolarRadiusAxis; ECharts repeats radar
// radius labels on every indicator axis, which is illegible at this card size.
// The radius grid is retained, while the repeated numeric labels are omitted.
Chart.registerChart(HOST_ID, theme =>
  radarOption(theme, { desktop: DESKTOP, mobile: MOBILE, radiusLabels: true }),
)
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  radarCard(
    { hostId: HOST_ID, title: 'Radar Chart - Radius Axis', toMessage },
    h,
  )
