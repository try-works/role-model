import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

/* Ported from Meta Astryx CodeBlock (packages/core/src/CodeBlock/CodeBlock.tsx,
   tokenizer.ts) — per-language regex tokenizer and the copy/collapse state
   machine adapted to Foldkit's Command/update pattern. Async and streaming
   tokenization are omitted: foldkit views render synchronously and the astryx
   async path exists only to yield to the main thread. */

// ---------------------------------------------------------------------------
// Tokenizer (packages/core/src/CodeBlock/tokenizer.ts, sync subset)
// ---------------------------------------------------------------------------

export type SyntaxToken = Readonly<{ type: string; start: number; end: number }>

/** Per-line tokens with line-relative offsets (0 = start of line). */
export type TokenLine = ReadonlyArray<SyntaxToken>

type LangPattern = Readonly<{ type: string; regex: RegExp; anchored: RegExp }>

type LangDef = Readonly<{
  patterns: ReadonlyArray<LangPattern>
  /** Token type matching the element's default text color (skipped in output). */
  defaultType: string
}>

const langCache = new Map<string, LangDef | null>()

const JS_KEYWORDS =
  /\b(const|let|var|function|class|if|else|for|while|return|import|export|from|default|async|await|try|catch|throw|new|typeof|instanceof|interface|type|enum|extends|implements|switch|case|break|continue|do|in|of|void|null|undefined|true|false|this|super|yield|delete|static|public|private|protected|readonly|abstract|as|is|keyof|declare|module|namespace|require)\b/

const PYTHON_KEYWORDS =
  /\b(def|class|if|elif|else|for|while|return|import|from|as|with|try|except|raise|True|False|None|and|or|not|in|is|lambda|yield|async|await|pass|break|continue|del|global|nonlocal|assert|finally|print|self|cls)\b/

const BASH_KEYWORDS =
  /\b(if|then|else|elif|fi|for|do|done|while|until|case|esac|function|in|select|return|exit|local|export|source|alias|unalias|readonly|shift|eval|exec|set|unset|trap|wait|read|echo|printf|test|true|false)\b/

const CSS_KEYWORDS = /\b(important|inherit|initial|unset|revert|auto|none)\b/

const PHP_KEYWORDS =
  /\b(function|class|if|else|elseif|for|foreach|while|return|echo|public|private|protected|static|new|try|catch|throw|namespace|use|require|require_once|include|include_once|extends|implements|interface|abstract|final|const|var|true|false|null|array|isset|unset|empty|list|match|enum|switch|case|break|continue|do|yield|fn)\b/

const HACK_KEYWORDS =
  /\b(function|class|if|else|for|foreach|while|return|echo|public|private|protected|static|new|try|catch|throw|namespace|use|require|include|extends|implements|interface|abstract|final|const|shape|vec|dict|keyset|async|await|concurrent|enum|type|newtype|tuple|inout)\b/

type RawPattern = Readonly<{ type: string; regex: RegExp }>

