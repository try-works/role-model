import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx List + ListItem (packages/core/src/List/List.tsx,
   ListItem.tsx, Item/Item.tsx) — examples and visual spec adapted to Crease
   UI tokens. astryx shares List → ListItem configuration via React context;
   Crease UI helpers are context-free, so `listItem` takes `density`,
   `listStyle`, `hasDividers`, and `edgeCompensation` explicitly (defaults
   match astryx's context defaults — pass the same values to each item). */

export type ListDensity = 'compact' | 'balanced' | 'spacious'

export type ListMarkerStyle = 'none' | 'disc' | 'decimal' | 'circle'

export type ListEdgeCompensation = 'inline'

export type ListProps = Readonly<{
  children: ReadonlyArray<Html>
  density?: ListDensity
  hasDividers?: boolean
  edgeCompensation?: ListEdgeCompensation
  /** Header content rendered above the list, associated via aria-labelledby. */
  header?: Html | string
  /** List marker style. `'decimal'` renders an `<ol>`; others render `<ul>`. */
  listStyle?: ListMarkerStyle
  /** Starting number for `listStyle: 'decimal'` lists. */
  start?: number
  class?: string
}>

export const list = <Msg>(props: ListProps, h: HtmlBuilder<Msg>): Html => {
  const listStyle = props.listStyle ?? 'none'
  const hasDividers = props.hasDividers ?? false
  const start = props.start ?? 1
  const isOrdered = listStyle === 'decimal'
  const headerId = 'list-header'

  const attributes = [
    h.DataAttribute('slot', 'list'),
    h.Role('list'),
    ...(props.header !== undefined ? [h.AriaLabelledBy(headerId)] : []),
    ...(isOrdered && start !== 1 ? [h.Start(start)] : []),
    h.Class(
      cn(
        'm-0 ps-0 list-none flex flex-col',
        hasDividers ? 'gap-0' : 'gap-0.5',
        props.class,
      ),
    ),
    ...(listStyle !== 'none'
      ? [
          h.Style({
            counterReset:
              start !== 1 ? `crease-list ${start - 1}` : 'crease-list',
          }),
        ]
      : []),
  ]

  const listElement = isOrdered
    ? h.ol(attributes, [...props.children])
    : h.ul(attributes, [...props.children])

  if (props.header === undefined) {
    return listElement
  }
  return h.div(
    [h.Class('flex flex-col')],
    [
      h.div(
        [h.Id(headerId), h.Class('mb-2')],
        [typeof props.header === 'string' ? props.header : props.header],
      ),
      listElement,
    ],
  )
}

const densityPaddingBlock: Record<ListDensity, string> = {
  compact: 'py-1',
  balanced: 'py-2',
  spacious: 'py-3',
}

const densityInsetInline: Record<ListDensity, string> = {
  compact: '8px',
  balanced: '8px',
  spacious: '12px',
}

const markerElement = <Msg>(
  listStyle: ListMarkerStyle,
  h: HtmlBuilder<Msg>,
): Html | null => {
  switch (listStyle) {
    case 'disc':
      return h.span(
        [
          h.AriaHidden(true),
          h.Class(
            'self-baseline box-border flex items-center justify-center shrink-0 w-4 mt-[calc((1em*1.4286-6px)/2)]',
          ),
        ],
        [h.span([h.Class('w-1.5 h-1.5 rounded-full bg-foreground')], [])],
      )
    case 'circle':
      return h.span(
        [
          h.AriaHidden(true),
          h.Class(
            'self-baseline box-border flex items-center justify-center shrink-0 w-4 mt-[calc((1em*1.4286-6px)/2)]',
          ),
        ],
        [
          h.span(
            [
              h.Class(
                'w-1.5 h-1.5 rounded-full border border-solid border-foreground bg-transparent',
              ),
            ],
            [],
          ),
        ],
      )
    case 'decimal':
      return h.span(
        [
          h.AriaHidden(true),
          h.Class(
            'self-baseline shrink-0 text-foreground text-sm leading-5 w-4 before:content-[counter(crease-list)_"."]',
          ),
        ],
        [],
      )
    case 'none':
      return null
  }
}

export type ListItemProps<Msg> = Readonly<{
  /** Primary label. A plain string truncates to one line. */
  label: Html | string
  /** Secondary description under the label; strings truncate to one line. */
  description?: Html | string
  /** Content rendered before the item (icon, avatar, checkbox). */
  startContent?: Html
  /** Content rendered after the item (badge, action, chevron). */
  endContent?: Html
  onClick?: Msg
  href?: string
  target?: '_blank' | '_self'
  rel?: string
  isDisabled?: boolean
  isSelected?: boolean
  /** Density — pass the parent list's `density` (default `'balanced'`). */
  density?: ListDensity
  /** Marker style — pass the parent list's `listStyle` (default `'none'`). */
  listStyle?: ListMarkerStyle
  /** Dividers — pass the parent list's `hasDividers` (default `false`). */
  hasDividers?: boolean
  /** Edge compensation — pass the parent list's `edgeCompensation`. */
  edgeCompensation?: ListEdgeCompensation
  class?: string
}>

const labelOrDescription = <Msg>(
  content: Html | string,
  singleLineClass: string,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> =>
  typeof content === 'string'
    ? [h.span([h.Class(cn('truncate', singleLineClass))], [content])]
    : [h.span([h.Class(singleLineClass)], [content])]

export const listItem = <Msg>(
  props: ListItemProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const density = props.density ?? 'balanced'
  const listStyle = props.listStyle ?? 'none'
  const hasDividers = props.hasDividers ?? false
  const isDisabled = props.isDisabled ?? false
  const isSelected = props.isSelected ?? false
  const isInteractive = props.onClick !== undefined || props.href !== undefined

  const marker = markerElement(listStyle, h)

  const labelDescription: ReadonlyArray<Html | string> = [
    ...labelOrDescription(props.label, 'text-foreground text-sm leading-5', h),
    ...(props.description === undefined
      ? []
      : labelOrDescription(
          props.description,
          'text-muted-foreground text-xs leading-5',
          h,
        )),
  ]

  const contentElement: Html =
    props.href !== undefined
      ? h.a(
          [
            h.DataAttribute('slot', 'list-item-anchor'),
            h.Href(props.href),
            ...(props.target === undefined ? [] : [h.Target(props.target)]),
            ...(props.target === '_blank'
              ? [h.Rel(`${props.rel ?? ''} noopener noreferrer`.trim())]
              : props.rel === undefined
                ? []
                : [h.Rel(props.rel)]),
            ...(isDisabled ? [h.AriaDisabled(true), h.Tabindex(-1)] : []),
            h.Class(
              cn(
                'm-0 p-0 border-none bg-transparent [font:inherit] text-inherit flex flex-col flex-1 min-w-0 text-start no-underline cursor-inherit outline-none',
                isDisabled && 'opacity-50',
              ),
            ),
          ],
          [...labelDescription],
        )
      : props.onClick !== undefined
        ? h.button(
            [
              h.Type('button'),
              h.DataAttribute('slot', 'list-item-button'),
              h.OnClick(props.onClick),
              h.Disabled(isDisabled),
              h.Class(
                cn(
                  'm-0 p-0 border-none bg-transparent [font:inherit] text-inherit flex flex-col flex-1 min-w-0 text-start cursor-inherit outline-none',
                  isDisabled && 'opacity-50',
                ),
              ),
            ],
            [...labelDescription],
          )
        : h.span(
            [
              h.DataAttribute('slot', 'list-item-content'),
              h.Class(
                cn(
                  'flex flex-col flex-1 min-w-0 text-start',
                  isDisabled && 'opacity-50',
                ),
              ),
            ],
            [...labelDescription],
          )

  return h.li(
    [
      h.DataAttribute('slot', 'list-item'),
      h.DataAttribute('density', density),
      ...(isDisabled ? [h.AriaDisabled(true)] : []),
      // listitem is not an aria-selected-permitted role — convey selection
      // via aria-current like astryx does.
      ...(isSelected ? [h.AriaCurrent('true')] : []),
      h.Class(
        cn(
          'relative box-border flex items-center gap-2 text-start rounded-md px-[var(--_item-inset-inline)]',
          densityPaddingBlock[density],
          listStyle !== 'none' && '[counter-increment:crease-list]',
          hasDividers && 'border-b rounded-none last:border-b-0',
          props.edgeCompensation === 'inline' &&
            'ms-[calc(-1*min(var(--_item-inset-inline),var(--container-padding-inline-start,0px)))] me-[calc(-1*min(var(--_item-inset-inline),var(--container-padding-inline-end,0px)))]',
          isInteractive &&
            'cursor-pointer transition-colors duration-150 aria-disabled:cursor-default [@media(hover:hover):where(&:hover:not(:disabled,[aria-disabled="true"]))]:bg-accent [&:where(:active:not(:disabled,[aria-disabled="true"]))]:bg-foreground/10',
          isSelected && 'bg-primary/10',
          isDisabled && 'cursor-default pointer-events-none',
          props.class,
        ),
      ),
      h.Style({
        '--_item-inset-inline': densityInsetInline[density],
      }),
    ],
    [
      ...(marker === null ? [] : [marker]),
      ...(props.startContent === undefined
        ? []
        : [
            h.span(
              [
                h.DataAttribute('slot', 'list-item-start'),
                h.Class('flex-[0_0_auto] flex'),
              ],
              [props.startContent],
            ),
          ]),
      contentElement,
      ...(props.endContent === undefined
        ? []
        : [
            h.span(
              [
                h.DataAttribute('slot', 'list-item-end'),
                h.Class(
                  cn(
                    'flex-[0_0_auto] flex ms-auto',
                    isDisabled && 'opacity-50',
                  ),
                ),
              ],
              [props.endContent],
            ),
          ]),
    ],
  )
}
