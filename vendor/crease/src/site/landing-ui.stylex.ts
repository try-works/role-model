import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'
import type { ChartProps } from '@/lib/echarts'
import { eChart } from '@/stylex/integrations/echarts'
export { badge } from '@/stylex/badge'
export { button, buttonLink } from '@/stylex/button'
export {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
export { input } from '@/stylex/input'
export { kbd } from '@/stylex/kbd'
export { separator } from '@/stylex/separator'

const styles = stylex.create({ chart: { height: '8rem' } })
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
