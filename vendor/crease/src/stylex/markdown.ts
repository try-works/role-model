import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

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
import { blockquote } from './blockquote'
import { code } from './code'
import { codeBlock } from './code-block'
import type { ComponentLayoutStyle } from './contracts'
import { heading } from './heading'
import type { HeadingLevel } from './heading'
import { list, listItem } from './list'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import {
  table,
  tableBody,
  tableCell,
  tableHead,
  tableHeader,
  tableRow,
} from './table'
import { tokens } from './tokens.stylex'

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
  layoutStyle?: ComponentLayoutStyle
}>

// ---------------------------------------------------------------------------
// Styles — astryx block spacing uses :first-child/:last-child suppression
// instead of the JS isFirst/isLast flags astryx threads through renderBlock.
// ---------------------------------------------------------------------------

const styles = stylex.create({
  root: {
    color: tokens.foreground,
    overflowWrap: 'break-word',
    width: '100%',
  },
  bold: {
    fontWeight: 600,
  },
  strikethrough: {
    color: tokens.mutedForeground,
  },
  link: {
    textDecoration: 'underline',
    color: tokens.primary,
  },
  image: {
    borderRadius: foundationTokens.radiusMd,
    maxWidth: '100%',
  },
  hr: {
    borderWidth: 0,
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  },
  blockIndent: {
    marginInline: '-0.5rem',
  },
  citationLabel: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.mutedHover,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    display: 'inline-flex',
    fontSize: '0.75rem',
    lineHeight: 1.6667,
    marginInlineStart: '0.125rem',
    verticalAlign: 'super',
    height: '1.25rem',
    maxWidth: '15em',
  },
  citationLink: {
    textDecoration: 'none',
  },
  citationNumber: {
    borderRadius: foundationTokens.radiusFull,
    paddingInline: '0.25rem',
    alignItems: 'center',
    /* PORT-NOTE: needs token 'accentMutedHover' = primary 20% — astrxy
       deepens the citation pill on hover; primarySoft (10%) is the
       nearest existing token. */
    backgroundColor: foundationTokens.primarySoft,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontSize: '0.625rem',
    fontWeight: 600,
    justifyContent: 'center',
    lineHeight: 1.6,
    marginInlineStart: '0.125rem',
    verticalAlign: 'super',
    height: '1.25rem',
    minWidth: '1.25rem',
  },
  citationIcon: {
    blockSize: '0.75rem',
    flexShrink: 0,
    inlineSize: '0.75rem',
  },
  citationTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cellCenter: {
    textAlign: 'center',
  },
  cellEnd: {
    textAlign: 'end',
  },
  cellStart: {},
  theadBorderless: {
    borderBottomWidth: 0,
  },
  rowBorderBottom: {
    borderBottomWidth: '1px',
  },
  taskMarker: {
    borderColor: tokens.input,
    borderRadius: foundationTokens.radiusBase,
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    blockSize: '1rem',
    display: 'inline-flex',
    flexShrink: 0,
    inlineSize: '1rem',
    justifyContent: 'center',
  },
  taskMarkerChecked: {
    borderColor: tokens.primary,
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
})

// ---------------------------------------------------------------------------
// Block spacing — astryx getElementSpacing, both densities
// ---------------------------------------------------------------------------

const spacing = stylex.create({
  headingMajorDefault: {
    marginBlockEnd: { default: '0.75rem', ':last-child': 0 },
    marginBlockStart: { default: '1.5rem', ':first-child': 0 },
  },
  headingMinorDefault: {
    marginBlockEnd: { default: '0.5rem', ':last-child': 0 },
    marginBlockStart: { default: '1rem', ':first-child': 0 },
  },
  paragraphDefault: {
    marginBlockEnd: { default: '0.75rem', ':last-child': 0 },
    marginBlockStart: { default: '0.75rem', ':first-child': 0 },
  },
  codeblockDefault: {
    marginBlockEnd: { default: '1rem', ':last-child': 0 },
    marginBlockStart: { default: '1rem', ':first-child': 0 },
  },
  blockquoteDefault: {
    marginBlockEnd: { default: '1rem', ':last-child': 0 },
    marginBlockStart: { default: '1rem', ':first-child': 0 },
  },
  listDefault: {
    marginBlockEnd: { default: '0.75rem', ':last-child': 0 },
    marginBlockStart: { default: '0.75rem', ':first-child': 0 },
  },
  tableDefault: {
    marginBlockEnd: { default: '1rem', ':last-child': 0 },
    marginBlockStart: { default: '1rem', ':first-child': 0 },
  },
  hrDefault: {
    marginBlockEnd: { default: '1.5rem', ':last-child': 0 },
    marginBlockStart: { default: '1.5rem', ':first-child': 0 },
  },
  imageDefault: {
    marginBlockEnd: { default: '0.75rem', ':last-child': 0 },
    marginBlockStart: { default: '0.75rem', ':first-child': 0 },
  },
  headingMajorCompact: {
    marginBlockEnd: { default: '0.5rem', ':last-child': 0 },
    marginBlockStart: { default: '1rem', ':first-child': 0 },
  },
  headingMinorCompact: {
    marginBlockEnd: { default: '0.25rem', ':last-child': 0 },
    marginBlockStart: { default: '0.75rem', ':first-child': 0 },
  },
  paragraphCompact: {
    marginBlockEnd: { default: '0.25rem', ':last-child': 0 },
    marginBlockStart: { default: '0.25rem', ':first-child': 0 },
  },
  codeblockCompact: {
    marginBlockEnd: { default: '0.5rem', ':last-child': 0 },
    marginBlockStart: { default: '0.5rem', ':first-child': 0 },
  },
  blockquoteCompact: {
    marginBlockEnd: { default: '0.5rem', ':last-child': 0 },
    marginBlockStart: { default: '0.5rem', ':first-child': 0 },
  },
  listCompact: {
    marginBlockEnd: { default: '0.25rem', ':last-child': 0 },
    marginBlockStart: { default: '0.25rem', ':first-child': 0 },
  },
  tableCompact: {
    marginBlockEnd: { default: '0.5rem', ':last-child': 0 },
    marginBlockStart: { default: '0.5rem', ':first-child': 0 },
  },
  hrCompact: {
    marginBlockEnd: { default: '0.75rem', ':last-child': 0 },
    marginBlockStart: { default: '0.75rem', ':first-child': 0 },
  },
  imageCompact: {
    marginBlockEnd: { default: '0.5rem', ':last-child': 0 },
    marginBlockStart: { default: '0.5rem', ':first-child': 0 },
  },
})

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

