import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { switchFixtures } from '@/docs/components/pages/switch/shared'
import { taggedStruct } from 'foldkit/schema'
import * as Field from '@/ui/field'
import * as Label from '@/ui/label'
import * as Switch from '@/ui/switch'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('switch'),
  states: S.Record(S.String, S.Boolean),
})
type PreviewModel = typeof PreviewModel.Type

const ToggledPreview = taggedStruct('ToggledSwitchPreview', {
  id: S.String,
  isChecked: S.Boolean,
})
const PreviewMessage = S.Union([ToggledPreview])
type PreviewMessage = typeof PreviewMessage.Type

const sw = (
  id: string,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
  extra?: Partial<Parameters<typeof Switch.switchControl<PreviewMessage>>[0]>,
): Html =>
  Switch.switchControl(
    {
      id,
      isChecked: model.states[id] ?? false,
      onToggle: isChecked => ToggledPreview({ id, isChecked }),
      ...(extra ?? {}),
    },
    h,
  )

const descriptionField = (
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
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
      class: 'w-full max-w-sm',
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
        sw(switchId, model, h, {
          ...(direction === undefined ? {} : { direction }),
          ...(isInvalid ? { isInvalid: true } : {}),
        }),
      ],
    },
    h,
  )
}

const choiceCard = (
  id: string,
  titleText: string,
  descText: string,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
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
              sw(id, model, h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

export const switchTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = switchFixtures[index] ?? switchFixtures[0]
    return {
      _docsPage: 'switch',
      states: Object.fromEntries(
        fixture.switchIds.map(id => [id, fixture.checkedIds.includes(id)]),
      ),
    }
  },
  update: (model, message): Update.Return<PreviewModel, PreviewMessage> => {
    switch (message._tag) {
      case 'ToggledSwitchPreview':
        return {
          model: {
            ...model,
            states: { ...model.states, [message.id]: message.isChecked },
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = switchFixtures[index] ?? switchFixtures[0]
    switch (fixture.kind) {
      case 'demo':
        return h.div(
          [h.Class('flex items-center gap-2')],
          [
            sw('airplane-mode', model, h),
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
        return descriptionField(model, h, undefined, false)
      case 'choiceCard':
        return Field.fieldGroup(
          {
            class: 'w-full max-w-sm',
            children: [
              choiceCard(
                'switch-share',
                'Share across devices',
                'Focus is shared across devices, and turns off when you leave the app.',
                model,
                h,
              ),
              choiceCard(
                'switch-notifications',
                'Enable notifications',
                'Receive notifications when focus mode is enabled or disabled.',
                model,
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
            class: 'w-fit',
            children: [
              sw('switch-disabled-unchecked', model, h, { isDisabled: true }),
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
        return descriptionField(model, h, undefined, true)
      case 'size':
        return Field.fieldGroup(
          {
            class: 'w-40',
            children: [
              Field.field(
                {
                  orientation: 'horizontal',
                  children: [
                    sw('switch-size-sm', model, h, { size: 'sm' }),
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
                    sw('switch-size-default', model, h, { size: 'default' }),
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
        return descriptionField(model, h, 'rtl', false)
    }
  },
})
