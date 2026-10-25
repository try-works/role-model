import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type DialogFixture,
  dialogFixtures,
  dialogLorem,
  dialogRtlFields,
  dialogShareUrl,
} from '@/docs/components/pages/dialog/shared'
import { cn } from '@/lib/utils'
import * as Button from '@/ui/button'
import * as Dialog from '@/ui/dialog'
import * as Field from '@/ui/field'
import * as Input from '@/ui/input'

const DialogPreviewMessage = defineMessageUnion({
  OpenedDialogPreview: {},
  GotDialogPreviewMessage: { message: Dialog.Message },
  ChangedName: { value: S.String },
  ChangedUsername: { value: S.String },
})
type DialogPreviewMessage = typeof DialogPreviewMessage.Type
const DialogPreviewModel = S.Struct({
  _docsPage: S.Literal('dialog'),
  dialog: Dialog.Model,
  name: S.String,
  username: S.String,
})
type DialogPreviewModel = typeof DialogPreviewModel.Type

const scrollableContent = (h: HtmlBuilder<DialogPreviewMessage>): Html =>
  h.div(
    [h.Class('-mx-4 max-h-[50vh] overflow-y-auto px-4')],
    Array.from({ length: 10 }).map((_, index) =>
      h.p(
        [h.Key(String(index)), h.Class('mb-4 leading-normal')],
        [dialogLorem],
      ),
    ),
  )