const spacingStyleFor = (
  kind: SpacingKind,
  density: MarkdownDensity,
): StaticStyles => {
  const compact = density === 'compact'
  switch (kind) {
    case 'headingMajor':
      return compact ? spacing.headingMajorCompact : spacing.headingMajorDefault
    case 'headingMinor':
      return compact ? spacing.headingMinorCompact : spacing.headingMinorDefault
    case 'paragraph':
      return compact ? spacing.paragraphCompact : spacing.paragraphDefault
    case 'codeblock':
      return compact ? spacing.codeblockCompact : spacing.codeblockDefault
    case 'blockquote':
      return compact ? spacing.blockquoteCompact : spacing.blockquoteDefault
    case 'list':
      return compact ? spacing.listCompact : spacing.listDefault
    case 'table':
      return compact ? spacing.tableCompact : spacing.tableDefault
    case 'hr':
      return compact ? spacing.hrCompact : spacing.hrDefault
    case 'image':
      return compact ? spacing.imageCompact : spacing.imageDefault
  }
}

const spacingForBlock = (
  node: MarkdownBlock,
  density: MarkdownDensity,
): StaticStyles => {
  switch (node.type) {
    case 'heading':
      return spacingStyleFor(
        node.depth <= 3 ? 'headingMajor' : 'headingMinor',
        density,
      )
    case 'paragraph':
      return spacingStyleFor('paragraph', density)
    case 'code':
      return spacingStyleFor('codeblock', density)
    case 'blockquote':
      return spacingStyleFor('blockquote', density)
    case 'list':
      return spacingStyleFor('list', density)
    case 'table':
      return spacingStyleFor('table', density)
    case 'thematicBreak':
      return spacingStyleFor('hr', density)
    case 'image':
      return spacingStyleFor('image', density)
  }
}

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

