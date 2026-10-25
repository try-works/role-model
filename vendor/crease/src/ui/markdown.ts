import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'
import * as Icon from '@/lib/icon'
import {
  Message,
  codeBlockModel,
  parseMarkdownBlocks,
  sanitizeMarkdownUrl,
} from '@/lib/markdown'
import type {
  MarkdownBlock,
  MarkdownInline,
  MarkdownSource,
  Model,
} from '@/lib/markdown'
import { blockquote } from '@/ui/blockquote'
import { code } from '@/ui/code'
import { codeBlock } from '@/ui/code-block'
import { heading } from '@/ui/heading'
import type { HeadingLevel } from '@/ui/heading'
import { list, listItem } from '@/ui/list'
import {
  table,
  tableBody,
  tableCell,
  tableHead,
  tableHeader,
  tableRow,
} from '@/ui/table'

export {
  init,
  Message,
  Model,
  update,
  parseMarkdownBlocks,
  parseMarkdownInline,
  sanitizeMarkdownUrl,
} from '@/lib/markdown'
export type {
  MarkdownBlock,
  MarkdownInline,
  MarkdownListItem,
  MarkdownSource,
  MarkdownTableAlign,
  MarkdownTableCell,
  MarkdownTableRow,
} from '@/lib/markdown'

/* Ported from Meta Astryx Markdown (packages/core/src/Markdown/Markdown.tsx) —
   examples and visual spec adapted to Crease UI tokens. Supported subset:
   headings, paragraphs, fenced code (CodeBlock), blockquotes,
   ordered/unordered/task lists, GFM tables, thematic breaks, images, and
   inline strong/em/del/inlineCode/link/image/[id] citations/【id】. Not ported:
   streaming fade-in, plugins/extensions/component overrides, math rendering,
   autolink, onLinkClick, nested list indentation. Task lists render a
   read-only checkbox visual (astrxy CheckboxList isReadOnly equivalent). */

export type MarkdownDisplay = 'block' | 'inline'
export type MarkdownDensity = 'default' | 'compact'
export type MarkdownCitationStyle = 'label' | 'number'
export type MarkdownContentAlign = 'start' | 'center'

export type MarkdownProps<Msg> = Readonly<{
  /** Markdown submodel state (owns the per-fence CodeBlock models). */
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Markdown source string. */
  children: string
  display?: MarkdownDisplay
  density?: MarkdownDensity
  /** The HTML level markdown `#` maps to (clamped at h6). */
  headingLevelStart?: HeadingLevel
  /** Citation sources keyed by id; `[id]`/【id】 become chips. */
  sources?: Record<string, MarkdownSource>
  citationStyle?: MarkdownCitationStyle
  /** Max width for prose content (headings, paragraphs, lists, quotes). */
  contentWidth?: number | string
  contentAlign?: MarkdownContentAlign
  class?: string
}>

// ---------------------------------------------------------------------------
// Block spacing — astryx getElementSpacing, both densities
// ---------------------------------------------------------------------------

type SpacingKind =
  | 'headingMajor'
  | 'headingMinor'
  | 'paragraph'
  | 'codeblock'
  | 'blockquote'
  | 'list'
  | 'table'
  | 'hr'
  | 'image'

const spacingClass: Record<MarkdownDensity, Record<SpacingKind, string>> = {
  default: {
    headingMajor: 'mt-6 mb-3',
    headingMinor: 'mt-4 mb-2',
    paragraph: 'my-3',
    codeblock: 'my-4',
    blockquote: 'my-4',
    list: 'my-3',
    table: 'my-4',
    hr: 'my-6',
    image: 'my-3',
  },
  compact: {
    headingMajor: 'mt-4 mb-2',
    headingMinor: 'mt-3 mb-1',
    paragraph: 'my-1',
    codeblock: 'my-2',
    blockquote: 'my-2',
    list: 'my-1',
    table: 'my-2',
    hr: 'my-3',
    image: 'my-2',
  },
}

const blockSpacingClass = (
  node: MarkdownBlock,
  density: MarkdownDensity,
): string => {
  const table = spacingClass[density]
  switch (node.type) {
    case 'heading':
      return node.depth <= 3 ? table.headingMajor : table.headingMinor
    case 'paragraph':
      return table.paragraph
    case 'code':
      return table.codeblock
    case 'blockquote':
      return table.blockquote
    case 'list':
      return table.list
    case 'table':
      return table.table
    case 'thematicBreak':
      return table.hr
    case 'image':
      return table.image
  }
}

