import type { HtmlBuilder } from 'foldkit/html'
import type * as Chart from '@/lib/echarts'
import {
  registerTooltipCard,
  tooltipCardView,
} from '@/demo/charts/cards/tooltip-default'

const HOST_ID = 'chart-tooltip-advanced'
registerTooltipCard(HOST_ID, 'advanced')

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  tooltipCardView(
    {
      hostId: HOST_ID,
      title: 'Tooltip - Advanced',
      description: 'Tooltip with custom formatter and total.',
      toMessage,
    },
    h,
  )
