import { Array, Match as M } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { iconNodes } from '@/lib/icon-nodes'

/* Lucide icons rendered through foldkit's SVG constructors, driven by
   lucide-static's icon-nodes data (same icon set shadcn uses). Use the named
   exports; for anything else call `icon('lucide-name', config)` — and add a
   named export here when a component needs it. */

export type IconName = keyof typeof iconNodes
export const iconNames: ReadonlyArray<IconName> = Object.keys(
  iconNodes,
) as IconName[]
export const hasIcon = (name: string): name is IconName =>
  Object.hasOwn(iconNodes, name)

type IconTag =
  | 'circle'
  | 'ellipse'
  | 'g'
  | 'line'
  | 'path'
  | 'polygon'
  | 'polyline'
  | 'rect'

type IconAttributes = Readonly<{
  cx?: string
  cy?: string
  d?: string
  fill?: string
  height?: string
  points?: string
  r?: string
  rx?: string
  ry?: string
  width?: string
  x?: string
  x1?: string
  x2?: string
  y?: string
  y1?: string
  y2?: string
}>

export type IconNode = ReadonlyArray<readonly [IconTag, IconAttributes]>

export type IconConfig = Readonly<{
  class?: string
  ariaLabel?: string
  /** Emits data-icon="inline-start|inline-end" — shadcn components use it for
      icon-position padding compensation. */
  dataIcon?: 'inline-start' | 'inline-end'
}>

type H<Msg> = HtmlBuilder<Msg>

const nodeAttributes = <Msg>(
  h: H<Msg>,
  attrs: IconAttributes,
): ReadonlyArray<Attribute<Msg>> => [
  ...(attrs.cx === undefined ? [] : [h.Cx(attrs.cx)]),
  ...(attrs.cy === undefined ? [] : [h.Cy(attrs.cy)]),
  ...(attrs.d === undefined ? [] : [h.D(attrs.d)]),
  ...(attrs.fill === undefined ? [] : [h.Fill(attrs.fill)]),
  ...(attrs.height === undefined ? [] : [h.Height(attrs.height)]),
  ...(attrs.points === undefined ? [] : [h.Points(attrs.points)]),
  ...(attrs.r === undefined ? [] : [h.R(attrs.r)]),
  ...(attrs.rx === undefined ? [] : [h.Rx(attrs.rx)]),
  ...(attrs.ry === undefined ? [] : [h.Ry(attrs.ry)]),
  ...(attrs.width === undefined ? [] : [h.Width(attrs.width)]),
  ...(attrs.x === undefined ? [] : [h.X(attrs.x)]),
  ...(attrs.x1 === undefined ? [] : [h.X1(attrs.x1)]),
  ...(attrs.x2 === undefined ? [] : [h.X2(attrs.x2)]),
  ...(attrs.y === undefined ? [] : [h.Y(attrs.y)]),
  ...(attrs.y1 === undefined ? [] : [h.Y1(attrs.y1)]),
  ...(attrs.y2 === undefined ? [] : [h.Y2(attrs.y2)]),
]

const nodeView = <Msg>(
  h: H<Msg>,
  node: readonly [IconTag, IconAttributes],
): Html =>
  M.value(node[0]).pipe(
    M.withReturnType<Html>(),
    M.when('circle', () => h.circle(nodeAttributes(h, node[1]), [])),
    M.when('ellipse', () => h.ellipse(nodeAttributes(h, node[1]), [])),
    M.when('g', () => h.g(nodeAttributes(h, node[1]), [])),
    M.when('line', () => h.line(nodeAttributes(h, node[1]), [])),
    M.when('path', () => h.path(nodeAttributes(h, node[1]), [])),
    M.when('polygon', () => h.polygon(nodeAttributes(h, node[1]), [])),
    M.when('polyline', () => h.polyline(nodeAttributes(h, node[1]), [])),
    M.when('rect', () => h.rect(nodeAttributes(h, node[1]), [])),
    M.exhaustive,
  )

export const icon = <Msg>(
  name: string,
  config: IconConfig,
  h: HtmlBuilder<Msg>,
): Html => {
  const isMissing = !hasIcon(name)
  // A visible question mark and diagnostic attribute make typos discoverable,
  // while keeping views pure and preserving the requested accessible name.
  const node: IconNode = hasIcon(name)
    ? iconNodes[name]
    : iconNodes['circle-question-mark']

  return h.svg(
    [
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox('0 0 24 24'),
      h.Width('1em'),
      h.Height('1em'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('2'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.Class(`lucide lucide-${name}${config.class ? ` ${config.class}` : ''}`),
      h.Attribute('display', 'block'),
      h.Style({
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        flexShrink: '0',
      }),
      ...(isMissing ? [h.DataAttribute('icon-missing', name)] : []),
      ...(config.dataIcon === undefined
        ? []
        : [h.DataAttribute('icon', config.dataIcon)]),
      ...(config.ariaLabel === undefined
        ? [h.AriaHidden(true)]
        : [h.Role('img'), h.AriaLabel(config.ariaLabel)]),
    ],
    Array.map(node, child => nodeView(h, child)),
  )
}

const named =
  (name: string) =>
  <Msg>(config: IconConfig, h: HtmlBuilder<Msg>): Html =>
    icon<Msg>(name, config, h)

export const arrowLeft = named('arrow-left')
export const banknote = named('banknote')
export const mousePointer2 = named('mouse-pointer-2')
export const userCheck = named('user-check')
export const arrowRight = named('arrow-right')
export const arrowUpRight = named('arrow-up-right')
export const badgeCheck = named('badge-check')
export const bookmark = named('bookmark')
export const arrowDown = named('arrow-down')
export const arrowUp = named('arrow-up')
export const calendarIcon = named('calendar')
export const calendarDays = named('calendar-days')
export const check = named('check')
export const chevronDown = named('chevron-down')
export const chevronLeft = named('chevron-left')
export const chevronRight = named('chevron-right')
export const chevronUp = named('chevron-up')
export const chevronsUpDown = named('chevrons-up-down')
export const circleCheck = named('circle-check')
export const circleIcon = named('circle')
export const clock = named('clock')
export const codeXml = named('code-xml')
export const gripVertical = named('grip-vertical')
export const info = named('info')
export const eye = named('eye')
export const eyeOff = named('eye-off')
export const filter = named('funnel')
export const loaderCircle = named('loader-circle')
export const menu = named('menu')
export const house = named('house')
export const folder = named('folder')
export const chartBarStacked = named('chart-bar-stacked')
export const settings = named('settings')
export const users = named('users')
export const layoutDashboard = named('layout-dashboard')
export const minus = named('minus')
export const moreHorizontal = named('ellipsis')
export const moveHorizontal = named('move-horizontal')
export const octagonX = named('octagon-x')
export const panelLeft = named('panel-left')
export const plus = named('plus')
export const pin = named('pin')
export const rotateCcw = named('rotate-ccw')
export const search = named('search')
export const triangleAlert = named('triangle-alert')
export const x = named('x')
