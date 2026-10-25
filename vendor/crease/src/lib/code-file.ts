import { Effect, Schema as S } from 'effect'
import { Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { File, registerCustomTheme } from '@pierre/diffs'

/* Pierre File viewer embedded in foldkit. Same mount contract as the ECharts
   integration: the view renders a host div with h.OnMount, the mount owns the
   pierre component for the element's lifetime, and mount args carry only
   serializable values. Highlighting resolves asynchronously inside pierre, so
   the mount returns immediately and tokens upgrade in place.
   Theme follows the app's light/dark flag (keyed hosts remount on a flip).

   Crease ships its own theme pair: the bundled pierre-light palette has
   tokens that fail the docs axe contrast gate, so both themes use Tailwind
   hues measured at >= 4.5:1 on their background. */

type TokenColors = Readonly<{
  text: string
  comment: string
  keyword: string
  string: string
  number: string
  fn: string
  type: string
  property: string
  background: string
}>

const creaseTheme = (
  name: string,
  type: 'light' | 'dark',
  colors: TokenColors,
) => ({
  name,
  type,
  colors: {
    'editor.background': colors.background,
    'editor.foreground': colors.text,
  },
  settings: [
    { scope: [], settings: { foreground: colors.text } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: colors.comment, fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage.type',
        'storage.modifier',
        'keyword.operator',
        'keyword.control',
        'keyword.other',
      ],
      settings: { foreground: colors.keyword },
    },
    {
      scope: [
        'string',
        'string.quoted',
        'string.template',
        'string.regexp',
        'constant.character',
        'constant.other',
      ],
      settings: { foreground: colors.string },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.language.boolean',
        'constant.language.null',
        'support.constant',
      ],
      settings: { foreground: colors.number },
    },
    {
      scope: [
        'entity.name.function',
        'support.function',
        'meta.function-call',
        'variable.function',
        'entity.name.method',
      ],
      settings: { foreground: colors.fn },
    },
    {
      scope: [
        'entity.name.type',
        'support.type',
        'entity.name.class',
        'entity.name.namespace',
        'entity.name.tag',
        'keyword.type',
        'entity.other.attribute-name',
      ],
      settings: { foreground: colors.type },
    },
    {
      scope: [
        'variable.other.property',
        'support.variable',
        'entity.name.variable',
        'meta.object-literal.key',
        'variable.other.object',
        'variable.other.constant.object',
      ],
      settings: { foreground: colors.property },
    },
  ],
})

const CREASE_LIGHT = creaseTheme('crease-light', 'light', {
  text: '#18181b',
  comment: '#71717a',
  keyword: '#7c3aed',
  string: '#047857',
  number: '#b45309',
  fn: '#0369a1',
  type: '#be185d',
  property: '#1d4ed8',
  background: '#ffffff',
})

const CREASE_DARK = creaseTheme('crease-dark', 'dark', {
  text: '#e4e4e7',
  comment: '#a1a1aa',
  keyword: '#c4b5fd',
  string: '#6ee7b7',
  number: '#fcd34d',
  fn: '#7dd3fc',
  type: '#f9a8d4',
  property: '#93c5fd',
  background: '#09090b',
})

registerCustomTheme('crease-light', async () => CREASE_LIGHT)
registerCustomTheme('crease-dark', async () => CREASE_DARK)

const makeScrollableFocusable = (node: HTMLElement): void => {
  node.style.display = 'block'
  node.style.minWidth = '0'
  node.style.height = '100%'
  node.style.minHeight = '0'
  const roots: (HTMLElement | ShadowRoot)[] = [node]
  if (node.shadowRoot) roots.push(node.shadowRoot)
  for (const root of roots) {
    for (const el of root.querySelectorAll<HTMLElement>(
      'pre, code[data-code], diffs-container',
    )) {
      el.setAttribute('tabindex', '0')
    }
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      if (
        (el.scrollWidth > el.clientWidth ||
          el.scrollHeight > el.clientHeight) &&
        !el.hasAttribute('tabindex')
      ) {
        el.setAttribute('tabindex', '0')
      }
    }
  }
}

// MESSAGE

export const Message = defineMessageUnion({
  MountedCodeFile: {},
  FailedCodeFile: { reason: S.String },
})
export type Message = typeof Message.Type

// MOUNT

export const MountCodeFile = Mount.define('MountCodeFile', {
  args: {
    fileName: S.String,
    contents: S.String,
    dark: S.Boolean,
    lineNumbers: S.Boolean,
  },
  messages: [Message.MountedCodeFile, Message.FailedCodeFile],
  execute: ({ element, fileName, contents, dark, lineNumbers }) =>
    Effect.acquireRelease(
      Effect.try({
        try: () => {
          if (!(element instanceof HTMLElement)) {
            throw new Error('Code file host is not an HTMLElement.')
          }
          const view = new File({
            theme: { light: 'crease-light', dark: 'crease-dark' },
            themeType: dark ? 'dark' : 'light',
            disableFileHeader: true,
            disableLineNumbers: !lineNumbers,
            overflow: 'scroll',
            unsafeCSS:
              'pre { height: 100%; } [data-code] { height: 100%; overflow-y: auto; align-content: start; }',
            onPostRender: node => {
              makeScrollableFocusable(node)
            },
          })
          view.render({
            file: { name: fileName, contents },
            containerWrapper: element,
          })
          return view
        },
        catch: error =>
          error instanceof Error ? error : new Error(String(error)),
      }),
      view => Effect.sync(() => view.cleanUp()),
    ).pipe(
      Effect.map(() => Message.MountedCodeFile()),
      Effect.catch(error =>
        Effect.succeed(Message.FailedCodeFile({ reason: error.message })),
      ),
    ),
})
