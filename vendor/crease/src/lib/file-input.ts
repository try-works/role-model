import { Effect, Option, Schema as S } from 'effect'
import { Command, Dom, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { FileDrop } from '@foldkit/ui'

/* Ported from Meta Astryx FileInput (packages/core/src/FileInput) — file
   validation (accept/maxSize/maxFiles), dropzone/compact chrome, and the
   validation-error status plumbing. */

export type FileInputMode = 'dropzone' | 'input'

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileName = (file: File): string => file.name
const fileSize = (file: File): number => file.size
const fileType = (file: File): string => file.type

export const acceptsFile = (file: File, accept: string): boolean =>
  accept
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(entry => entry !== '')
    .some(type => {
      if (type.startsWith('.'))
        return fileName(file).toLowerCase().endsWith(type)
      if (type.endsWith('/*'))
        return fileType(file).startsWith(type.slice(0, -1))
      return fileType(file).toLowerCase() === type
    })

export type FileValidation = Readonly<{
  valid: ReadonlyArray<File>
  errors: ReadonlyArray<string>
}>

export const validateFiles = (
  files: ReadonlyArray<File>,
  options: Readonly<{
    accept?: string | undefined
    maxSize?: number | undefined
    maxFiles?: number | undefined
    isMultiple: boolean
    label?: string | undefined
  }>,
): FileValidation => {
  const errors: string[] = []
  let valid = [...files]

  if (options.accept !== undefined && options.accept !== '') {
    valid = valid.filter(file => {
      const matches = acceptsFile(file, options.accept ?? '')
      if (!matches) {
        errors.push(`"${fileName(file)}" is not an accepted file type`)
      }
      return matches
    })
  }

  if (options.maxSize !== undefined) {
    const maxSize = options.maxSize
    valid = valid.filter(file => {
      if (fileSize(file) > maxSize) {
        errors.push(
          `"${fileName(file)}" exceeds the ${formatFileSize(maxSize)} size limit`,
        )
        return false
      }
      return true
    })
  }

  if (!options.isMultiple && valid.length > 1) {
    errors.push('Only one file can be selected')
    valid = valid.slice(0, 1)
  }
  if (
    options.isMultiple &&
    options.maxFiles !== undefined &&
    valid.length > options.maxFiles
  ) {
    errors.push(`You can upload up to ${options.maxFiles} files`)
    valid = valid.slice(0, options.maxFiles)
  }

  return { valid, errors }
}

/* --- Submodel ----------------------------------------------------------- */

export const Model = S.Struct({
  id: S.String,
  fileDrop: FileDrop.Model,
  /* Validation configuration is part of the model so update can apply it. */
  accept: S.Option(S.String),
  maxSize: S.Option(S.Number),
  maxFiles: S.Option(S.Number),
  isMultiple: S.Boolean,
  validationError: S.Option(S.String),
})
export type Model = typeof Model.Type

export type InitConfig = Readonly<{
  id: string
  accept?: string
  maxSize?: number
  maxFiles?: number
  isMultiple?: boolean
}>

export const init = (config: InitConfig): Model => ({
  id: config.id,
  fileDrop: FileDrop.init({ id: `${config.id}-dropzone-input` }),
  accept: Option.fromNullishOr(config.accept),
  maxSize: Option.fromNullishOr(config.maxSize),
  maxFiles: Option.fromNullishOr(config.maxFiles),
  isMultiple: config.isMultiple ?? false,
  validationError: Option.none(),
})

export const Message = defineMessageUnion({
  GotFileDropMessage: { message: S.Unknown },
  /* Pointer or keyboard activation of the visually-hidden trigger — opens the
     native picker by clicking the hidden file input. */
  TriggerClicked: {},
  ClearRequested: {},
  Noop: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { files: S.Array(S.Unknown) },
  Cleared: {},
})
export type OutMessage = typeof OutMessage.Type

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>

const foldFileDropOutMessage =
  (
    outMessage: FileDrop.OutMessage,
  ): Update.StepWithOutMessage<Model, Message, OutMessage> =>
  model => {
    switch (outMessage._tag) {
      case 'ReceivedFiles': {
        const { valid, errors } = validateFiles(outMessage.files, {
          accept: Option.getOrUndefined(model.accept),
          maxSize: Option.getOrUndefined(model.maxSize),
          maxFiles: Option.getOrUndefined(model.maxFiles),
          isMultiple: model.isMultiple,
        })
        return {
          model: {
            ...model,
            validationError:
              errors.length > 0 ? Option.some(errors.join(' ')) : Option.none(),
          },
          outMessage: OutMessage.ChangedValue({
            files: valid as ReadonlyArray<unknown>,
          }),
        }
      }
      case 'RejectedNonFiles':
        return { model }
    }
  }

const foldFileDrop = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.fileDrop),
  write: (model: Model, fileDrop: FileDrop.Model) => ({ ...model, fileDrop }),
  toParentMessage: (message: FileDrop.Message) =>
    Message.GotFileDropMessage({ message }),
  foldOutMessage: foldFileDropOutMessage,
})

export const fileInputSelector = (model: Model): string =>
  `#${model.fileDrop.id}`

const ClickFileInput = Command.define('FileInputClickInput', {
  messages: [Message.Noop],
  args: { selector: S.String },
  execute: ({ selector }) =>
    Dom.clickElement(selector).pipe(Effect.ignore, Effect.as(Message.Noop())),
})

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotFileDropMessage':
      return foldFileDrop(model, message.message as FileDrop.Message)
    case 'TriggerClicked':
      return {
        model,
        commands: [ClickFileInput({ selector: fileInputSelector(model) })],
      }
    case 'ClearRequested':
      return {
        model: { ...model, validationError: Option.none() },
        outMessage: OutMessage.Cleared(),
      }
    case 'Noop':
      return { model }
  }
}