const fieldRow = (
  index: number,
  model: DialogPreviewModel,
  h: HtmlBuilder<DialogPreviewMessage>,
  field: (typeof dialogRtlFields)[number],
  rtl: boolean,
): Html =>
  Field.field(
    {
      children: [
        Field.fieldLabel(
          {
            for: `docs-dialog-${String(index)}-${field.id}`,
            children: [
              rtl ? field.label : field.id === 'name-1' ? 'Name' : 'Username',
            ],
          },
          h,
        ),
        Field.fieldContent(
          {
            children: [
              Input.input(
                {
                  id: `docs-dialog-${String(index)}-${field.id}`,
                  value: field.id === 'name-1' ? model.name : model.username,
                  onInput: value =>
                    field.id === 'name-1'
                      ? DialogPreviewMessage.ChangedName({ value })
                      : DialogPreviewMessage.ChangedUsername({ value }),
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

const profileFields = (
  index: number,
  model: DialogPreviewModel,
  h: HtmlBuilder<DialogPreviewMessage>,
  rtl: boolean,
): Html =>
  Field.fieldGroup(
    {
      children: dialogRtlFields.map(field =>
        fieldRow(index, model, h, field, rtl),
      ),
    },
    h,
  )

type Slots = Parameters<
  NonNullable<Dialog.DialogProps<DialogPreviewMessage>['footer']>
>[0]

const outlineAction = (
  slots: Slots,
  label: string,
  initialFocus: boolean,
  h: HtmlBuilder<DialogPreviewMessage>,
): Html =>
  h.button(
    [
      ...slots.closeButton,
      ...(initialFocus ? slots.initialFocusAttributes() : []),
      h.Type('button'),
      h.Class(
        cn(
          Button.buttonVariants({ variant: 'outline', size: 'lg' }),
          'transition-colors motion-reduce:transition-none',
        ),
      ),
    ],
    [label],
  )

const primaryAction = (
  slots: Slots,
  label: string,
  h: HtmlBuilder<DialogPreviewMessage>,
): Html =>
  h.button(
    [
      ...slots.closeButton,
      h.Type('button'),
      h.Class(
        cn(
          Button.buttonVariants({ size: 'lg' }),
          'transition-colors motion-reduce:transition-none',
        ),
      ),
    ],
    [label],
  )

const dialogView = (
  index: number,
  fixture: DialogFixture,
  model: DialogPreviewModel,
  h: HtmlBuilder<DialogPreviewMessage>,
): Html => {
  const shared = {
    model: model.dialog,
    toParentMessage: (message: Dialog.Message): DialogPreviewMessage =>
      DialogPreviewMessage.GotDialogPreviewMessage({ message }),
    title: fixture.dialogTitle,
    ...(fixture.dialogDescription === undefined
      ? {}
      : { description: fixture.dialogDescription }),
  }
  switch (fixture.kind) {
    case 'profile':
      return Dialog.dialog(
        {
          ...shared,
          class: 'sm:max-w-sm',
          content: () => [profileFields(index, model, h, false)],
          footer: slots => [
            outlineAction(slots, 'Cancel', true, h),
            primaryAction(slots, 'Save changes', h),
          ],
        },
        h,
      )
    case 'compact':
      return Dialog.dialog(
        {
          ...shared,
          class: 'sm:max-w-sm',
          content: () => [
            h.p(
              [h.Class('text-sm')],
              ['Dialog content remains ordinary Foldkit Html.'],
            ),
          ],
          footer: slots => [
            outlineAction(slots, 'Back', true, h),
            primaryAction(slots, 'Confirm', h),
          ],
        },
        h,
      )
    case 'share':
      return Dialog.dialog(
        {
          ...shared,
          class: 'sm:max-w-md',
          content: () => [
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.div(
                  [h.Class('grid flex-1 gap-2')],
                  [
                    h.label(
                      [
                        h.For(`docs-dialog-${String(index)}-link`),
                        h.Class('sr-only'),
                      ],
                      ['Link'],
                    ),
                    Input.input(
                      {
                        id: `docs-dialog-${String(index)}-link`,
                        value: dialogShareUrl,
                        isReadOnly: true,
                      },
                      h,
                    ),
                  ],
                ),
              ],
            ),
          ],
          footer: slots => [outlineAction(slots, 'Close', false, h)],
        },
        h,
      )
    case 'noClose':
      return Dialog.dialog({ ...shared, showCloseButton: false }, h)
    case 'sticky':
      return Dialog.dialog(
        {
          ...shared,
          content: () => [scrollableContent(h)],
          footer: slots => [outlineAction(slots, 'Close', false, h)],
        },
        h,
      )
    case 'scroll':
      return Dialog.dialog(
        { ...shared, content: () => [scrollableContent(h)] },
        h,
      )
    case 'rtl':
      return Dialog.dialog(
        {
          ...shared,
          class: 'sm:max-w-sm',
          layout: parts => [
            h.div(
              [h.Dir('rtl'), h.Class('grid gap-4')],
              [
                parts.header({
                  children: [
                    parts.title({ children: [fixture.dialogTitle] }),
                    parts.description({
                      children: [fixture.dialogDescription ?? ''],
                    }),
                  ],
                }),
                profileFields(index, model, h, true),
                parts.footer({
                  children: [
                    h.button(
                      [
                        ...parts.closeButtonAttributes,
                        ...parts.initialFocusAttributes(),
                        h.Type('button'),
                        h.Class(
                          cn(
                            Button.buttonVariants({
                              variant: 'outline',
                              size: 'lg',
                            }),
                            'transition-colors motion-reduce:transition-none',
                          ),
                        ),
                      ],
                      ['إلغاء'],
                    ),
                    h.button(
                      [
                        ...parts.closeButtonAttributes,
                        h.Type('button'),
                        h.Class(
                          cn(
                            Button.buttonVariants({ size: 'lg' }),
                            'transition-colors motion-reduce:transition-none',
                          ),
                        ),
                      ],
                      ['حفظ التغييرات'],
                    ),
                  ],
                }),
                parts.close({}),
              ],
            ),
          ],
        },
        h,
      )
  }
}

export const dialogTailwindPreviewProgram = definePreviewProgram<
  DialogPreviewModel,
  DialogPreviewMessage
>({
  Model: DialogPreviewModel,
  Message: DialogPreviewMessage,
  init: index => ({
    _docsPage: 'dialog',
    dialog: Dialog.init({
      id: `docs-dialog-${String(index)}`,
      isAnimated: true,
    }),
    name: 'Pedro Duarte',
    username: '@peduarte',
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedName':
        return { model: { ...model, name: message.value } }
      case 'ChangedUsername':
        return { model: { ...model, username: message.value } }
      default: {
        const result =
          message._tag === 'OpenedDialogPreview'
            ? Dialog.open(model.dialog)
            : Dialog.update(model.dialog, message.message)
        return {
          model: { ...model, dialog: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            DialogPreviewMessage.GotDialogPreviewMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = dialogFixtures[index] ?? dialogFixtures[0]!
    return h.div(
      [],
      [
        Button.button(
          {
            variant: fixture.triggerVariant,
            onClick: DialogPreviewMessage.OpenedDialogPreview(),
            children: [fixture.triggerLabel],
          },
          h,
        ),
        dialogView(index, fixture, model, h),
      ],
    )
  },
})
