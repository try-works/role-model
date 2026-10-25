import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type FileInputFixture = Readonly<{
  title: string
  description: string
  label: string
  width: number
  placeholder?: string
  helperText?: string
  accept?: string
  maxSize?: number
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/FileInput/*.tsx —
   same demos, same labels. */
export const fileInputFixtures: Readonly<
  [FileInputFixture, ...Array<FileInputFixture>]
> = [
  {
    title: 'File Input',
    description: 'A file select/dropzone for uploads.',
    label: 'Upload file',
    placeholder: 'Drag files here or click to browse',
    width: 350,
  },
  {
    title: 'FileInput — Basic',
    description:
      'A controlled single-file upload with accepted types, a size limit, and helper text. Use for standard document upload fields in forms.',
    label: 'Resume',
    accept: '.pdf,.docx',
    helperText: 'PDF or Word document, up to 5 MB',
    maxSize: 5 * 1024 * 1024,
    width: 350,
  },
]

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const initConfig = (fixture: FileInputFixture): string =>
  `{ id: 'docs-file-input'${fixture.accept === undefined ? '' : `, accept: '${fixture.accept}'`}${fixture.maxSize === undefined ? '' : `, maxSize: ${fixture.maxSize}`} }`

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = fileInputFixtures[index] ?? fileInputFixtures[0]
  return foldkitApplication({
    title: `FileInput — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as FileInput from '@/${ui(renderer)}/file-input'`,
    model: `export const Model = S.Struct({
  input: FileInput.Model,
  files: S.Array(S.Unknown),
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotFileInputMessage = taggedStruct('GotFileInputMessage', { message: FileInput.Message });
export const Message = S.Union([GotFileInputMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {
    input: FileInput.init(${initConfig(fixture)}),
    files: [],
  } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotFileInputMessage': {
      const next = FileInput.update(model.input, message.message)
      const commands = next.commands ?? []
      const files = next.outMessage === undefined
        ? model.files
        : next.outMessage._tag === 'ChangedValue'
          ? [...next.outMessage.files]
          : []
      return {
        model: { ...model, input: next.model, files },
        commands: Command.mapMessages(commands, next2 =>
          GotFileInputMessage({ message: next2 }),
        ),
      }
    }
  }
}`,
    view: `${renderer !== 'tailwind' ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'mx-auto flex min-h-screen w-full max-w-md items-center p-8'"})], [
    h.div([h.Style({ width: '${String(fixture.width)}px' })], [
      FileInput.fileInput(
        {
          model: model.input,
          toParentMessage: message => GotFileInputMessage({ message }),
          id: 'docs-file-input',
          label: '${fixture.label}',${fixture.placeholder === undefined ? '' : `\n          placeholder: '${fixture.placeholder}',`}${fixture.helperText === undefined ? '' : `\n          description: '${fixture.helperText}',`}
          value: model.files as ReadonlyArray<File>,
        },
        h,
      ),
    ]),
  ]),
})`,
  })
}

const fileInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  fileInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    keepIdsCanonical: true,
    code: source(index, renderer),
  }))

export const fileInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, fileInputExamplesFor(renderer))
