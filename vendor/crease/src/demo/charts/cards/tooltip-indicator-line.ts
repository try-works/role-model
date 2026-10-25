import type { HtmlBuilder } from 'foldkit/html'
import type * as Chart from '@/lib/echarts'
import {
  registerTooltipCard,
  tooltipCardView,
} from '@/demo/charts/cards/tooltip-default'

const HOST_ID = 'chart-tooltip-indicator-line'
registerTooltipCard(HOST_ID, 'line')

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  tooltipCardView(
    {
      hostId: HOST_ID,
      title: 'Tooltip - Line Indicator',
      description: 'Tooltip with line indicator.',
      toMessage,
    },
    h,
  )
