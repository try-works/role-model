import { Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import type { Update } from 'foldkit'

import * as CodeBlock from '@/lib/code-block'

/* Ported from Meta Astryx Markdown (packages/core/src/Markdown/Markdown.tsx +
   parser.ts) — renderer-neutral markdown subset + per-CodeBlock submodel
   state. Supported subset (flagged in the port report): ATX headings,
   paragraphs, fenced code (```/~~~), blockquotes, ordered/unordered/task
   lists (single level), GFM tables, thematic breaks, standalone images, and
   inline strong/emphasis/delete/inlineCode/link/image/citation/hard-break.
   Not ported: streaming fade, plugins/inlinePlugins/extensions, component
   overrides, math (parsed as literal text), autolink, nested lists. */

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

export type MarkdownInline =
  | Readonly<{ type: 'text'; value: string }>
  | Readonly<{
      type: 'strong' | 'emphasis' | 'delete'
      children: ReadonlyArray<MarkdownInline>
    }>
  | Readonly<{ type: 'inlineCode'; value: string }>
  | Readonly<{
      type: 'link'
      url: string
      children: ReadonlyArray<MarkdownInline>
    }>
  | Readonly<{ type: 'image'; url: string; alt: string }>
  | Readonly<{ type: 'citation'; sourceId: string }>
  | Readonly<{ type: 'break' }>

export type MarkdownListItem = Readonly<{
  checked: boolean | null
  children: ReadonlyArray<MarkdownBlock>
}>

export type MarkdownTableCell = Readonly<{
  children: ReadonlyArray<MarkdownInline>
}>

export type MarkdownTableRow = Readonly<{
  children: ReadonlyArray<MarkdownTableCell>
}>

export type MarkdownTableAlign = 'left' | 'center' | 'right' | null

export type MarkdownBlock =
  | Readonly<{
      type: 'heading'
      depth: number
      children: ReadonlyArray<MarkdownInline>
    }>
  | Readonly<{
      type: 'paragraph'
      children: ReadonlyArray<MarkdownInline>
    }>
  | Readonly<{ type: 'code'; lang: string | null; value: string }>
  | Readonly<{
      type: 'blockquote'
      children: ReadonlyArray<MarkdownBlock>
    }>
  | Readonly<{
      type: 'list'
      ordered: boolean
      start: number
      children: ReadonlyArray<MarkdownListItem>
    }>
  | Readonly<{
      type: 'table'
      align: ReadonlyArray<MarkdownTableAlign>
      children: ReadonlyArray<MarkdownTableRow>
    }>
  | Readonly<{ type: 'thematicBreak' }>
  | Readonly<{ type: 'image'; url: string; alt: string }>

export type MarkdownSource = Readonly<{
  title: string
  url?: string
  icon?: string
}>

// ---------------------------------------------------------------------------
// URL sanitization (packages/core/src/Markdown/url.ts, subset)
// ---------------------------------------------------------------------------

const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|#|\.|\/|~\/)/i

/** Returns the URL if safe to render, else null (javascript:/data:/etc). */
export const sanitizeMarkdownUrl = (url: string): string | null => {
  const trimmed = url.trim()
  if (trimmed === '') {
    return null
  }
  // Control characters or whitespace inside the scheme position are unsafe.
  if (/^[\u0000-\u0020]*[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return SAFE_URL_PATTERN.test(trimmed) ? trimmed : null
  }
  return trimmed
}

// ---------------------------------------------------------------------------
// Inline parser
// ---------------------------------------------------------------------------

const findClosing = (source: string, marker: string, from: number): number => {
  const index = source.indexOf(marker, from)
  return index > from ? index : -1
}

const parseBracketTarget = (
  source: string,
  openParen: number,
): { url: string; end: number } | null => {
  const close = source.indexOf(')', openParen + 1)
  if (close === -1) {
    return null
  }
  return { url: source.slice(openParen + 1, close).trim(), end: close + 1 }
}

export const parseMarkdownInline = (
  source: string,
  sourceIds?: ReadonlySet<string>,
): MarkdownInline[] => {
  const nodes: MarkdownInline[] = []
  let buffer = ''
  let i = 0

  const flush = () => {
    if (buffer !== '') {
      nodes.push({ type: 'text', value: buffer })
      buffer = ''
    }
  }

  while (i < source.length) {
    const char = source[i]

    // Hard break: two trailing spaces or a backslash before a newline.
    if (
      (char === '\\' && source[i + 1] === '\n') ||
      source.startsWith('  \n', i)
    ) {
      flush()
      nodes.push({ type: 'break' })
      i += char === '\\' ? 2 : 3
      continue
    }
    if (char === '\n') {
      buffer += ' '
      i++
      continue
    }

    if (char === '`') {
      const end = findClosing(source, '`', i + 1)
      if (end !== -1) {
        flush()
        nodes.push({ type: 'inlineCode', value: source.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    if (source.startsWith('**', i) || source.startsWith('__', i)) {
      const marker = source.slice(i, i + 2)
      const end = findClosing(source, marker, i + 2)
      if (end !== -1) {
        flush()
        nodes.push({
          type: 'strong',
          children: parseMarkdownInline(source.slice(i + 2, end), sourceIds),
        })
        i = end + 2
        continue
      }
    }

    if (source.startsWith('~~', i)) {
      const end = findClosing(source, '~~', i + 2)
      if (end !== -1) {
        flush()
        nodes.push({
          type: 'delete',
          children: parseMarkdownInline(source.slice(i + 2, end), sourceIds),
        })
        i = end + 2
        continue
      }
    }

    if (char === '*' || char === '_') {
      const end = findClosing(source, char, i + 1)
      if (end !== -1) {
        flush()
        nodes.push({
          type: 'emphasis',
          children: parseMarkdownInline(source.slice(i + 1, end), sourceIds),
        })
        i = end + 1
        continue
      }
    }

    // Full-width citation brackets 【id】.
    if (char === '【') {
      const end = source.indexOf('】', i + 1)
      if (end !== -1) {
        const id = source.slice(i + 1, end).trim()
        if (sourceIds !== undefined && sourceIds.has(id)) {
          flush()
          nodes.push({ type: 'citation', sourceId: id })
          i = end + 1
          continue
        }
      }
    }

    if (char === '!' && source[i + 1] === '[') {
      const close = source.indexOf(']', i + 2)
      if (close !== -1 && source[close + 1] === '(') {
        const target = parseBracketTarget(source, close + 1)
        if (target !== null) {
          flush()
          nodes.push({
            type: 'image',
            alt: source.slice(i + 2, close),
            url: target.url,
          })
          i = target.end
          continue
        }
      }
    }

    if (char === '[') {
      const close = source.indexOf(']', i + 1)
      if (close !== -1) {
        const label = source.slice(i + 1, close)
        if (source[close + 1] === '(') {
          const target = parseBracketTarget(source, close + 1)
          if (target !== null && target.url !== '') {
            flush()
            nodes.push({
              type: 'link',
              url: target.url,
              children:
                label === ''
                  ? [{ type: 'text', value: target.url }]
                  : parseMarkdownInline(label, sourceIds),
            })
            i = target.end
            continue
          }
        }
        // [sourceId] citation.
        if (sourceIds !== undefined && sourceIds.has(label.trim())) {
          flush()
          nodes.push({ type: 'citation', sourceId: label.trim() })
          i = close + 1
          continue
        }
      }
    }

    buffer += char
    i++
  }
  flush()
  return nodes
}

// ---------------------------------------------------------------------------
// Block parser
// ---------------------------------------------------------------------------

const FENCE_OPEN = /^\s*(```+|~~~+)([^\s`]*)\s*$/
const HEADING = /^\s*(#{1,6})\s+(.*?)\s*$/
const THEMATIC_BREAK = /^\s*([-*_])(?:\s*\1){2,}\s*$/
const BLOCKQUOTE = /^\s*>[ ]?/
const UNORDERED_ITEM = /^\s*[-*+] +/
const ORDERED_ITEM = /^\s*(\d+)[.)] +/
const TASK_PREFIX = /^\[( |x|X)\] +/
const TABLE_DELIMITER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(cell => cell.trim())
}

const parseTableAlign = (cell: string): MarkdownTableAlign => {
  const starts = cell.startsWith(':')
  const ends = cell.endsWith(':')
  if (starts && ends) {
    return 'center'
  }
  if (ends) {
    return 'right'
  }
  if (starts) {
    return 'left'
  }
  return null
}

const isTableDelimiter = (line: string): boolean =>
  TABLE_DELIMITER.test(line) && line.includes('-')

export const parseMarkdownBlocks = (
  source: string,
  sourceIds?: ReadonlySet<string>,
): MarkdownBlock[] => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code block.
    const fence = FENCE_OPEN.exec(line)
    if (fence !== null) {
      const marker = fence[1]?.charAt(0) ?? '`'
      const lang = (fence[2] ?? '') === '' ? null : (fence[2] ?? '')
      const body: string[] = []
      i++
      while (
        i < lines.length &&
        !(lines[i] ?? '').trim().startsWith(marker.repeat(3))
      ) {
        body.push(lines[i] ?? '')
        i++
      }
      i++ // skip closing fence
      blocks.push({
        type: 'code',
        lang,
        value: body.join('\n'),
      })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      blocks.push({
        type: 'heading',
        depth: (heading[1] ?? '#').length,
        children: parseMarkdownInline(heading[2] ?? '', sourceIds),
      })
      i++
      continue
    }

    if (THEMATIC_BREAK.test(line)) {
      blocks.push({ type: 'thematicBreak' })
      i++
      continue
    }

    if (BLOCKQUOTE.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && BLOCKQUOTE.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(BLOCKQUOTE, ''))
        i++
      }
      blocks.push({
        type: 'blockquote',
        children: parseMarkdownBlocks(quoteLines.join('\n'), sourceIds),
      })
      continue
    }

    // GFM table: header row + delimiter row + data rows.
    const nextLine = lines[i + 1] ?? ''
    if (line.includes('|') && isTableDelimiter(nextLine)) {
      const align = splitTableRow(nextLine).map(parseTableAlign)
      const headerCells = splitTableRow(line).map(cell => ({
        children: parseMarkdownInline(cell, sourceIds),
      }))
      const rows: MarkdownTableRow[] = [{ children: headerCells }]
      i += 2
      while (
        i < lines.length &&
        (lines[i] ?? '').includes('|') &&
        (lines[i] ?? '').trim() !== ''
      ) {
        const cells = splitTableRow(lines[i] ?? '').map(cell => ({
          children: parseMarkdownInline(cell, sourceIds),
        }))
        rows.push({ children: cells })
        i++
      }
      blocks.push({ type: 'table', align, children: rows })
      continue
    }

    const unordered = UNORDERED_ITEM.exec(line)
    const ordered = ORDERED_ITEM.exec(line)
    if (unordered !== null || ordered !== null) {
      const isOrdered = ordered !== null
      const start =
        ordered === null ? 1 : Number.parseInt(ordered[1] ?? '1', 10)
      const items: MarkdownListItem[] = []
      while (i < lines.length) {
        const current = lines[i] ?? ''
        const uMatch = UNORDERED_ITEM.exec(current)
        const oMatch = ORDERED_ITEM.exec(current)
        if (uMatch === null && oMatch === null) {
          // Continuation lines (indented) belong to the previous item.
          if (
            items.length > 0 &&
            current.trim() !== '' &&
            /^\s{2,}\S/.test(current)
          ) {
            const previous = items[items.length - 1]
            if (previous !== undefined) {
              items[items.length - 1] = {
                ...previous,
                children: [
                  ...previous.children,
                  {
                    type: 'paragraph',
                    children: parseMarkdownInline(current.trim(), sourceIds),
                  },
                ],
              }
            }
            i++
            continue
          }
          break
        }
        const marker = (uMatch ?? oMatch)?.[0] ?? ''
        let content = current.slice(marker.length).trim()
        let checked: boolean | null = null
        const task = TASK_PREFIX.exec(content)
        if (task !== null) {
          checked = (task[1] ?? ' ') !== ' '
          content = content.slice(task[0].length)
        }
        items.push({
          checked,
          children: [
            {
              type: 'paragraph',
              children: parseMarkdownInline(content, sourceIds),
            },
          ],
        })
        i++
      }
      blocks.push({
        type: 'list',
        ordered: isOrdered,
        start,
        children: items,
      })
      continue
    }

    // Paragraph: accumulate until a blank line or another block start.
    const paragraphLines: string[] = []
    while (i < lines.length) {
      const current = lines[i] ?? ''
      if (current.trim() === '') {
        break
      }
      if (
        paragraphLines.length > 0 &&
        (FENCE_OPEN.test(current) ||
          HEADING.test(current) ||
          THEMATIC_BREAK.test(current) ||
          BLOCKQUOTE.test(current) ||
          UNORDERED_ITEM.test(current) ||
          ORDERED_ITEM.test(current))
      ) {
        break
      }
      paragraphLines.push(current)
      i++
    }
    const text = paragraphLines.join('\n')
    const inline = parseMarkdownInline(text, sourceIds)
    // A paragraph consisting of a single image renders as a block image.
    const onlyImage =
      inline.length === 1 && inline[0]?.type === 'image' ? inline[0] : undefined
    if (onlyImage !== undefined && onlyImage.type === 'image') {
      blocks.push({ type: 'image', url: onlyImage.url, alt: onlyImage.alt })
    } else {
      blocks.push({ type: 'paragraph', children: inline })
    }
  }

  return blocks
}

