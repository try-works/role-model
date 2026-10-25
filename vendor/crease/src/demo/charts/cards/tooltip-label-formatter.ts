import type { HtmlBuilder } from 'foldkit/html'
import type * as Chart from '@/lib/echarts'
import {
  registerTooltipCard,
  tooltipCardView,
} from '@/demo/charts/cards/tooltip-default'

const HOST_ID = 'chart-tooltip-label-formatter'
registerTooltipCard(HOST_ID, 'label-formatter')

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  tooltipCardView(
    {
      hostId: HOST_ID,
      title: 'Tooltip - Label Formatter',
      description: 'Tooltip with label formatter.',
      toMessage,
    },
    h,
  )
