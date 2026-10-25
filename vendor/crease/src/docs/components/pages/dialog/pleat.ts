import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  dialogFixtures,
  dialogLorem,
  dialogRtlFields,
  dialogShareUrl,
} from '@/docs/components/pages/dialog/shared'
import * as Button from '@/pleat/button'
import * as Dialog from '@/pleat/dialog'
import * as Field from '@/pleat/field'
import * as Input from '@/pleat/input'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  compact: layoutStyle({ maxWidth: '24rem' }),
  shareWidth: layoutStyle({ maxWidth: '28rem' }),
  scrollArea: Style.make({
    marginInline: '-1rem',
    paddingInline: '1rem',
    maxHeight: '50vh',
    overflowY: 'auto',
  }),
  lorem: Style.make({ lineHeight: 'normal', marginBlockEnd: '1rem' }),
  fieldGrid: Style.make({ gap: '1rem', display: 'grid' }),
  shareRow: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
  }),
  shareCol: Style.make({
    gap: '0.5rem',
    display: 'grid',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
  }),
  srOnly: Style.make({
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  }),
  copy: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
}

type PreviewModel = { name: string; username: string }

const scrollableContent = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.scrollArea))],
    Array.from({ length: 10 }).map((_, index) =>
      h.p(
        [h.Key(String(index)), h.Class(className(reset.text, styles.lorem))],
        [dialogLorem],
      ),
    ),
  )

const fieldRow = <Msg>(
  exampleIndex: number,
  model: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  field: (typeof dialogRtlFields)[number],
  rtl: boolean,
): Html =>
  Field.field(
    {
      children: [
        Field.fieldLabel(
          {
            for: `docs-dialog-${String(exampleIndex)}-${field.id}`,
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
                  id: `docs-dialog-${String(exampleIndex)}-${field.id}`,
                  value: field.id === 'name-1' ? model.name : model.username,
                  onInput: value =>
                    onMessageJson(
                      JSON.stringify(
                        field.id === 'name-1'
                          ? { _tag: 'ChangedName', value }
                          : { _tag: 'ChangedUsername', value },
                      ),
                    ),
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

const profileFields = <Msg>(
  exampleIndex: number,
  model: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  rtl: boolean,
): Html =>
  Field.fieldGroup(
    {
      children: dialogRtlFields.map(field =>
        fieldRow(exampleIndex, model, onMessageJson, h, field, rtl),
      ),
    },
    h,
  )

type Slots<Msg> = Parameters<NonNullable<Dialog.DialogProps<Msg>['footer']>>[0]

const outlineAction = <Msg>(
  slots: Slots<Msg>,
  label: string,
  initialFocus: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      ...slots.closeButton,
      ...(initialFocus ? slots.initialFocusAttributes() : []),
      h.Type('button'),
      h.Class(
        className(
          ...Button.buttonVisualStyles({ variant: 'outline', size: 'lg' }),
        ),
      ),
    ],
    [label],
  )

const primaryAction = <Msg>(
  slots: Slots<Msg>,
  label: string,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      ...slots.closeButton,
      h.Type('button'),
      h.Class(className(...Button.buttonVisualStyles({ size: 'lg' }))),
    ],
    [label],
  )

export const dialogPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = dialogFixtures[exampleIndex] ?? dialogFixtures[0]!
  const preview = model as PreviewModel & { dialog: Dialog.Model }
  const shared = {
    model: preview.dialog,
    toParentMessage: (message: Dialog.Message): Msg =>
      onMessageJson(
        JSON.stringify({ _tag: 'GotDialogPreviewMessage', message }),
      ),
    title: fixture.dialogTitle,
    ...(fixture.dialogDescription === undefined
      ? {}
      : { description: fixture.dialogDescription }),
  }
  const trigger = Button.button(
    {
      variant: fixture.triggerVariant,
      onClick: onMessageJson(JSON.stringify({ _tag: 'OpenedDialogPreview' })),
      children: [fixture.triggerLabel],
    },
    h,
  )
  let dialog: Html
  switch (fixture.kind) {
    case 'profile':
      dialog = Dialog.dialog(
        {
          ...shared,
          layoutStyle: styles.compact,
          content: () => [
            profileFields(exampleIndex, preview, onMessageJson, h, false),
          ],
          footer: slots => [
            outlineAction(slots, 'Cancel', true, h),
            primaryAction(slots, 'Save changes', h),
          ],
        },
        h,
      )
      break
    case 'compact':
      dialog = Dialog.dialog(
        {
          ...shared,
          layoutStyle: styles.compact,
          content: () => [
            h.p(
              [h.Class(className(reset.text, styles.copy))],
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
      break
    case 'share':
      dialog = Dialog.dialog(
        {
          ...shared,
          layoutStyle: styles.shareWidth,
          content: () => [
            h.div(
              [h.Class(className(styles.shareRow))],
              [
                h.div(
                  [h.Class(className(styles.shareCol))],
                  [
                    h.label(
                      [
                        h.For(`docs-dialog-${String(exampleIndex)}-link`),
                        h.Class(className(styles.srOnly)),
                      ],
                      ['Link'],
                    ),
                    Input.input(
                      {
                        id: `docs-dialog-${String(exampleIndex)}-link`,
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
      break
    case 'noClose':
      dialog = Dialog.dialog({ ...shared, showCloseButton: false }, h)
      break
    case 'sticky':
      dialog = Dialog.dialog(
        {
          ...shared,
          content: () => [scrollableContent(h)],
          footer: slots => [outlineAction(slots, 'Close', false, h)],
        },
        h,
      )
      break
    case 'scroll':
      dialog = Dialog.dialog(
        { ...shared, content: () => [scrollableContent(h)] },
        h,
      )
      break
    case 'rtl':
      dialog = Dialog.dialog(
        {
          ...shared,
          layoutStyle: styles.compact,
          layout: parts => [
            h.div(
              [h.Dir('rtl'), h.Class(className(styles.fieldGrid))],
              [
                parts.header({
                  children: [
                    parts.title({ children: [fixture.dialogTitle] }),
                    parts.description({
                      children: [fixture.dialogDescription ?? ''],
                    }),
                  ],
                }),
                profileFields(exampleIndex, preview, onMessageJson, h, true),
                parts.footer({
                  children: [
                    h.button(
                      [
                        ...parts.closeButtonAttributes,
                        ...parts.initialFocusAttributes(),
                        h.Type('button'),
                        h.Class(
                          className(
                            ...Button.buttonVisualStyles({
                              variant: 'outline',
                              size: 'lg',
                            }),
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
                          className(
                            ...Button.buttonVisualStyles({ size: 'lg' }),
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
      break
  }
  return h.div([], [trigger, dialog])
}