// ---------------------------------------------------------------------------
// Submodel — one CodeBlock model per fenced block, keyed by block index
// ---------------------------------------------------------------------------

export const Model = S.Struct({
  codeBlocks: S.Record(S.String, CodeBlock.Model),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotMarkdownCodeBlockMessage: {
    blockIndex: S.Number,
    message: CodeBlock.Message,
  },
})
export type Message = typeof Message.Type

export const init = (): Model => ({ codeBlocks: {} })

/** Model for the fenced block at `blockIndex`; lazy so the parser stays pure. */
export const codeBlockModel = (
  model: Model,
  blockIndex: number,
): CodeBlock.Model => model.codeBlocks[String(blockIndex)] ?? CodeBlock.init()

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotMarkdownCodeBlockMessage': {
      const key = String(message.blockIndex)
      const current = model.codeBlocks[key] ?? CodeBlock.init()
      const { model: next, commands } = CodeBlock.update(
        current,
        message.message,
      )
      return {
        model: {
          ...model,
          codeBlocks: { ...model.codeBlocks, [key]: next },
        },
        commands: Command.mapMessages(commands ?? [], child =>
          Message.GotMarkdownCodeBlockMessage({
            blockIndex: message.blockIndex,
            message: child,
          }),
        ),
      }
    }
  }
}
