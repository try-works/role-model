import type { HtmlBuilder } from 'foldkit/html'
import type * as Chart from '@/lib/echarts'
import {
  registerTooltipCard,
  tooltipCardView,
} from '@/demo/charts/cards/tooltip-default'

const HOST_ID = 'chart-tooltip-indicator-none'
registerTooltipCard(HOST_ID, 'none')

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  tooltipCardView(
    {
      hostId: HOST_ID,
      title: 'Tooltip - No Indicator',
      description: 'Tooltip with no indicator.',
      toMessage,
    },
    h,
  )
