import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { textareaFixtures } from '@/docs/components/pages/textarea/shared'
import { taggedStruct } from 'foldkit/schema'
import * as Button from '@/ui/button'
import * as Field from '@/ui/field'
import * as Textarea from '@/ui/textarea'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('textarea'),
  values: S.Record(S.String, S.String),
})
type PreviewModel = typeof PreviewModel.Type

const ChangedPreview = taggedStruct('ChangedTextareaPreview', {
  id: S.String,
  value: S.String,
})
const PreviewMessage = S.Union([ChangedPreview])
type PreviewMessage = typeof PreviewMessage.Type

const ta = (
  id: string,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
  extra?: Partial<Parameters<typeof Textarea.textarea<PreviewMessage>>[0]>,
): Html =>
  Textarea.textarea(
    {
      id,
      value: model.values[id] ?? '',
      onInput: value => ChangedPreview({ id, value }),
      ...(extra ?? {}),
    },
    h,
  )

export const textareaTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = textareaFixtures[index] ?? textareaFixtures[0]
    return {
      _docsPage: 'textarea',
      values: Object.fromEntries(
        fixture.textareaIds.map(id => [
          id,
          fixture.kind === 'formResize' ? 'First line\nSecond line' : '',
        ]),
      ),
    }
  },
  update: (model, message): Update.Return<PreviewModel, PreviewMessage> => {
    switch (message._tag) {
      case 'ChangedTextareaPreview':
        return {
          model: {
            ...model,
            values: { ...model.values, [message.id]: message.value },
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = textareaFixtures[index] ?? textareaFixtures[0]
    switch (fixture.kind) {
      case 'demo':
        return ta('textarea-demo', model, h, {
          placeholder: 'Type your message here.',
        })
      case 'field':
        return Field.field(
          {
            children: [
              Field.fieldLabel(
                { for: 'textarea-message', children: ['Message'] },
                h,
              ),
              Field.fieldDescription(
                { children: ['Enter your message below.'] },
                h,
              ),
              ta('textarea-message', model, h, {
                placeholder: 'Type your message here.',
              }),
            ],
          },
          h,
        )
      case 'disabled':
        return Field.field(
          {
            isDisabled: true,
            children: [
              Field.fieldLabel(
                { for: 'textarea-disabled', children: ['Message'] },
                h,
              ),
              ta('textarea-disabled', model, h, {
                placeholder: 'Type your message here.',
                isDisabled: true,
              }),
            ],
          },
          h,
        )
      case 'invalid':
        return Field.field(
          {
            isInvalid: true,
            children: [
              Field.fieldLabel(
                { for: 'textarea-invalid', children: ['Message'] },
                h,
              ),
              ta('textarea-invalid', model, h, {
                placeholder: 'Type your message here.',
                isInvalid: true,
              }),
              Field.fieldDescription(
                { children: ['Please enter a valid message.'] },
                h,
              ),
            ],
          },
          h,
        )
      case 'button':
        return h.div(
          [h.Class('grid w-full gap-2')],
          [
            ta('textarea-button', model, h, {
              placeholder: 'Type your message here.',
            }),
            Button.button({ children: ['Send message'] }, h),
          ],
        )
      case 'rtl':
        return Field.field(
          {
            direction: 'rtl',
            class: 'w-full max-w-xs',
            children: [
              Field.fieldLabel({ for: 'feedback', children: ['التعليقات'] }, h),
              ta('feedback', model, h, {
                placeholder: 'تعليقاتك تساعدنا على التحسين...',
                direction: 'rtl',
                rows: 4,
              }),
              Field.fieldDescription(
                { children: ['شاركنا أفكارك حول خدمتنا.'] },
                h,
              ),
            ],
          },
          h,
        )
      case 'formResize':
        return h.div(
          [h.Class('grid w-full max-w-md gap-2')],
          [
            h.form([h.Id('textarea-profile')], []),
            ta('profile-notes', model, h, {
              label: 'Deployment notes',
              name: 'notes',
              form: 'textarea-profile',
              rows: 5,
              wrap: 'hard',
              resize: 'none',
              isReadOnly: true,
            }),
          ],
        )
    }
  },
})
