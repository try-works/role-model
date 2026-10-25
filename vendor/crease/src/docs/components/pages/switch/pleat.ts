import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { switchFixtures } from '@/docs/components/pages/switch/shared'
import * as Field from '@/pleat/field'
import * as Label from '@/pleat/label'
import { className } from '@/pleat/style'
import * as Switch from '@/pleat/switch'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  row: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
  wide: layoutStyle({ maxWidth: '24rem', width: '100%' }),
  fit: layoutStyle({ width: 'fit-content' }),
  narrow: layoutStyle({ width: '10rem' }),
}

interface SwitchPreviewShape {
  readonly states: Readonly<Record<string, boolean>>
}

const sw = <Msg>(
  id: string,
  shape: SwitchPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  extra?: Partial<Parameters<typeof Switch.switchControl<Msg>>[0]>,
): Html =>
  Switch.switchControl(
    {
      id,
      isChecked: shape.states[id] ?? false,
      onToggle: isChecked =>
        onMessageJson(
          JSON.stringify({ _tag: 'ToggledSwitchPreview', id, isChecked }),
        ),
      ...(extra ?? {}),
    },
    h,
  )

const descriptionField = <Msg>(
  shape: SwitchPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  direction: 'ltr' | 'rtl' | undefined,
  isInvalid: boolean,
): Html => {
  const switchId =
    direction === 'rtl'
      ? 'switch-focus-mode-rtl'
      : isInvalid
        ? 'switch-terms'
        : 'switch-focus-mode'
  return Field.field(
    {
      orientation: 'horizontal',
      ...(direction === undefined ? {} : { direction }),
      ...(isInvalid ? { isInvalid: true } : {}),
      layoutStyle: styles.wide,
      children: [
        Field.fieldContent(
          {
            children: [
              Field.fieldLabel(
                {
                  id: `${switchId}-label`,
                  for: `${switchId}-control`,
                  children:
                    direction === 'rtl'
                      ? ['المشاركة عبر الأجهزة']
                      : isInvalid
                        ? ['Accept terms and conditions']
                        : ['Share across devices'],
                },
                h,
              ),
              Field.fieldDescription(
                {
                  children:
                    direction === 'rtl'
                      ? [
                          'يتم مشاركة التركيز عبر الأجهزة، ويتم إيقاف تشغيله عند مغادرة التطبيق.',
                        ]
                      : isInvalid
                        ? [
                            'You must accept the terms and conditions to continue.',
                          ]
                        : [
                            'Focus is shared across devices, and turns off when you leave the app.',
                          ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        sw(switchId, shape, onMessageJson, h, {
          ...(direction === undefined ? {} : { direction }),
          ...(isInvalid ? { isInvalid: true } : {}),
        }),
      ],
    },
    h,
  )
}

const choiceCard = <Msg>(
  id: string,
  titleText: string,
  descText: string,
  shape: SwitchPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Field.fieldLabel(
    {
      id: `${id}-label`,
      for: `${id}-control`,
      children: [
        Field.field(
          {
            orientation: 'horizontal',
            children: [
              Field.fieldContent(
                {
                  children: [
                    Field.fieldTitle({ children: [titleText] }, h),
                    Field.fieldDescription({ children: [descText] }, h),
                  ],
                },
                h,
              ),
              sw(id, shape, onMessageJson, h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

export const switchPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const shape = model as SwitchPreviewShape
  const fixture = switchFixtures[exampleIndex] ?? switchFixtures[0]
  switch (fixture.kind) {
    case 'demo':
      return h.div(
        [h.Class(className(styles.row))],
        [
          sw('airplane-mode', shape, onMessageJson, h),
          Label.label(
            {
              id: 'airplane-mode-label',
              for: 'airplane-mode-control',
              children: ['Airplane Mode'],
            },
            h,
          ),
        ],
      )
    case 'description':
      return descriptionField(shape, onMessageJson, h, undefined, false)
    case 'choiceCard':
      return Field.fieldGroup(
        {
          layoutStyle: styles.wide,
          children: [
            choiceCard(
              'switch-share',
              'Share across devices',
              'Focus is shared across devices, and turns off when you leave the app.',
              shape,
              onMessageJson,
              h,
            ),
            choiceCard(
              'switch-notifications',
              'Enable notifications',
              'Receive notifications when focus mode is enabled or disabled.',
              shape,
              onMessageJson,
              h,
            ),
          ],
        },
        h,
      )
    case 'disabled':
      return Field.field(
        {
          orientation: 'horizontal',
          isDisabled: true,
          layoutStyle: styles.fit,
          children: [
            sw('switch-disabled-unchecked', shape, onMessageJson, h, {
              isDisabled: true,
            }),
            Field.fieldLabel(
              {
                id: 'switch-disabled-unchecked-label',
                for: 'switch-disabled-unchecked-control',
                children: ['Disabled'],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'invalid':
      return descriptionField(shape, onMessageJson, h, undefined, true)
    case 'size':
      return Field.fieldGroup(
        {
          layoutStyle: styles.narrow,
          children: [
            Field.field(
              {
                orientation: 'horizontal',
                children: [
                  sw('switch-size-sm', shape, onMessageJson, h, { size: 'sm' }),
                  Field.fieldLabel(
                    {
                      id: 'switch-size-sm-label',
                      for: 'switch-size-sm-control',
                      children: ['Small'],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Field.field(
              {
                orientation: 'horizontal',
                children: [
                  sw('switch-size-default', shape, onMessageJson, h, {
                    size: 'default',
                  }),
                  Field.fieldLabel(
                    {
                      id: 'switch-size-default-label',
                      for: 'switch-size-default-control',
                      children: ['Default'],
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
    case 'rtl':
      return descriptionField(shape, onMessageJson, h, 'rtl', false)
  }
}
