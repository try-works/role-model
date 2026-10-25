import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import { radarCard, radarOption } from './radar-shared'
const HOST_ID = 'chart-radar-default'
Chart.registerChart(HOST_ID, theme => radarOption(theme))
export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => radarCard({ hostId: HOST_ID, title: 'Radar Chart', toMessage }, h)
