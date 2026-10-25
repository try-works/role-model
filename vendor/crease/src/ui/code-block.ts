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
import { cn } from '@/lib/utils'
import * as Button from '@/ui/button'

/* Ported from Meta Astryx CodeBlock (packages/core/src/CodeBlock/CodeBlock.tsx)
   — examples and visual spec adapted to Crease UI tokens. Syntax highlighting
   uses the span renderer (astryx's Safari/no-Highlight-API fallback path);
   `highlightMode` and `syntaxTheme` are not ported — see PORT-NOTEs below. */

export { init, Model, Message, update }
export type { SyntaxToken, TokenLine }
export { codeLines, tokenize, flatTokensToLines }

export type CodeBlockSize = 'sm' | 'md'

export type CodeBlockContainer = 'card' | 'section'

export type CustomTokenizer = (
  code: string,
  language: string,
) => ReadonlyArray<{ type: string; start: number; end: number }>

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
  class?: string
}>

/* astryx syntax token types → Crease UI chart/semantic colors. astryx uses a
   dedicated 11-hue syntax palette (accent/green/gray/orange/blue/purple/…);
   Crease UI's nearest tokens keep the same family relationships. */
const tokenColorClass: Record<string, string> = {
  keyword: 'text-chart-3',
  string: 'text-chart-2',
  comment: 'text-muted-foreground',
  number: 'text-chart-4',
  constant: 'text-chart-4',
  function: 'text-chart-3',
  type: 'text-chart-5',
  variable: 'text-foreground',
  operator: 'text-chart-2',
  property: 'text-chart-2',
  attribute: 'text-chart-2',
  tag: 'text-destructive',
  punctuation: 'text-muted-foreground',
}

const buildSpanLine = <Msg>(
  lineText: string,
  tokens: ReadonlyArray<SyntaxToken>,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> => {
  if (tokens.length === 0) {
    return [lineText === '' ? '​' : lineText]
  }
  const parts: Array<Html | string> = []
  let cursor = 0
  for (const token of tokens) {
    if (token.start > cursor) {
      parts.push(lineText.slice(cursor, token.start))
    }
    const end = Math.min(token.end, lineText.length)
    parts.push(
      h.span(
        [
          h.DataAttribute('slot', 'code-token'),
          h.DataAttribute('type', token.type),
          h.Class(tokenColorClass[token.type] ?? 'text-foreground'),
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

  const copyButton = hasCopyButton
    ? Button.button(
        {
          variant: 'ghost',
          size: 'icon-xs',
          ariaLabel: isCopied ? 'Copied' : 'Copy code',
          onClick: props.toParentMessage(
            Message.ClickedCopyCode({ code: props.code }),
          ),
          class: cn(
            'text-muted-foreground',
            !showHeader && 'absolute top-2 end-2',
          ),
          children: [
            isCopied
              ? Icon.icon<Msg>('check', {}, h)
              : Icon.icon<Msg>('copy', {}, h),
          ],
        },
        h,
      )
    : null

  const header = showHeader
    ? h.div(
        [
          h.DataAttribute('slot', 'code-block-header'),
          h.Class(
            cn(
              'flex items-center justify-between px-4 py-2 bg-muted sticky top-0 z-10',
              hasLineNumbers ? 'border-b' : '',
            ),
          ),
        ],
        [
          h.div(
            [
              h.Class(
                cn(
                  'flex items-center flex-1 min-w-0 p-0 border-none bg-transparent text-start [font:inherit] outline-none',
                  canCollapse
                    ? 'cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-[3px]'
                    : '',
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
                  h.Class(
                    'flex items-center font-mono text-xs leading-5 font-medium text-muted-foreground',
                  ),
                ],
                [
                  ...(canCollapse
                    ? [
                        h.span(
                          [
                            h.Class(
                              'inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 me-1 overflow-hidden text-muted-foreground',
                            ),
                          ],
                          [
                            Icon.icon<Msg>(
                              'chevron-right',
                              {
                                class: cn(
                                  'transition-transform duration-150',
                                  !isCollapsed && 'rotate-90',
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
      h.Class('overflow-auto'),
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
            cn('flex min-w-fit', showHeader && !hasLineNumbers && '-mt-2'),
          ),
        ],
        [
          h.code(
            [
              h.DataAttribute('slot', 'code-block-code'),
              h.Class(
                cn(
                  'block flex-1 py-3 px-4 m-0 font-mono text-foreground [tab-size:2]',
                  size === 'sm' ? 'text-xs' : 'text-sm',
                  isWrapped
                    ? 'whitespace-pre-wrap break-all'
                    : 'whitespace-pre',
                  hasLineNumbers &&
                    'relative after:absolute after:inset-y-0 after:w-px after:bg-border after:start-[calc(1rem+var(--codeblock-gutter-width)+0.75rem)] after:pointer-events-none',
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
                    cn(
                      'leading-[1.4286]',
                      hasLineNumbers &&
                        'grid grid-cols-[var(--codeblock-gutter-width)_1fr] gap-x-[calc(0.75rem+1px+1rem)] before:content-[attr(data-line)] before:col-start-1 before:self-start before:text-end before:text-muted-foreground before:select-none before:font-mono',
                      highlightSet?.has(index + 1) === true &&
                        'bg-primary/10 -mx-4 px-4',
                    ),
                  ),
                  ...(hasLineNumbers
                    ? [h.DataAttribute('line', String(index + 1))]
                    : []),
                ],
                [
                  h.span(
                    [h.Class('min-w-0')],
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
        cn(
          'relative isolate flex flex-col m-0 overflow-hidden',
          container === 'card'
            ? 'rounded-md border bg-muted'
            : 'rounded-none border-0 bg-transparent',
          props.class,
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
                cn(
                  'grid transition-[grid-template-rows] duration-300',
                  isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
                ),
              ),
              h.Inert(isCollapsed),
            ],
            [h.div([h.Class('overflow-hidden min-h-0')], [codeBody])],
          )
        : codeBody,
      ...(!showHeader && copyButton !== null ? [copyButton] : []),
    ],
  )
}
