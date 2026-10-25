import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { pieCard, stackedPieOption } from './pie-shared'
const HOST_ID = 'chart-pie-stacked'
Chart.registerChart(HOST_ID, theme => stackedPieOption(theme))
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  pieCard({ hostId: HOST_ID, title: 'Pie Chart - Stacked', toMessage }, h)