const withMargins = (
  spacing: string,
  isFirst: boolean,
  isLast: boolean,
  extra?: string,
): string => cn(spacing, isFirst && 'mt-0', isLast && 'mb-0', extra)

// ---------------------------------------------------------------------------
// Render context
// ---------------------------------------------------------------------------

type Ctx<Msg> = Readonly<{
  density: MarkdownDensity
  headingLevelStart: HeadingLevel
  sources: Record<string, MarkdownSource> | undefined
  citationStyle: MarkdownCitationStyle
  citationNumbers: Map<string, number>
  contentWidth: number | string | undefined
  contentAlign: MarkdownContentAlign
  model: Model
  toParentMessage: (message: Message) => Msg
  nextCodeBlockIndex: () => number
}>

const proseWidthAttrs = <Msg>(ctx: Ctx<Msg>, h: HtmlBuilder<Msg>) =>
  ctx.contentWidth === undefined
    ? []
    : [
        h.Style({
          maxWidth:
            typeof ctx.contentWidth === 'number'
              ? `${ctx.contentWidth}px`
              : ctx.contentWidth,
          ...(ctx.contentAlign === 'center' ? { marginInline: 'auto' } : {}),
        }),
      ]

// ---------------------------------------------------------------------------
// Inline renderer
// ---------------------------------------------------------------------------

const renderCitation = <Msg>(
  sourceId: string,
  ctx: Ctx<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const existing = ctx.citationNumbers.get(sourceId)
  const num =
    existing ??
    (ctx.citationNumbers.set(sourceId, ctx.citationNumbers.size + 1),
    ctx.citationNumbers.size)
  const source = ctx.sources?.[sourceId] ?? { title: sourceId }
  const label = `Citation ${num}: ${source.title}`

  if (ctx.citationStyle === 'number') {
    return h.a(
      source.url === undefined
        ? [
            h.DataAttribute('slot', 'markdown-citation'),
            h.AriaLabel(label),
            h.Class(
              'inline-flex items-center justify-center align-super min-w-5 h-5 px-1 ms-0.5 rounded-full bg-primary/10 text-[0.625rem] leading-4 font-semibold text-muted-foreground',
            ),
          ]
        : [
            h.DataAttribute('slot', 'markdown-citation'),
            h.AriaLabel(label),
            h.Href(source.url),
            h.Target('_blank'),
            h.Rel('noopener noreferrer'),
            h.Class(
              'inline-flex items-center justify-center align-super min-w-5 h-5 px-1 ms-0.5 rounded-full bg-primary/10 text-[0.625rem] leading-4 font-semibold text-muted-foreground no-underline hover:bg-primary/20',
            ),
          ],
      [String(num)],
    )
  }

  const children: ReadonlyArray<Html | string> = [
    ...(source.icon === undefined
      ? []
      : [h.img([h.Src(source.icon), h.Alt(''), h.Class('size-3 shrink-0')])]),
    h.span([h.Class('truncate')], [source.title]),
  ]
  const chipClass =
    'inline-flex items-center gap-1 align-super h-5 px-2 ms-0.5 max-w-[15em] rounded-md border border-border text-xs leading-5 text-muted-foreground hover:bg-accent hover:text-foreground'
  return source.url === undefined
    ? h.span(
        [
          h.DataAttribute('slot', 'markdown-citation'),
          h.AriaLabel(label),
          h.Class(chipClass),
        ],
        children,
      )
    : h.a(
        [
          h.DataAttribute('slot', 'markdown-citation'),
          h.AriaLabel(label),
          h.Href(source.url),
          h.Target('_blank'),
          h.Rel('noopener noreferrer'),
          h.Class(cn(chipClass, 'no-underline')),
        ],
        children,
      )
}

