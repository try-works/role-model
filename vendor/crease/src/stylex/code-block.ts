import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import {
  codeLines,
  flatTokensToLines,
  init,
  Model,
  Message,
  tokenize,
  type SyntaxToken,
  type TokenLine,
  update,
} from '@/lib/code-block'
import * as Button from './button'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { complexTokens } from './complex-tokens.stylex'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx CodeBlock (packages/core/src/CodeBlock/CodeBlock.tsx)
   — examples and visual spec adapted to Crease UI tokens. Syntax highlighting
   uses the span renderer (astryx's Safari/no-Highlight-API fallback path);
   `highlightMode` and `syntaxTheme` are not ported — see PORT-NOTEs below. */

export { init, Model, Message, update }
export type { SyntaxToken, TokenLine }
export { codeLines, tokenize, flatTokensToLines }

export type CustomTokenizer = (
  code: string,
  language: string,
) => ReadonlyArray<{ type: string; start: number; end: number }>

export type CodeBlockSize = 'sm' | 'md'

export type CodeBlockContainer = 'card' | 'section'

/* astryx syntax token types → Crease UI chart/semantic colors, mirroring
   tokenColorClass in src/ui/code-block.ts (text-chart-N utilities). */
const tokenColorStyles = stylex.create({
  keyword: { color: complexTokens.chart3 },
  string: { color: complexTokens.chart2 },
  comment: { color: tokens.mutedForeground },
  number: { color: complexTokens.chart4 },
  constant: { color: complexTokens.chart4 },
  function: { color: complexTokens.chart3 },
  type: { color: complexTokens.chart5 },
  variable: { color: tokens.foreground },
  operator: { color: complexTokens.chart2 },
  property: { color: complexTokens.chart2 },
  attribute: { color: complexTokens.chart2 },
  tag: { color: tokens.destructive },
  punctuation: { color: tokens.mutedForeground },
})

const tokenStyleFor = (type: string): StaticStyles =>
  type in tokenColorStyles
    ? tokenColorStyles[type as keyof typeof tokenColorStyles]
    : tokenColorStyles.variable

const styles = stylex.create({
  root: {
    margin: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'inherit',
    isolation: 'isolate',
    lineHeight: 'inherit',
    position: 'relative',
  },
  card: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: tokens.muted,
  },
  section: {
    borderRadius: '0px',
    borderStyle: 'none',
    borderWidth: '0px',
    backgroundColor: 'transparent',
  },
  headerRow: {
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    backgroundColor: tokens.muted,
    display: 'flex',
    justifyContent: 'space-between',
    position: 'sticky',
    zIndex: 10,
    top: 0,
  },
  headerWithDivider: {
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  header: {
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'inherit',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    outlineStyle: 'none',
    textAlign: 'start',
    minWidth: 0,
  },
  headerCollapsible: {
    cursor: {
      default: interactionTokens.cursorAction,
      ':is(:disabled,[aria-disabled="true"])': interactionTokens.cursorDefault,
    },
    outlineColor: {
      default: null,
      ':focus-visible': tokens.ring,
    },
    outlineOffset: {
      default: null,
      ':focus-visible': '3px',
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: '0px',
      ':focus-visible': '2px',
    },
    userSelect: 'none',
  },
  headerTitle: {
    margin: 0,
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.6667,
  },
  collapseChevron: {
    overflow: 'hidden',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    marginInlineEnd: '0.25rem',
    height: '14px',
    width: '14px',
  },
  chevronIcon: {
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  chevronExpanded: {
    transform: 'rotate(90deg)',
  },
  scrollContainer: {
    overflowX: 'auto',
    overflowY: 'auto',
  },
  codeWrapper: {
    display: 'flex',
    minWidth: 'fit-content',
  },
  codeWrapperCompact: {
    marginBlockStart: '-0.5rem',
  },
  collapseGrid: {
    display: 'grid',
    gridTemplateRows: '1fr',
    transitionDuration: interactionTokens.motionSlow,
    transitionProperty: 'grid-template-rows',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  collapseGridCollapsed: {
    gridTemplateRows: '0fr',
  },
  collapseInner: {
    overflow: 'hidden',
    minHeight: 0,
  },
  code: {
    margin: 0,
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
    color: tokens.foreground,
    display: 'block',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    tabSize: 2,
    whiteSpace: 'pre',
    wordBreak: 'normal',
  },
  codeSm: {
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  codeMd: {
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  codeWrapped: {
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  codeNumbered: {
    position: 'relative',
    '::after': {
      insetBlock: 0,
      backgroundColor: tokens.border,
      content: '""',
      insetInlineStart: 'calc(1rem + var(--codeblock-gutter-width) + 0.75rem)',
      pointerEvents: 'none',
      position: 'absolute',
      width: '1px',
    },
  },
  line: {
    lineHeight: 1.4286,
  },
  lineNumbered: {
    columnGap: 'calc(0.75rem + 1px + 1rem)',
    display: 'grid',
    gridTemplateColumns: 'var(--codeblock-gutter-width) 1fr',
    '::before': {
      alignSelf: 'start',
      color: tokens.mutedForeground,
      content: 'attr(data-line)',
      fontFamily:
        'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
      gridColumnStart: '1',
      textAlign: 'end',
      userSelect: 'none',
    },
  },
  lineHighlighted: {
    marginInline: '-1rem',
    paddingInline: '1rem',
    /* PORT-NOTE: astrxy's accent-muted (#0082FB33, blue 20%) has no Crease
       token; primarySoft (primary 10% mix) is the nearest "accented row"
       tint. */
    backgroundColor: foundationTokens.primarySoft,
  },
  lineContent: {
    minWidth: 0,
  },
  copyButtonFloating: {
    insetInlineEnd: '0.5rem',
    position: 'absolute',
    top: '0.5rem',
  },
  copyButtonInk: { color: tokens.mutedForeground },
})

const buildSpanLine = <Msg>(
  lineText: string,
  tokensList: ReadonlyArray<SyntaxToken>,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> => {
  if (tokensList.length === 0) {
    return [lineText === '' ? '​' : lineText]
  }
  const parts: Array<Html | string> = []
  let cursor = 0
  for (const token of tokensList) {
    if (token.start > cursor) {
      parts.push(lineText.slice(cursor, token.start))
    }
    const end = Math.min(token.end, lineText.length)
    parts.push(
      h.span(
        [
          h.DataAttribute('slot', 'code-token'),
          h.DataAttribute('type', token.type),
          h.Class(className(tokenStyleFor(token.type))),
        ],
        [lineText.slice(token.start, end)],
      ),
    )
    cursor = end
  }
  if (cursor < lineText.length) {
    parts.push(lineText.slice(cursor))
  }
  return parts
}

export type CodeBlockProps<Msg> = Readonly<{
  /** The CodeBlock submodel state (see `init`/`update` in `@/lib/code-block`). */
  model: Model
  toParentMessage: (message: Message) => Msg
  code: string
  language?: string
  title?: string
  hasLanguageLabel?: boolean
  hasLineNumbers?: boolean
  highlightLines?: ReadonlyArray<number>
  hasCopyButton?: boolean
  isWrapped?: boolean
  maxHeight?: number | string
  isCollapsible?: boolean
  collapsibleThreshold?: number
  size?: CodeBlockSize
  width?: string
  container?: CodeBlockContainer
  tokenizer?: CustomTokenizer
  layoutStyle?: ComponentLayoutStyle
}>

export const codeBlock = <Msg>(
  props: CodeBlockProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const language = props.language ?? 'plaintext'
  const hasLanguageLabel = props.hasLanguageLabel ?? true
  const hasLineNumbers = props.hasLineNumbers ?? false
  const hasCopyButton = props.hasCopyButton ?? true
  const isWrapped = props.isWrapped ?? false
  const isCollapsible = props.isCollapsible ?? false
  const collapsibleThreshold = props.collapsibleThreshold ?? 10
  const size = props.size ?? 'md'
  const container = props.container ?? 'card'
  const widthProp = props.width ?? 'fit-content'

  const lines = codeLines(props.code)
  const tokenLines: ReadonlyArray<TokenLine> =
    props.tokenizer === undefined
      ? tokenize(props.code, language)
      : flatTokensToLines(props.tokenizer(props.code, language), props.code)
  const highlightSet =
    props.highlightLines === undefined ? null : new Set(props.highlightLines)
  const isCopied = props.model.copiedCode === props.code
  const isCollapsed = props.model.isCollapsed
  const canCollapse = isCollapsible && lines.length >= collapsibleThreshold
  const maxLineDigits = String(lines.length).length
  const languageLabel =
    hasLanguageLabel && language !== 'plaintext' ? language : null
  const showHeader = props.title !== undefined || languageLabel !== null
  const regionId = `codeblock-${props.title ?? languageLabel ?? 'region'}-${lines.length}`

  const copyButtonEl = hasCopyButton
    ? Button.button(
        {
          variant: 'ghost',
          size: 'icon-xs',
          ariaLabel: isCopied ? 'Copied' : 'Copy code',
          onClick: props.toParentMessage(
            Message.ClickedCopyCode({ code: props.code }),
          ),
          layoutStyle: styles.copyButtonInk as ComponentLayoutStyle,
          children: [
            isCopied
              ? Icon.icon<Msg>('check', {}, h)
              : Icon.icon<Msg>('copy', {}, h),
          ],
        },
        h,
      )
    : null
  const copyButton =
    copyButtonEl === null || showHeader
      ? copyButtonEl
      : h.span([h.Class(className(styles.copyButtonFloating))], [copyButtonEl])

  const header = showHeader
    ? h.div(
        [
          h.DataAttribute('slot', 'code-block-header'),
          h.Class(
            className(
              styles.headerRow,
              hasLineNumbers ? styles.headerWithDivider : null,
            ),
          ),
        ],
        [
          h.div(
            [
              h.Class(
                className(
                  styles.header,
                  canCollapse ? styles.headerCollapsible : null,
                ),
              ),
              ...(canCollapse
                ? [
                    h.Role('button'),
                    h.Tabindex(0),
                    h.AriaExpanded(!isCollapsed),
                    h.AriaControls(regionId),
                    h.OnClick(props.toParentMessage(Message.ToggledCollapse())),
                    h.OnKeyDownSelfPreventDefault(key =>
                      key === 'Enter' || key === ' '
                        ? Option.some(
                            props.toParentMessage(Message.ToggledCollapse()),
                          )
                        : Option.none(),
                    ),
                  ]
                : []),
            ],
            [
              h.span(
                [
                  h.DataAttribute('slot', 'code-block-title'),
                  h.Class(className(styles.headerTitle)),
                ],
                [
                  ...(canCollapse
                    ? [
                        h.span(
                          [h.Class(className(styles.collapseChevron))],
                          [
                            Icon.icon<Msg>(
                              'chevron-right',
                              {
                                class: className(
                                  styles.chevronIcon,
                                  !isCollapsed ? styles.chevronExpanded : null,
                                ),
                              },
                              h,
                            ),
                          ],
                        ),
                      ]
                    : []),
                  ...(props.title === undefined ? [] : [props.title]),
                  props.title !== undefined && languageLabel !== null
                    ? ' — '
                    : '',
                  ...(languageLabel === null ? [] : [languageLabel]),
                ],
              ),
            ],
          ),
          ...(copyButton === null ? [] : [copyButton]),
        ],
      )
    : null

  const codeBody = h.div(
    [
      h.DataAttribute('slot', 'code-block-scroll-container'),
      h.Tabindex(0),
      h.Role('group'),
      h.AriaLabel(languageLabel ?? 'Code'),
      h.Class(className(styles.scrollContainer)),
      ...(props.maxHeight === undefined
        ? []
        : [
            h.Style({
              maxHeight:
                typeof props.maxHeight === 'number'
                  ? `${props.maxHeight}px`
                  : props.maxHeight,
            }),
          ]),
    ],
    [
      h.div(
        [
          h.Class(
            className(
              styles.codeWrapper,
              showHeader && !hasLineNumbers ? styles.codeWrapperCompact : null,
            ),
          ),
        ],
        [
          h.code(
            [
              h.DataAttribute('slot', 'code-block-code'),
              h.Class(
                className(
                  reset.code,
                  styles.code,
                  size === 'sm' ? styles.codeSm : styles.codeMd,
                  isWrapped ? styles.codeWrapped : null,
                  hasLineNumbers ? styles.codeNumbered : null,
                ),
              ),
              ...(hasLineNumbers
                ? [
                    h.Style({
                      '--codeblock-gutter-width': `${maxLineDigits}ch`,
                    }),
                  ]
                : []),
            ],
            lines.map((line, index) =>
              h.div(
                [
                  h.DataAttribute('slot', 'code-block-line'),
                  h.Class(
                    className(
                      styles.line,
                      hasLineNumbers ? styles.lineNumbered : null,
                      highlightSet?.has(index + 1) === true
                        ? styles.lineHighlighted
                        : null,
                    ),
                  ),
                  ...(hasLineNumbers
                    ? [h.DataAttribute('line', String(index + 1))]
                    : []),
                ],
                [
                  h.span(
                    [h.Class(className(styles.lineContent))],
                    [...buildSpanLine(line, tokenLines[index] ?? [], h)],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

  return h.pre(
    [
      h.DataAttribute('slot', 'code-block'),
      h.DataAttribute('size', size),
      h.DataAttribute('container', container),
      h.Class(
        className(
          reset.text,
          styles.root,
          container === 'card' ? styles.card : styles.section,
          props.layoutStyle,
        ),
      ),
      h.Style(
        widthProp === 'fit-content'
          ? {
              width: 'fit-content',
              minWidth: 'min(100%, 400px)',
              maxWidth: '100%',
            }
          : { width: widthProp },
      ),
    ],
    [
      ...(header === null ? [] : [header]),
      canCollapse
        ? h.div(
            [
              h.Id(regionId),
              h.Class(
                className(
                  styles.collapseGrid,
                  isCollapsed ? styles.collapseGridCollapsed : null,
                ),
              ),
              h.Inert(isCollapsed),
            ],
            [h.div([h.Class(className(styles.collapseInner))], [codeBody])],
          )
        : codeBody,
      ...(!showHeader && copyButton !== null ? [copyButton] : []),
    ],
  )
}
