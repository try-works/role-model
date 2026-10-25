import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { pieCard, pieOption } from './pie-shared'
const HOST_ID = 'chart-pie-label'
Chart.registerChart(HOST_ID, theme => pieOption(theme, { label: 'name' }))
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  pieCard({ hostId: HOST_ID, title: 'Pie Chart - Label', toMessage }, h)
