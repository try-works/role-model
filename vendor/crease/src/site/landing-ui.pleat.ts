import { Style } from '@pleat/core'
import type { HtmlBuilder } from 'foldkit/html'
import type { ChartProps } from '@/lib/echarts'
import { eChart } from '@/pleat/integrations/echarts'
import { layoutStyle } from '@/pleat/contracts'
export { badge } from '@/pleat/badge'
export { button, buttonLink } from '@/pleat/button'
export {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/pleat/card'
export { input } from '@/pleat/input'
export { kbd } from '@/pleat/kbd'
export { separator } from '@/pleat/separator'

const styles = {
  chart: layoutStyle({ height: '8rem' }),
}
export const heroChart = <Msg>(
  props: Omit<ChartProps<Msg>, 'class'>,
  h: HtmlBuilder<Msg>,
) =>
  eChart(
    {
      ...props,
      size: 'spark',
      layoutStyle: styles.chart,
      accessibleAlternative:
        props.accessibleAlternative ?? h.p([], [props.ariaLabel]),
    },
    h,
  )
