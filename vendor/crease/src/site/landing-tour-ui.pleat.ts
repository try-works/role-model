import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ButtonProps, ButtonLinkProps } from '@/pleat/button'
import type { InputProps } from '@/pleat/input'
import type { ChartProps } from '@/lib/echarts'
import type { ButtonAppearance } from './landing-tour-ui'
import * as Button from '@/pleat/button'
import * as Input from '@/pleat/input'
import * as TabsComponent from '@/pleat/tabs'
import type * as TableComponent from '@/pleat/table'
import { renderButton, renderButtonLink } from '@/lib/button'
import { eChart } from '@/pleat/integrations/echarts'
import { className } from '@/pleat/style'
import { reset } from '@/pleat/reset'
import { tokens } from '@/pleat/tokens'
import { foundationTokens } from '@/pleat/foundations-tokens'

import { layoutStyle, layoutWhen } from '@/pleat/contracts'
export { badge } from '@/pleat/badge'
export { switchControl } from '@/pleat/switch'
export * as Tabs from '@/pleat/tabs'
export * as Dialog from '@/pleat/dialog'
export * as Combobox from '@/pleat/combobox'
export * as Palette from '@/pleat/command'
export * as DateRange from '@/pleat/date-range-input'
export * as Table from '@/pleat/table'
export { map } from '@/pleat/map'
export { mapControls } from '@/pleat/map-controls'
export { mapMarker, markerContent, markerTooltip } from '@/pleat/map-marker'
export { mapRoute } from '@/pleat/map-route'

// Rebind aliases where the preset is applied so descendants resolve the
// preview's variables, rather than the variables inherited from :root.
export const studioThemeCss = (): string => {
  // This follows the scoped alias binding used by the StyleX theme builder.
  const aliases: ReadonlyArray<
    readonly [{ toString(): string }, { toString(): string }]
  > = [
    [tokens.background, 'var(--background)'],
    [tokens.foreground, 'var(--foreground)'],
    [tokens.primary, 'var(--primary)'],
    [tokens.primaryForeground, 'var(--primary-foreground)'],
    [tokens.secondary, 'var(--secondary)'],
    [tokens.secondaryForeground, 'var(--secondary-foreground)'],
    [tokens.muted, 'var(--muted)'],
    [tokens.mutedForeground, 'var(--muted-foreground)'],
    [tokens.input, 'var(--input)'],
    [tokens.ring, 'var(--ring)'],
    [tokens.radius, 'var(--radius)'],
    [tokens.controlRadius, 'calc(var(--radius) - 2px)'],
    [
      tokens.buttonPrimaryHover,
      'color-mix(in oklab, var(--primary) 80%, transparent)',
    ],
    [
      tokens.buttonSecondaryHover,
      'color-mix(in oklab, var(--secondary), var(--foreground) 5%)',
    ],
    [
      tokens.focusRingShadow,
      '0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)',
    ],
    [foundationTokens.muted, 'var(--muted)'],
  ]
  const declarations = aliases
    .map(
      ([variable, value]) =>
        `${String(variable).replace(/^var\((--[^,)]+).*/, '$1')}:${value};`,
    )
    .join('')
  return `.landing-studio .create-board-theme{${declarations}}`
}

// Composition-specific control choices stay here, outside the component contracts.
const styles = {
  control: Style.make({ height: '2.5rem' }),
  pill: Style.make({
    height: '2.5rem',
    borderRadius: '9999px',
    paddingInline: '1rem',
  }),
  pillWide: Style.make({
    height: '2.5rem',
    borderRadius: '9999px',
    paddingInline: '1.25rem',
  }),
  studio: Style.make({
    height: '2.5rem',
    width: '100%',
    borderRadius: 'var(--radius)',
  }),
  surfaceInput: Style.make({
    height: '2.5rem',
    backgroundColor: 'var(--background)',
  }),
  tabs: layoutStyle({ minWidth: 0 }),
  tabsList: layoutStyle({ maxWidth: '100%', marginBottom: '.5rem' }),
  tabsContent: layoutStyle({ minWidth: 0 }),
  number: Style.make({
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    padding: '.5rem',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  }),
  chartRegion: Style.make({ marginTop: '1.25rem', width: '100%' }),
  chart: layoutStyle({ height: '260px' }).pipe(
    layoutWhen(When.minWidth('640px'), { height: '320px' }),
  ),
}

export const button = <Msg>(
  {
    appearance,
    ...props
  }: ButtonProps<Msg> & { appearance?: ButtonAppearance },
  h: HtmlBuilder<Msg>,
): Html =>
  appearance === undefined
    ? Button.button(props, h)
    : renderButton(
        props,
        [
          h.DataAttribute('variant', props.variant ?? 'default'),
          h.DataAttribute('size', props.size ?? 'default'),
          h.Class(
            className(...Button.buttonVisualStyles(props), styles[appearance]),
          ),
        ],
        h,
      )

export const buttonLink = <Msg>(
  { appearance, ...props }: ButtonLinkProps & { appearance?: ButtonAppearance },
  h: HtmlBuilder<Msg>,
): Html =>
  appearance === undefined
    ? Button.buttonLink(props, h)
    : renderButtonLink(
        props,
        [
          h.DataAttribute('variant', props.variant ?? 'default'),
          h.DataAttribute('size', props.size ?? 'default'),
          h.Class(
            className(
              reset.link,
              ...Button.buttonVisualStyles(props),
              styles[appearance],
            ),
          ),
        ],
        h,
      )

export const input = <Msg>(
  {
    appearance,
    ...props
  }: InputProps<Msg> & { appearance?: 'control' | 'surface' },
  h: HtmlBuilder<Msg>,
) =>
  Input.input(
    {
      ...props,
      inputStyle:
        appearance === 'surface'
          ? styles.surfaceInput
          : appearance === 'control'
            ? styles.control
            : undefined,
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
          layoutStyle: styles.tabs,
          listLayoutStyle: styles.tabsList,
          contentLayoutStyle: styles.tabsContent,
        },
        h,
      ),
  }
}

export const numberCell = <Msg>(
  props: Parameters<typeof TableComponent.tableCell<Msg>>[0],
  h: HtmlBuilder<Msg>,
) =>
  h.td(
    [h.DataAttribute('slot', 'table-cell'), h.Class(className(styles.number))],
    [...props.children],
  )

export const exploreChart = <Msg>(
  props: Omit<ChartProps<Msg>, 'class'>,
  h: HtmlBuilder<Msg>,
) =>
  h.div(
    [h.Class(className(styles.chartRegion))],
    [
      eChart(
        {
          ...props,
          size: 'spark',
          layoutStyle: styles.chart,
          accessibleAlternative:
            props.accessibleAlternative ?? h.p([], [props.ariaLabel]),
        },
        h,
      ),
    ],
  )
