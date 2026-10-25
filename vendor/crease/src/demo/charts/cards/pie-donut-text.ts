import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { pieCard, pieOption } from './pie-shared'
const HOST_ID = 'chart-pie-donut-text'
Chart.registerChart(HOST_ID, theme =>
  pieOption(theme, {
    values: [275, 200, 287, 173, 190],
    donut: true,
    centerValue: '1,125',
    centerLabel: 'Visitors',
  }),
)
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  pieCard(
    { hostId: HOST_ID, title: 'Pie Chart - Donut with Text', toMessage },
    h,
  )
