import type { HtmlBuilder } from 'foldkit/html'
import type * as Chart from '@/lib/echarts'
import {
  registerTooltipCard,
  tooltipCardView,
} from '@/demo/charts/cards/tooltip-default'

const HOST_ID = 'chart-tooltip-icons'

// PORT NOTE: ECharts' HTML tooltip cannot embed foldkit Html nodes, so the
// source's Footprints and Waves component icons are omitted.
registerTooltipCard(HOST_ID, 'icons')

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  tooltipCardView(
    {
      hostId: HOST_ID,
      title: 'Tooltip - Icons',
      description: 'Tooltip with icons.',
      toMessage,
    },
    h,
  )