/** Dynamic prose/block width — h.Style because the value is runtime data. */
const widthAttrs = <Msg>(ctx: Ctx<Msg>, h: HtmlBuilder<Msg>) =>
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
  if (existing === undefined) {
    ctx.citationNumbers.set(sourceId, ctx.citationNumbers.size + 1)
  }
  const num = existing ?? ctx.citationNumbers.size
  const source = ctx.sources?.[sourceId] ?? { title: sourceId }
  const label = `Citation ${num}: ${source.title}`

  if (ctx.citationStyle === 'number') {
    return source.url === undefined
      ? h.span(
          [
            h.DataAttribute('slot', 'markdown-citation'),
            h.AriaLabel(label),
            h.Class(className(styles.citationNumber)),
          ],
          [String(num)],
        )
      : h.a(
          [
            h.DataAttribute('slot', 'markdown-citation'),
            h.AriaLabel(label),
            h.Href(source.url),
            h.Target('_blank'),
            h.Rel('noopener noreferrer'),
            h.Class(
              className(reset.link, styles.citationNumber, styles.citationLink),
            ),
          ],
          [String(num)],
        )
  }

  const children: ReadonlyArray<Html | string> = [
    ...(source.icon === undefined
      ? []
      : [
          h.img([
            h.Src(source.icon),
            h.Alt(''),
            h.Class(className(reset.media, styles.citationIcon)),
          ]),
        ]),
    h.span([h.Class(className(styles.citationTitle))], [source.title]),
  ]
  return source.url === undefined
    ? h.span(
        [
          h.DataAttribute('slot', 'markdown-citation'),
          h.AriaLabel(label),
          h.Class(className(styles.citationLabel)),
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
          h.Class(
            className(reset.link, styles.citationLabel, styles.citationLink),
          ),
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
        [h.Class(className(styles.bold))],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'emphasis':
      return h.em(
        [],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'delete':
      return h.del(
        [h.Class(className(styles.strikethrough))],
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
          h.Class(className(reset.link, styles.link)),
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
        h.Class(className(reset.media, styles.image)),
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
        className(styles.taskMarker, checked ? styles.taskMarkerChecked : null),
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
    children.map((child, index) => renderBlock(child, ctx, h)),
  )
}

const renderBlock = <Msg>(
  node: MarkdownBlock,
  ctx: Ctx<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const nodeSpacing = spacingForBlock(node, ctx.density)

  switch (node.type) {
    case 'heading': {
      const level = Math.min(
        node.depth + ctx.headingLevelStart - 1,
        6,
      ) as HeadingLevel
      const headingEl = heading(
        {
          level,
          layoutStyle:
            ctx.density === 'compact'
              ? node.depth <= 3
                ? spacing.headingMajorCompact
                : spacing.headingMinorCompact
              : node.depth <= 3
                ? spacing.headingMajorDefault
                : spacing.headingMinorDefault,
          children: node.children.map(child => renderInline(child, ctx, h)),
        },
        h,
      )
      return headingEl
    }
    case 'paragraph':
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-paragraph'),
          h.Role('paragraph'),
          h.Class(className(nodeSpacing)),
          ...widthAttrs(ctx, h),
        ],
        node.children.map(child => renderInline(child, ctx, h)),
      )
    case 'code': {
      const blockIndex = ctx.nextCodeBlockIndex()
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-codeblock'),
          h.Class(className(nodeSpacing)),
          ...widthAttrs(ctx, h),
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
    case 'blockquote': {
      const quoteEl = blockquote(
        {
          layoutStyle:
            ctx.density === 'compact'
              ? spacing.blockquoteCompact
              : spacing.blockquoteDefault,
          children: node.children.map(child => renderBlock(child, ctx, h)),
        },
        h,
      )
      return quoteEl
    }
    case 'list': {
      const isTaskList =
        node.children.length > 0 &&
        node.children.every(item => item.checked !== null)
      if (isTaskList) {
        return h.div(
          [
            h.DataAttribute('slot', 'markdown-tasklist'),
            h.Class(className(nodeSpacing)),
          ],
          [
            list(
              {
                listStyle: 'none',
                density: 'compact',
                layoutStyle: styles.blockIndent,
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
          h.Class(className(nodeSpacing)),
          ...widthAttrs(ctx, h),
        ],
        [
          list(
            {
              listStyle: node.ordered ? 'decimal' : 'disc',
              density: 'compact',
              layoutStyle: styles.blockIndent,
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
      const alignStyle = (columnIndex: number): StaticStyles =>
        node.align[columnIndex] === 'center'
          ? styles.cellCenter
          : node.align[columnIndex] === 'right'
            ? styles.cellEnd
            : styles.cellStart
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-table'),
          h.Class(className(nodeSpacing)),
          ...widthAttrs(ctx, h),
        ],
        [
          table(
            {
              children: [
                tableHeader(
                  {
                    layoutStyle: styles.theadBorderless as ComponentLayoutStyle,
                    children: [
                      tableRow(
                        {
                          layoutStyle:
                            styles.rowBorderBottom as ComponentLayoutStyle,
                          children: (headerRow?.children ?? []).map(
                            (cell, columnIndex) =>
                              tableHead(
                                {
                                  layoutStyle: alignStyle(
                                    columnIndex,
                                  ) as ComponentLayoutStyle,
                                  children: cell.children.map(child =>
                                    renderInline(child, ctx, h),
                                  ),
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
                tableBody(
                  {
                    children: rows.map(row =>
                      tableRow(
                        {
                          children: row.children.map((cell, columnIndex) =>
                            tableCell(
                              {
                                layoutStyle: alignStyle(
                                  columnIndex,
                                ) as ComponentLayoutStyle,
                                children: cell.children.map(child =>
                                  renderInline(child, ctx, h),
                                ),
                              },
                              h,
                            ),
                          ),
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
        h.Class(className(reset.rule, styles.hr, nodeSpacing)),
      ])
    case 'image': {
      const safeSrc = sanitizeMarkdownUrl(node.url)
      return h.div(
        [
          h.DataAttribute('slot', 'markdown-image'),
          h.Class(className(nodeSpacing)),
        ],
        [
          safeSrc === null
            ? h.span([], [`[${node.alt}]`])
            : h.img([
                h.Src(safeSrc),
                h.Alt(node.alt),
                h.Class(className(reset.media, styles.image)),
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
  const children = blocks.map(block => renderBlock(block, ctx, h))
  const attributes = [
    h.DataAttribute('slot', 'markdown'),
    h.Class(className(styles.root, props.layoutStyle)),
  ]
  return props.display === 'inline'
    ? h.span(attributes, children)
    : h.div(attributes, children)
}
