import type { HtmlBuilder } from 'foldkit/html'
import type { ButtonProps, ButtonLinkProps } from '@/ui/button'
import type { InputProps } from '@/ui/input'
import type { ChartProps } from '@/lib/echarts'
import * as Button from '@/ui/button'
import * as Input from '@/ui/input'
import * as Chart from '@/lib/echarts'
import * as TabsComponent from '@/ui/tabs'
import * as TableComponent from '@/ui/table'

export { badge } from '@/ui/badge'
export { switchControl } from '@/ui/switch'
export * as Tabs from '@/ui/tabs'
export * as Dialog from '@/ui/dialog'
export * as Combobox from '@/ui/combobox'
export * as Palette from '@/ui/command'
export * as DateRange from '@/ui/date-range-input'
export * as Table from '@/ui/table'
export { map } from '@/ui/map'
export { mapControls } from '@/ui/map-controls'
export { mapMarker, markerContent, markerTooltip } from '@/ui/map-marker'
export { mapRoute } from '@/ui/map-route'

export const studioThemeCss = (): string => ''

export type ButtonAppearance = 'control' | 'pill' | 'pillWide' | 'studio'
const buttonClasses = {
  control: 'h-10',
  pill: 'h-10 rounded-full px-4',
  pillWide: 'h-10 rounded-full px-5',
  studio: 'h-10 w-full rounded-[var(--radius)]',
} as const

export const button = <Msg>(
  {
    appearance,
    ...props
  }: Omit<ButtonProps<Msg>, 'class'> & { appearance?: ButtonAppearance },
  h: HtmlBuilder<Msg>,
) =>
  Button.button(
    {
      ...props,
      ...(appearance === undefined ? {} : { class: buttonClasses[appearance] }),
    },
    h,
  )

export const buttonLink = <Msg>(
  {
    appearance,
    ...props
  }: Omit<ButtonLinkProps, 'class'> & { appearance?: ButtonAppearance },
  h: HtmlBuilder<Msg>,
) =>
  Button.buttonLink(
    {
      ...props,
      ...(appearance === undefined ? {} : { class: buttonClasses[appearance] }),
    },
    h,
  )

export const input = <Msg>(
  {
    appearance,
    ...props
  }: Omit<InputProps<Msg>, 'class'> & { appearance?: 'control' | 'surface' },
  h: HtmlBuilder<Msg>,
) =>
  Input.input(
    {
      ...props,
      ...(appearance === undefined
        ? {}
        : { class: appearance === 'surface' ? 'h-10 bg-background' : 'h-10' }),
    },
    h,
  )

export const createShowcaseTabs = <Value extends string>() => {
  const bundle = TabsComponent.create<Value>()
  return {
    update: bundle.update,
    tabs: <Msg>(
      props: TabsComponent.TabsProps<Value, Msg>,
      h: HtmlBuilder<Msg>,
    ) =>
      bundle.tabs(
        {
          ...props,
          class: 'min-w-0 gap-4',
          listClass: 'max-w-full',
          triggerClass: 'px-1.5 sm:px-2',
          contentClass: 'min-w-0 outline-none',
        },
        h,
      ),
  }
}

export const numberCell = <Msg>(
  props: Parameters<typeof TableComponent.tableCell<Msg>>[0],
  h: HtmlBuilder<Msg>,
) => TableComponent.tableCell({ ...props, class: 'text-right tabular-nums' }, h)

export const exploreChart = <Msg>(
  props: Omit<ChartProps<Msg>, 'class'>,
  h: HtmlBuilder<Msg>,
) =>
  Chart.chart(
    {
      ...props,
      class:
        'mt-5 w-full [&>[data-slot=echart]]:h-[260px] [&>[data-slot=echart]]:aspect-auto sm:[&>[data-slot=echart]]:h-[320px]',
    },
    h,
  )
