import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { textareaFixtures } from '@/docs/components/pages/textarea/shared'
import * as Button from '@/stylex/button'
import * as Field from '@/stylex/field'
import { className } from '@/stylex/style'
import * as Textarea from '@/stylex/textarea'

const styles = stylex.create({
  wide: {
    maxWidth: '20rem',
    width: '100%',
  },
  stack: {
    gap: '0.5rem',
    display: 'grid',
    width: '100%',
  },
  stackWide: {
    gap: '0.5rem',
    display: 'grid',
    maxWidth: '28rem',
    width: '100%',
  },
})

interface TextareaPreviewShape {
  readonly values: Readonly<Record<string, string>>
}

const ta = <Msg>(
  id: string,
  shape: TextareaPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  extra?: Partial<Parameters<typeof Textarea.textarea<Msg>>[0]>,
): Html =>
  Textarea.textarea(
    {
      id,
      value: shape.values[id] ?? '',
      onInput: value =>
        onMessageJson(
          JSON.stringify({ _tag: 'ChangedTextareaPreview', id, value }),
        ),
      ...(extra ?? {}),
    },
    h,
  )

export const textareaStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const shape = model as TextareaPreviewShape
  const fixture = textareaFixtures[exampleIndex] ?? textareaFixtures[0]
  switch (fixture.kind) {
    case 'demo':
      return ta('textarea-demo', shape, onMessageJson, h, {
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
            ta('textarea-message', shape, onMessageJson, h, {
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
            ta('textarea-disabled', shape, onMessageJson, h, {
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
            ta('textarea-invalid', shape, onMessageJson, h, {
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
        [h.Class(className(styles.stack))],
        [
          ta('textarea-button', shape, onMessageJson, h, {
            placeholder: 'Type your message here.',
          }),
          Button.button({ children: ['Send message'] }, h),
        ],
      )
    case 'rtl':
      return Field.field(
        {
          direction: 'rtl',
          layoutStyle: styles.wide,
          children: [
            Field.fieldLabel({ for: 'feedback', children: ['التعليقات'] }, h),
            ta('feedback', shape, onMessageJson, h, {
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
        [h.Class(className(styles.stackWide))],
        [
          h.form([h.Id('textarea-profile')], []),
          ta('profile-notes', shape, onMessageJson, h, {
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
}