const buildLanguagePatterns = (
  lang: string,
): { patterns: ReadonlyArray<RawPattern>; defaultType: string } | null => {
  switch (lang) {
    case 'typescript':
    case 'javascript':
    case 'tsx':
    case 'jsx':
    case 'ts':
    case 'js':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /\/\*[\s\S]*?\*\// },
          { type: 'comment', regex: /\/\/[^\n]*/ },
          { type: 'string', regex: /`(?:[^`\\]|\\.)*`/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'constant', regex: /@[\w]+/ },
          { type: 'number', regex: /\b0[xX][0-9a-fA-F_]+\b/ },
          { type: 'number', regex: /\b0[bB][01_]+\b/ },
          { type: 'number', regex: /\b0[oO][0-7_]+\b/ },
          { type: 'number', regex: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/ },
          { type: 'keyword', regex: JS_KEYWORDS },
          { type: 'function', regex: /\b[a-zA-Z_$][\w$]*(?=\s*\()/ },
          { type: 'type', regex: /\b[A-Z][a-zA-Z0-9_]*\b/ },
          { type: 'operator', regex: /[+\-*/%=!<>&|^~?:]+/ },
          { type: 'punctuation', regex: /[{}()[\];,.]/ },
          { type: 'variable', regex: /\b[a-zA-Z_$][\w$]*\b/ },
        ],
      }

    case 'json':
      return {
        defaultType: 'punctuation',
        patterns: [
          { type: 'property', regex: /"(?:[^"\\]|\\.)*"(?=\s*:)/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'number', regex: /-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
          { type: 'constant', regex: /\b(true|false|null)\b/ },
          { type: 'punctuation', regex: /[{}()[\]:,]/ },
        ],
      }

    case 'html':
    case 'xml':
    case 'svg':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /<!--[\s\S]*?-->/ },
          { type: 'keyword', regex: /<!DOCTYPE[^>]*>/i },
          { type: 'tag', regex: /<\/[a-zA-Z][\w-]*\s*>/ },
          { type: 'tag', regex: /<[a-zA-Z][\w-]*/ },
          { type: 'tag', regex: /\/?>/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'attribute', regex: /\b[a-zA-Z_:][\w:.-]*(?=\s*=)/ },
          { type: 'operator', regex: /=/ },
        ],
      }

    case 'css':
    case 'scss':
    case 'less':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /\/\*[\s\S]*?\*\// },
          { type: 'comment', regex: /\/\/[^\n]*/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'variable', regex: /--[a-zA-Z_-][\w-]*/ },
          {
            type: 'number',
            regex:
              /-?\b\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|deg|rad|turn|s|ms|fr)?\b/,
          },
          { type: 'constant', regex: /#[0-9a-fA-F]{3,8}\b/ },
          { type: 'keyword', regex: CSS_KEYWORDS },
          { type: 'keyword', regex: /@[a-zA-Z][\w-]*/ },
          { type: 'tag', regex: /[.#][a-zA-Z_-][\w-]*/ },
          { type: 'keyword', regex: /::?[a-zA-Z][\w-]*/ },
          { type: 'function', regex: /\b[a-zA-Z_-][\w-]*(?=\s*\()/ },
          { type: 'property', regex: /[a-zA-Z_-][\w-]*(?=\s*:)/ },
          { type: 'punctuation', regex: /[{}()[\];:,]/ },
          { type: 'operator', regex: /[+~>*=|^$]/ },
        ],
      }

    case 'python':
    case 'py':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'string', regex: /"""[\s\S]*?"""/ },
          { type: 'string', regex: /'''[\s\S]*?'''/ },
          { type: 'string', regex: /f"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /f'(?:[^'\\]|\\.)*'/ },
          { type: 'comment', regex: /#[^\n]*/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'constant', regex: /@[\w.]+/ },
          { type: 'number', regex: /\b0[xX][0-9a-fA-F_]+\b/ },
          { type: 'number', regex: /\b0[bB][01_]+\b/ },
          { type: 'number', regex: /\b0[oO][0-7_]+\b/ },
          { type: 'number', regex: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?j?\b/ },
          { type: 'keyword', regex: PYTHON_KEYWORDS },
          { type: 'function', regex: /\b[a-zA-Z_][\w]*(?=\s*\()/ },
          { type: 'type', regex: /\b[A-Z][a-zA-Z0-9_]*\b/ },
          { type: 'operator', regex: /[+\-*/%=!<>&|^~@:]+/ },
          { type: 'punctuation', regex: /[{}()[\];,.]/ },
          { type: 'variable', regex: /\b[a-zA-Z_][\w]*\b/ },
        ],
      }

    case 'bash':
    case 'sh':
    case 'zsh':
    case 'shell':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /#[^\n]*/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'[^']*'/ },
          { type: 'variable', regex: /\$\{[^}]+\}/ },
          { type: 'variable', regex: /\$[a-zA-Z_][\w]*/ },
          { type: 'variable', regex: /\$[0-9@#?*!$-]/ },
          { type: 'number', regex: /\b\d+\b/ },
          { type: 'keyword', regex: BASH_KEYWORDS },
          { type: 'function', regex: /\b[a-zA-Z_][\w]*(?=\s*\()/ },
          { type: 'operator', regex: /[|&<>;!]+/ },
          { type: 'punctuation', regex: /[{}()[\]]/ },
        ],
      }

    case 'php':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /\/\*[\s\S]*?\*\// },
          { type: 'comment', regex: /\/\/[^\n]*/ },
          { type: 'comment', regex: /#[^\n]*/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'variable', regex: /\$[a-zA-Z_][\w]*/ },
          { type: 'number', regex: /\b0[xX][0-9a-fA-F]+\b/ },
          { type: 'number', regex: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
          { type: 'keyword', regex: PHP_KEYWORDS },
          { type: 'function', regex: /\b[a-zA-Z_][\w]*(?=\s*\()/ },
          { type: 'type', regex: /\b[A-Z][a-zA-Z0-9_]*\b/ },
          { type: 'operator', regex: /[+\-*/%=!<>&|^~?:.]+/ },
          { type: 'constant', regex: /@[\w]+/ },
          { type: 'punctuation', regex: /[{}()[\];,.]/ },
        ],
      }

    case 'hack':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /\/\*[\s\S]*?\*\// },
          { type: 'comment', regex: /\/\/[^\n]*/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'variable', regex: /\$[a-zA-Z_][\w]*/ },
          { type: 'number', regex: /\b0[xX][0-9a-fA-F]+\b/ },
          { type: 'number', regex: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
          { type: 'keyword', regex: HACK_KEYWORDS },
          { type: 'type', regex: /\b[A-Z][a-zA-Z0-9_]*\b/ },
          { type: 'function', regex: /\b[a-zA-Z_][\w]*(?=\s*\()/ },
          { type: 'property', regex: /(?<=->|::)\b[a-zA-Z_][\w]*\b/ },
          { type: 'operator', regex: /[+\-*/%=!<>&|^~?:.]+/ },
          { type: 'constant', regex: /<<[\w]+/ },
          { type: 'punctuation', regex: /[{}()[\];,.]/ },
        ],
      }

    case 'yaml':
    case 'yml':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'comment', regex: /#[^\n]*/ },
          { type: 'string', regex: /"(?:[^"\\]|\\.)*"/ },
          { type: 'string', regex: /'(?:[^'\\]|\\.)*'/ },
          { type: 'constant', regex: /\b(true|false|yes|no|on|off|null|~)\b/i },
          { type: 'variable', regex: /[&*][\w]+/ },
          { type: 'type', regex: /!!\w+/ },
          { type: 'number', regex: /\b-?\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
          { type: 'property', regex: /^[ \t]*[\w][\w ./-]*(?=\s*:)/m },
          { type: 'keyword', regex: /---/ },
          { type: 'keyword', regex: /\.\.\./ },
          { type: 'operator', regex: /[:|>-?]/ },
          { type: 'punctuation', regex: /[{}()[\],]/ },
          { type: 'variable', regex: /\b[a-zA-Z_][\w]*\b/ },
        ],
      }

    case 'markdown':
    case 'md':
      return {
        defaultType: 'variable',
        patterns: [
          { type: 'keyword', regex: /^```[\w]*$/m },
          { type: 'keyword', regex: /^#{1,6}\s+.*/m },
          { type: 'keyword', regex: /^---$/m },
          { type: 'keyword', regex: /^\*\*\*$/m },
          { type: 'string', regex: /\*\*(?:[^*]|\*(?!\*))+\*\*/ },
          { type: 'string', regex: /\*(?:[^*])+\*/ },
          { type: 'constant', regex: /`[^`]+`/ },
          { type: 'function', regex: /\[(?:[^\]])+\]\([^)]+\)/ },
          { type: 'comment', regex: /^>\s+.*/m },
          { type: 'operator', regex: /^\s*[-*+]\s/m },
          { type: 'number', regex: /^\s*\d+\.\s/m },
        ],
      }

    default:
      return null
  }
}

const buildLanguage = (lang: string): LangDef | null => {
  const cached = langCache.get(lang)
  if (cached !== undefined) {
    return cached
  }
  const raw = buildLanguagePatterns(lang)
  const def =
    raw === null
      ? null
      : {
          defaultType: raw.defaultType,
          patterns: raw.patterns.map(pattern => {
            const flags = pattern.regex.flags.replace(/[gy]/g, '') + 'y'
            return {
              ...pattern,
              anchored: new RegExp(pattern.regex.source, flags),
            }
          }),
        }
  langCache.set(lang, def)
  return def
}

const tokenizeLine = (
  code: string,
  langDef: LangDef,
  lineStart: number,
  lineEnd: number,
): SyntaxToken[] => {
  const tokens: SyntaxToken[] = []
  let pos = lineStart
  const limit = Math.min(lineEnd, code.length)

  while (pos < limit) {
    let matched = false

    for (const pattern of langDef.patterns) {
      pattern.anchored.lastIndex = pos
      const match = pattern.anchored.exec(code)

      if (match && match.index === pos && match[0].length > 0) {
        if (pattern.type !== langDef.defaultType) {
          tokens.push({
            type: pattern.type,
            start: pos - lineStart,
            end: pos - lineStart + match[0].length,
          })
        }
        pos += match[0].length
        matched = true
        break
      }
    }

    if (!matched) {
      pos++
    }
  }

  return tokens
}

/**
 * Tokenizes a code string into per-line token arrays with line-relative
 * offsets. Tokens matching the language's default color type are omitted —
 * the element's base color renders them.
 */
export const tokenize = (code: string, language: string): TokenLine[] => {
  const langDef = buildLanguage(language)
  if (!langDef) {
    return []
  }

  const result: TokenLine[] = []
  let lineStart = 0

  for (let i = 0; i <= code.length; i++) {
    if (i === code.length || code[i] === '\n') {
      result.push(tokenizeLine(code, langDef, lineStart, i))
      lineStart = i + 1
    }
  }

  return result
}

/**
 * Converts flat tokens with absolute offsets into per-line tokens
 * (line-relative offsets), for compatibility with custom tokenizers that
 * return the flat format.
 */
export const flatTokensToLines = (
  tokens: ReadonlyArray<{ type: string; start: number; end: number }>,
  code: string,
): TokenLine[] => {
  const lineStarts: number[] = [0]
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') {
      lineStarts.push(i + 1)
    }
  }

  const result: SyntaxToken[][] = Array.from(
    { length: lineStarts.length },
    () => [],
  )
  let lineIdx = 0

  for (const token of tokens) {
    while (
      lineIdx < lineStarts.length - 1 &&
      token.start >= (lineStarts[lineIdx + 1] ?? Number.MAX_SAFE_INTEGER)
    ) {
      lineIdx++
    }
    const lineStart = lineStarts[lineIdx] ?? 0
    ;(result[lineIdx] ?? []).push({
      type: token.type,
      start: token.start - lineStart,
      end: token.end - lineStart,
    })
  }

  return result
}

/**
 * The line list astryx renders: split on newlines, dropping a single trailing
 * empty line produced by a final `\n`.
 */
export const codeLines = (code: string): ReadonlyArray<string> => {
  const lines = code.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

// ---------------------------------------------------------------------------
// Submodel — copy feedback + collapse state
// ---------------------------------------------------------------------------

export const Model = S.Struct({
  /** The last code payload copied to the clipboard, cleared after ~2s. */
  copiedCode: S.NullOr(S.String),
  isCollapsed: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedCopyCode: { code: S.String },
  CompletedCopyCode: { code: S.String },
  CompletedWaitBeforeClearingCodeBlockCopyFeedback: { code: S.String },
  ToggledCollapse: {},
})
export type Message = typeof Message.Type

export const init = (config?: Readonly<{ isCollapsed?: boolean }>): Model => ({
  copiedCode: null,
  isCollapsed: config?.isCollapsed ?? false,
})

const CopyCodeToClipboard = Command.define('CopyCodeBlockCode', {
  args: { code: S.String },
  messages: [Message.CompletedCopyCode],
  execute: ({ code }) =>
    Effect.promise(() => navigator.clipboard.writeText(code)).pipe(
      Effect.as(Message.CompletedCopyCode({ code })),
    ),
})

const WaitBeforeClearingCopyFeedback = Command.define(
  'WaitBeforeClearingCodeBlockCopyFeedback',
  {
    args: { code: S.String },
    messages: [Message.CompletedWaitBeforeClearingCodeBlockCopyFeedback],
    execute: ({ code }) =>
      Effect.sleep('2 seconds').pipe(
        Effect.as(
          Message.CompletedWaitBeforeClearingCodeBlockCopyFeedback({ code }),
        ),
      ),
  },
)

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'ClickedCopyCode':
      return {
        model: model,
        commands: [CopyCodeToClipboard({ code: message.code })],
      }
    case 'CompletedCopyCode':
      return {
        model: { ...model, copiedCode: message.code },
        commands: [WaitBeforeClearingCopyFeedback({ code: message.code })],
      }
    case 'CompletedWaitBeforeClearingCodeBlockCopyFeedback':
      return {
        model: {
          ...model,
          copiedCode:
            model.copiedCode === message.code ? null : model.copiedCode,
        },
      }
    case 'ToggledCollapse':
      return { model: { ...model, isCollapsed: !model.isCollapsed } }
  }
}
