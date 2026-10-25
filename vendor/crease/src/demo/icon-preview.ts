import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { iconNodes as hugeiconsNodes } from '../../registry/icons/hugeicons/icon-nodes'
import { iconNodes as lucideNodes } from '../../registry/icons/lucide/icon-nodes'
import { iconNodes as phosphorNodes } from '../../registry/icons/phosphor/icon-nodes'
import { iconNodes as remixiconNodes } from '../../registry/icons/remixicon/icon-nodes'
import { iconNodes as tablerNodes } from '../../registry/icons/tabler/icon-nodes'
import { cn } from '@/lib/utils'

type IconLibrary = 'lucide' | 'hugeicons' | 'tabler' | 'phosphor' | 'remixicon'
type IconTag = 'circle' | 'ellipse' | 'g' | 'path' | 'rect'
type IconNode = readonly [
  IconTag,
  Readonly<Record<string, string>>,
  ReadonlyArray<IconNode>,
]
type IconDefinition = Readonly<{
  width: number
  height: number
  nodes: ReadonlyArray<IconNode>
}>

export type IconConfig = Readonly<{
  class?: string
  ariaLabel?: string
}>

const libraries: ReadonlyArray<
  readonly [IconLibrary, Readonly<Record<string, IconDefinition>>]
> = [
  ['lucide', lucideNodes],
  ['hugeicons', hugeiconsNodes],
  ['tabler', tablerNodes],
  ['phosphor', phosphorNodes],
  ['remixicon', remixiconNodes],
]

const nodeView = <Msg>(h: HtmlBuilder<Msg>, node: IconNode): Html => {
  const attributes: ReadonlyArray<Attribute<Msg>> = Object.entries(node[1]).map(
    ([key, value]) => h.Attribute(key, value),
  )
  const children = node[2].map(child => nodeView(h, child))
  switch (node[0]) {
    case 'circle':
      return h.circle(attributes, children)
    case 'ellipse':
      return h.ellipse(attributes, children)
    case 'g':
      return h.g(attributes, children)
    case 'path':
      return h.path(attributes, children)
    case 'rect':
      return h.rect(attributes, children)
  }
}

const libraryIcon = <Msg>(
  library: IconLibrary,
  _definitions: Readonly<Record<string, IconDefinition>>,
  name: string,
  h: HtmlBuilder<Msg>,
): Html =>
  h.svg(
    [
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox('0 0 24 24'),
      h.Class(`crease-preview-icon-${library} size-full`),
      h.AriaHidden(true),
    ],
    [h.use([h.Attribute('href', `#crease-preview-${library}-${name}`)], [])],
  )

export const spriteDefinitions = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.svg(
    [
      h.Style({
        position: 'absolute',
        width: '0',
        height: '0',
        overflow: 'hidden',
      }),
      h.AriaHidden(true),
    ],
    [
      h.defs(
        [],
        libraries.flatMap(([library, definitions]) =>
          Object.entries(definitions).map(([name, definition]) =>
            h.symbol(
              [
                h.Attribute('id', `crease-preview-${library}-${name}`),
                h.ViewBox(`0 0 ${definition.width} ${definition.height}`),
              ],
              definition.nodes.map(child => nodeView(h, child)),
            ),
          ),
        ),
      ),
    ],
  )

export const icon = <Msg>(
  name: string,
  config: IconConfig,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.Class(
        cn('crease-preview-icon inline-flex size-4 shrink-0', config.class),
      ),
      ...(config.ariaLabel === undefined
        ? [h.AriaHidden(true)]
        : [h.Role('img'), h.AriaLabel(config.ariaLabel)]),
    ],
    libraries.map(([library, definitions]) =>
      libraryIcon(library, definitions, name, h),
    ),
  )

const named =
  (name: string) =>
  <Msg>(config: IconConfig, h: HtmlBuilder<Msg>): Html =>
    icon(name, config, h)

export const check = named('check')
export const chevronDown = named('chevron-down')
export const chevronRight = named('chevron-right')
export const chevronsUpDown = named('chevrons-up-down')
export const minus = named('minus')
export const moreHorizontal = named('ellipsis')
export const plus = named('plus')
export const search = named('search')