const renderInline = <Msg>(
  node: MarkdownInline,
  ctx: Ctx<Msg>,
  h: HtmlBuilder<Msg>,
): Html | string => {
  switch (node.type) {
    case 'text':
      return node.value
    case 'strong':
      return h.strong(
        [h.Class('font-semibold')],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'emphasis':
      return h.em(
        [],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'delete':
      return h.del(
        [h.Class('text-muted-foreground line-through')],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'inlineCode':
      return code({ children: [node.value], size: 'inherit' }, h)
    case 'link': {
      const safeHref = sanitizeMarkdownUrl(node.url)
      const children = node.children.map(child => renderInline(child, ctx, h))
      if (safeHref === null) {
        return h.span([], children)
      }
      const isExternal =
        safeHref.startsWith('https://') || safeHref.startsWith('http://')
      return h.a(
        [
          h.DataAttribute('slot', 'markdown-link'),
          h.Href(safeHref),
          h.Class('text-primary underline'),
          ...(isExternal
            ? [h.Target('_blank'), h.Rel('noopener noreferrer')]
            : []),
        ],
        children,
      )
    }
    case 'image': {
      const safeSrc = sanitizeMarkdownUrl(node.url)
      if (safeSrc === null) {
        return h.span([], [`[${node.alt}]`])
      }
      return h.img([
        h.Src(safeSrc),
        h.Alt(node.alt),
        h.Class('max-w-full rounded-md'),
      ])
    }
    case 'citation':
      if (
        ctx.sources === undefined ||
        ctx.sources[node.sourceId] === undefined
      ) {
        return h.span([], [`[${node.sourceId}]`])
      }
      return renderCitation(node.sourceId, ctx, h)
    case 'break':
      return h.br([])
  }
}

// ---------------------------------------------------------------------------
// Block renderer
// ---------------------------------------------------------------------------

const taskMarker = <Msg>(checked: boolean, h: HtmlBuilder<Msg>): Html =>
  h.span(
    [
      h.AriaHidden(true),
      h.Class(
        cn(
          'size-4 shrink-0 rounded-[4px] border border-input inline-flex items-center justify-center',
          checked && 'bg-primary border-primary text-primary-foreground',
        ),
      ),
    ],
    checked ? [Icon.check<Msg>({ class: 'size-3.5' }, h)] : [],
  )

const renderListItemLabel = <Msg>(
  children: ReadonlyArray<MarkdownBlock>,
  ctx: Ctx<Msg>,
  h: HtmlBuilder<Msg>,
): Html | string => {
  const first = children[0]
  if (
    children.length === 1 &&
    first !== undefined &&
    first.type === 'paragraph'
  ) {
    return h.span(
      [],
      first.children.map(child => renderInline(child, ctx, h)),
    )
  }
  return h.span(
    [],
    children.map((child, index) =>
      renderBlock(child, index, children.length, ctx, h),
    ),
  )
}

const renderBlock = <Msg>(
  node: MarkdownBlock,
  index: number,
  count: number,
  ctx: Ctx<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const isFirst = index === 0
  const isLast = index === count - 1
  const spacing = blockSpacingClass(node, ctx.density)

  switch (node.type) {
    case 'heading': {
      const level = Math.min(
        node.depth + ctx.headingLevelStart - 1,
        6,
      ) as HeadingLevel
      return heading(
        {
          level,
          class: withMargins(spacing, isFirst, isLast),
          children: node.children.map(child => renderInline(child, ctx, h)),
        },
        h,
      )
    }
    case 'paragraph':
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-paragraph'),
          h.Role('paragraph'),
          h.Class(withMargins(spacing, isFirst, isLast)),
          ...proseWidthAttrs(ctx, h),
        ],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'code': {
      const blockIndex = ctx.nextCodeBlockIndex()
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-codeblock'),
          h.Class(withMargins(spacing, isFirst, isLast)),
          ...proseWidthAttrs(ctx, h),
        ],
        [
          codeBlock(
            {
              model: codeBlockModel(ctx.model, blockIndex),
              toParentMessage: message =>
                ctx.toParentMessage(
                  Message.GotMarkdownCodeBlockMessage({
                    blockIndex,
                    message,
                  }),
                ),
              code: node.value,
              language: node.lang ?? 'plaintext',
              isCollapsible: true,
            },
            h,
          ),
        ],
      )
    }
    case 'blockquote':
      return blockquote(
        {
          class: withMargins(spacing, isFirst, isLast),
          children: node.children.map((child, childIndex) =>
            renderBlock(child, childIndex, node.children.length, ctx, h),
          ),
        },
        h,
      )
    case 'list': {
      const isTaskList =
        node.children.length > 0 &&
        node.children.every(item => item.checked !== null)
      if (isTaskList) {
        return h.div(
          [
            h.DataAttribute('slot', 'markdown-tasklist'),
            h.Class(withMargins(spacing, isFirst, isLast)),
          ],
          [
            list(
              {
                listStyle: 'none',
                density: 'compact',
                class: '-mx-2',
                children: node.children.map(item =>
                  listItem(
                    {
                      density: 'compact',
                      listStyle: 'none',
                      startContent: taskMarker(item.checked === true, h),
                      label: renderListItemLabel(item.children, ctx, h),
                    },
                    h,
                  ),
                ),
              },
              h,
            ),
          ],
        )
      }
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-list'),
          h.Class(withMargins(spacing, isFirst, isLast)),
          ...proseWidthAttrs(ctx, h),
        ],
        [
          list(
            {
              listStyle: node.ordered ? 'decimal' : 'disc',
              density: 'compact',
              class: '-mx-2',
              ...(node.ordered && node.start !== 1
                ? { start: node.start }
                : {}),
              children: node.children.map(item =>
                listItem(
                  {
                    density: 'compact',
                    listStyle: node.ordered ? 'decimal' : 'disc',
                    label: renderListItemLabel(item.children, ctx, h),
                  },
                  h,
                ),
              ),
            },
            h,
          ),
        ],
      )
    }
    case 'table': {
      const [headerRow, ...rows] = node.children
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-table'),
          h.Class(withMargins(spacing, isFirst, isLast)),
          ...proseWidthAttrs(ctx, h),
        ],
        [
          table(
            {
              children: [
                tableHeader(
                  {
                    children: [
                      tableRow(
                        {
                          children: (headerRow?.children ?? []).map(
                            (cell, columnIndex) => {
                              const align = node.align[columnIndex]
                              return tableHead(
                                {
                                  ...(align === 'center'
                                    ? { class: 'text-center' }
                                    : align === 'right'
                                      ? { class: 'text-end' }
                                      : {}),
                                  children: cell.children.map(child =>
                                    renderInline(child, ctx, h),
                                  ),
                                },
                                h,
                              )
                            },
                          ),
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                tableBody(
                  {
                    children: rows.map(row =>
                      tableRow(
                        {
                          children: row.children.map((cell, columnIndex) => {
                            const align = node.align[columnIndex]
                            return tableCell(
                              {
                                ...(align === 'center'
                                  ? { class: 'text-center' }
                                  : align === 'right'
                                    ? { class: 'text-end' }
                                    : {}),
                                children: cell.children.map(child =>
                                  renderInline(child, ctx, h),
                                ),
                              },
                              h,
                            )
                          }),
                        },
                        h,
                      ),
                    ),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    }
    case 'thematicBreak':
      return h.hr([
        h.DataAttribute('slot', 'markdown-hr'),
        h.Class(
          withMargins(
            cn('border-0 border-t border-border', spacing),
            isFirst,
            isLast,
          ),
        ),
      ])
    case 'image': {
      const safeSrc = sanitizeMarkdownUrl(node.url)
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-image'),
          h.Class(withMargins(spacing, isFirst, isLast)),
        ],
        [
          safeSrc === null
            ? h.span([], [`[${node.alt}]`])
            : h.img([
                h.Src(safeSrc),
                h.Alt(node.alt),
                h.Class('max-w-full rounded-md'),
              ]),
        ],
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const markdown = <Msg>(
  props: MarkdownProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const density = props.density ?? 'default'
  const sourceIds =
    props.sources === undefined
      ? undefined
      : new Set(Object.keys(props.sources))
  const blocks = parseMarkdownBlocks(props.children, sourceIds)
  let codeBlockIndex = 0
  const ctx: Ctx<Msg> = {
    density,
    headingLevelStart: props.headingLevelStart ?? 1,
    sources: props.sources,
    citationStyle: props.citationStyle ?? 'label',
    citationNumbers: new Map(),
    contentWidth: props.contentWidth,
    contentAlign: props.contentAlign ?? 'start',
    model: props.model,
    toParentMessage: props.toParentMessage,
    nextCodeBlockIndex: () => {
      const index = codeBlockIndex
      codeBlockIndex++
      return index
    },
  }
  const children = blocks.map((block, index) =>
    renderBlock(block, index, blocks.length, ctx, h),
  )
  const attributes = [
    h.DataAttribute('slot', 'markdown'),
    h.Class(cn('w-full break-words text-foreground', props.class)),
  ]
  return props.display === 'inline'
    ? h.span(attributes, children)
    : h.div(attributes, children)
}
