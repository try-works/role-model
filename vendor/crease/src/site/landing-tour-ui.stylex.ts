import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ButtonProps, ButtonLinkProps } from '@/stylex/button'
import type { InputProps } from '@/stylex/input'
import type { ChartProps } from '@/lib/echarts'
import type { ButtonAppearance } from './landing-tour-ui'
import * as Button from '@/stylex/button'
import * as Input from '@/stylex/input'
import * as TabsComponent from '@/stylex/tabs'
import type * as TableComponent from '@/stylex/table'
import { renderButton, renderButtonLink } from '@/lib/button'
import { eChart } from '@/stylex/integrations/echarts'
import { className } from '@/stylex/style'
import { reset } from '@/stylex/reset'
import { tokens } from '@/stylex/tokens.stylex'
import { foundationTokens } from '@/stylex/foundations-tokens.stylex'

export { badge } from '@/stylex/badge'
export { switchControl } from '@/stylex/switch'
export * as Tabs from '@/stylex/tabs'
export * as Dialog from '@/stylex/dialog'
export * as Combobox from '@/stylex/combobox'
export * as Palette from '@/stylex/command'
export * as DateRange from '@/stylex/date-range-input'
export * as Table from '@/stylex/table'
export { map } from '@/stylex/map'
export { mapControls } from '@/stylex/map-controls'
export { mapMarker, markerContent, markerTooltip } from '@/stylex/map-marker'
export { mapRoute } from '@/stylex/map-route'

// Rebind aliases where the preset is applied so descendants resolve the
// preview's variables, rather than the variables inherited from :root.
export const studioThemeCss = (): string => {
  // This follows the scoped alias binding used by the StyleX theme builder.
  const aliases: ReadonlyArray<readonly [string, string]> = [
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
        `${variable.replace(/^var\((--[^,)]+).*/, '$1')}:${value};`,
    )
    .join('')
  return `.landing-studio .create-board-theme{${declarations}}`
}

// Composition-specific control choices stay here, outside the component contracts.
const styles = stylex.create({
  control: { height: '2.5rem' },
  pill: { height: '2.5rem', borderRadius: '9999px', paddingInline: '1rem' },
  pillWide: {
    height: '2.5rem',
    borderRadius: '9999px',
    paddingInline: '1.25rem',
  },
  studio: { height: '2.5rem', width: '100%', borderRadius: 'var(--radius)' },
  surfaceInput: { height: '2.5rem', backgroundColor: 'var(--background)' },
  tabs: { minWidth: 0 },
  tabsList: { maxWidth: '100%', marginBottom: '.5rem' },
  tabsContent: { minWidth: 0 },
  number: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    padding: '.5rem',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  chartRegion: { marginTop: '1.25rem', width: '100%' },
  chart: { height: { default: '260px', '@media (min-width: 640px)': '320px' } },
})

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
