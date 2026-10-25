import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  popoverFixtures,
  type PopoverFixture,
  type PopoverInstance,
} from '@/docs/components/pages/popover/shared'
import * as Field from '@/stylex/field'
import * as Input from '@/stylex/input'
import * as Popover from '@/stylex/popover'
import { className } from '@/stylex/style'

const styles = stylex.create({
  wrap: {
    gap: '1.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  wrapTight: {
    gap: '0.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  panel: { width: '10rem' },
  panelWide: { width: '16rem' },
  content: { gap: '0.5rem', display: 'grid' },
  contentWide: { gap: '1rem', display: 'grid' },
  heading: { fontWeight: 500 },
  copy: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  labelHalf: { width: '50%' },
})

interface PreviewShape {
  readonly popovers: Readonly<Record<string, Popover.Model>>
  readonly values: Readonly<Record<string, string>>
}

const popoverFor = <Msg>(
  id: string,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  extra: Omit<Popover.PopoverProps<Msg>, 'model' | 'toParentMessage'>,
  h: HtmlBuilder<Msg>,
): Html =>
  Popover.popover(
    {
      model:
        model.popovers[id] ??
        Popover.init({ id: `popover-${id}`, isAnimated: true }),
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotPopoverMessage', id, message }),
        ),
      ...extra,
    },
    h,
  )

const headerContent = <Msg>(rtl: boolean, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.content))],
    [
      h.h4(
        [h.Class(className(reset.text, styles.heading))],
        [rtl ? 'الأبعاد' : 'Dimensions'],
      ),
      h.p(
        [h.Class(className(reset.text, styles.copy))],
        [rtl ? 'تعيين الأبعاد للطبقة.' : 'Set the dimensions for the layer.'],
      ),
    ],
  )

const legacyView = <Msg>(
  index: number,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = popoverFixtures[index]
  const side = fixture?.kind === 'legacy' ? fixture.side : 'bottom'
  const align = fixture?.kind === 'legacy' ? fixture.align : 'start'
  return popoverFor(
    'main',
    model,
    onMessageJson,
    {
      trigger: 'Open dimensions',
      triggerButtonVariant: 'outline',
      side,
      align,
      focusSelector: '[data-slot=popover-content] input',
      content: h.div(
        [h.Class(className(styles.content))],
        [
          h.h4(
            [h.Class(className(reset.text, styles.heading))],
            ['Dimensions'],
          ),
          h.p(
            [h.Class(className(reset.text, styles.copy))],
            ['Set the dimensions for the layer.'],
          ),
          h.input([
            h.Class(className(reset.input)),
            h.Type('number'),
            h.AriaLabel('Width'),
          ]),
        ],
      ),
    },
    h,
  )
}

const formView = <Msg>(
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fieldInput = (id: string, label: string, value: string): Html =>
    Field.field(
      {
        orientation: 'horizontal',
        children: [
          Field.fieldLabel(
            { for: id, children: [label], layoutStyle: styles.labelHalf },
            h,
          ),
          Input.input(
            {
              id,
              value: model.values[id] ?? value,
              onInput: value =>
                onMessageJson(
                  JSON.stringify({ _tag: 'ChangedFieldInput', id, value }),
                ),
            },
            h,
          ),
        ],
      },
      h,
    )
  return popoverFor(
    'form',
    model,
    onMessageJson,
    {
      trigger: 'Open Popover',
      triggerButtonVariant: 'outline',
      align: 'start',
      layoutStyle: styles.panelWide,
      focusSelector: '[data-slot=popover-content] input',
      content: h.div(
        [h.Class(className(styles.contentWide))],
        [
          headerContent(false, h),
          h.div(
            [h.Class(className(styles.contentWide))],
            [
              fieldInput('width', 'Width', '100%'),
              fieldInput('height', 'Height', '25px'),
            ],
          ),
        ],
      ),
    },
    h,
  )
}

const instanceView = <Msg>(
  instance: PopoverInstance,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  popoverFor(
    instance.id,
    model,
    onMessageJson,
    {
      trigger: instance.trigger,
      triggerButtonVariant: 'outline',
      triggerButtonSize: 'sm',
      side: instance.side,
      align: instance.align,
      layoutStyle: styles.panel,
      ...(instance.rtl === true ? { direction: 'rtl' as const } : {}),
      content: instance.rtl === true ? headerContent(true, h) : instance.text,
    },
    h,
  )

export const popoverStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture: PopoverFixture = popoverFixtures[index] ?? popoverFixtures[0]
  switch (fixture.kind) {
    case 'legacy':
      return legacyView(index, preview, onMessageJson, h)
    case 'basic':
      return popoverFor(
        'basic',
        preview,
        onMessageJson,
        {
          trigger: 'Open Popover',
          triggerButtonVariant: 'outline',
          align: 'start',
          content: headerContent(false, h),
        },
        h,
      )
    case 'form':
      return formView(preview, onMessageJson, h)
    case 'align':
      return h.div(
        [h.Class(className(styles.wrap))],
        fixture.instances.map(instance =>
          instanceView(instance, preview, onMessageJson, h),
        ),
      )
    case 'rtl':
      return h.div(
        [h.Class(className(styles.wrapTight))],
        fixture.instances.map(instance =>
          instanceView(instance, preview, onMessageJson, h),
        ),
      )
  }
}
