import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { fileInputFixtures } from '@/docs/components/pages/file-input/shared'
import * as FileInput from '@/ui/file-input'

const GotFileInputMessage = defineMessageUnion({
  GotFileInputMessage: {
    message: FileInput.Message,
  },
})
type GotFileInputMessage = typeof GotFileInputMessage.Type

const FileInputPreviewModel = S.Struct({
  _docsPage: S.Literal('file-input'),
  input: FileInput.Model,
  files: S.Array(S.Unknown),
})
type FileInputPreviewModel = typeof FileInputPreviewModel.Type

export const fileInputTailwindPreviewProgram = definePreviewProgram<
  FileInputPreviewModel,
  GotFileInputMessage
>({
  Model: FileInputPreviewModel,
  Message: GotFileInputMessage,
  init: index => {
    const fixture = fileInputFixtures[index] ?? fileInputFixtures[0]
    return {
      _docsPage: 'file-input',
      input: FileInput.init({
        id: `docs-file-input-${String(index)}`,
        ...(fixture.accept === undefined ? {} : { accept: fixture.accept }),
        ...(fixture.maxSize === undefined ? {} : { maxSize: fixture.maxSize }),
      }),
      files: [],
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotFileInputMessage': {
        const next = FileInput.update(model.input, message.message)
        const commands = next.commands ?? []
        const files =
          next.outMessage === undefined
            ? model.files
            : next.outMessage._tag === 'ChangedValue'
              ? [...next.outMessage.files]
              : []
        return {
          model: { ...model, input: next.model, files },
          commands: Command.mapMessages(commands, next2 =>
            GotFileInputMessage.GotFileInputMessage({ message: next2 }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = fileInputFixtures[index] ?? fileInputFixtures[0]
    return h.div(
      [h.Style({ width: `${String(fixture.width)}px` })],
      [
        FileInput.fileInput(
          {
            model: model.input,
            toParentMessage: message =>
              GotFileInputMessage.GotFileInputMessage({ message }),
            id: model.input.id,
            label: fixture.label,
            ...(fixture.placeholder === undefined
              ? {}
              : { placeholder: fixture.placeholder }),
            ...(fixture.helperText === undefined
              ? {}
              : { description: fixture.helperText }),
            value: model.files as ReadonlyArray<File>,
          },
          h,
        ),
      ],
    )
  },
})
