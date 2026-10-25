import type { HtmlBuilder } from 'foldkit/html'
import * as Chart from '@/lib/echarts'
export { badge } from '@/ui/badge'
export { button, buttonLink } from '@/ui/button'
export {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
export { input } from '@/ui/input'
export { kbd } from '@/ui/kbd'
export { separator } from '@/ui/separator'

export const heroChart = <Msg>(
  props: Omit<Chart.ChartProps<Msg>, 'class'>,
  h: HtmlBuilder<Msg>,
) =>
  Chart.chart(
    {
      ...props,
      class:
        'h-32 w-full [&>[data-slot=echart]]:h-full [&>[data-slot=echart]]:aspect-auto',
    },
    h,
  )
