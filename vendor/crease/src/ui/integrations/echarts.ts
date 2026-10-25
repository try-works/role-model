import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
import type { EChartProps } from '@/stylex/integrations/echarts'
export * from '@/lib/echarts'
export type { EChartSize } from '@/stylex/integrations/echarts'
export const eChart = <M>(p: EChartProps<M>, h: HtmlBuilder<M>): Html =>
  Chart.chart(
    {
      hostId: p.hostId,
      ariaLabel: p.ariaLabel,
      accessibleAlternative: p.accessibleAlternative,
      toMessage: p.toMessage,
      ...(p.variant === undefined ? {} : { variant: p.variant }),
      dataSize: p.size ?? 'default',
      class:
        p.size === 'spark'
          ? 'h-14 w-full [&_[data-slot=echart]]:h-full [&_[data-slot=echart]]:aspect-auto'
          : p.size === 'square'
            ? 'h-72 w-full [&_[data-slot=echart]]:h-full [&_[data-slot=echart]]:aspect-auto'
            : 'h-64 w-full [&_[data-slot=echart]]:h-full [&_[data-slot=echart]]:aspect-auto',
    },
    h,
  )
