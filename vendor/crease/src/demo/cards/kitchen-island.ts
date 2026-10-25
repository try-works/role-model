import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/demo/icon-preview'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import {
  item,
  itemActions,
  itemContent,
  itemGroup,
  itemMedia,
  itemTitle,
} from '@/ui/item'
import * as Slider from '@/ui/slider'
import * as Switch from '@/ui/switch'
import { toggleGroup } from '@/ui/toggle-group'

type ScenePreset = Readonly<{
  brightness: number
  colorTemp: number
  volume: number
  fade: number
}>

const scenePreset = (scene: string): ScenePreset | undefined => {
  switch (scene) {
    case 'cooking':
      return { brightness: 90, colorTemp: 70, volume: 30, fade: 0 }
    case 'dining':
      return { brightness: 50, colorTemp: 40, volume: 20, fade: 60 }
    case 'nightlight':
      return { brightness: 15, colorTemp: 20, volume: 0, fade: 80 }
    case 'focus':
      return { brightness: 100, colorTemp: 85, volume: 0, fade: 0 }
    default:
      return undefined
  }
}

export const Model = S.Struct({
  isEnabled: S.Boolean,
  scene: S.String,
  brightness: Slider.Model,
  brightnessValue: S.Number,
  colorTemp: Slider.Model,
  colorTempValue: S.Number,
  volume: Slider.Model,
  volumeValue: S.Number,
  fade: Slider.Model,
  fadeValue: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledEnabled: { isChecked: S.Boolean },
  SelectedScene: { value: S.String },
  GotBrightnessMessage: {
    message: Slider.Message,
  },
  GotColorTempMessage: {
    message: Slider.Message,
  },
  GotVolumeMessage: {
    message: Slider.Message,
  },
  GotFadeMessage: {
    message: Slider.Message,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const init = (): Model => ({
  isEnabled: true,
  scene: 'cooking',
  brightness: Slider.init({
    id: 'kitchen-island-brightness',
    min: 0,
    max: 100,
    step: 1,
  }),
  brightnessValue: 90,
  colorTemp: Slider.init({
    id: 'kitchen-island-color-temp',
    min: 0,
    max: 100,
    step: 1,
  }),
  colorTempValue: 70,
  volume: Slider.init({
    id: 'kitchen-island-volume',
    min: 0,
    max: 100,
    step: 1,
  }),
  volumeValue: 30,
  fade: Slider.init({
    id: 'kitchen-island-fade',
    min: 0,
    max: 100,
    step: 1,
  }),
  fadeValue: 0,
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ToggledEnabled: ({ isChecked }) => ({
        model: { ...model, isEnabled: isChecked },
      }),
      SelectedScene: ({ value }) => {
        const preset = scenePreset(value)
        return preset === undefined
          ? { model: model }
          : {
              model: {
                ...model,
                scene: value,
                brightnessValue: preset.brightness,
                colorTempValue: preset.colorTemp,
                volumeValue: preset.volume,
                fadeValue: preset.fade,
              },
            }
      },
      GotBrightnessMessage: ({ message: childMessage }) => {
        const {
          model: brightness,
          commands: brightnessCommands__,
          outMessage: brightnessOut__,
        } = Slider.update(model.brightness, childMessage)
        const commands = brightnessCommands__ ?? []
        const maybeChange = Option.fromNullishOr(brightnessOut__)
        return {
          model: {
            ...model,
            brightness,
            brightnessValue: Option.match(maybeChange, {
              onNone: () => model.brightnessValue,
              onSome: change => change.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            Message.GotBrightnessMessage({ message: next }),
          ),
        }
      },
      GotColorTempMessage: ({ message: childMessage }) => {
        const {
          model: colorTemp,
          commands: colorTempCommands__,
          outMessage: colorTempOut__,
        } = Slider.update(model.colorTemp, childMessage)
        const commands = colorTempCommands__ ?? []
        const maybeChange = Option.fromNullishOr(colorTempOut__)
        return {
          model: {
            ...model,
            colorTemp,
            colorTempValue: Option.match(maybeChange, {
              onNone: () => model.colorTempValue,
              onSome: change => change.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            Message.GotColorTempMessage({ message: next }),
          ),
        }
      },
      GotVolumeMessage: ({ message: childMessage }) => {
        const {
          model: volume,
          commands: volumeCommands__,
          outMessage: volumeOut__,
        } = Slider.update(model.volume, childMessage)
        const commands = volumeCommands__ ?? []
        const maybeChange = Option.fromNullishOr(volumeOut__)
        return {
          model: {
            ...model,
            volume,
            volumeValue: Option.match(maybeChange, {
              onNone: () => model.volumeValue,
              onSome: change => change.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            Message.GotVolumeMessage({ message: next }),
          ),
        }
      },
      GotFadeMessage: ({ message: childMessage }) => {
        const {
          model: fade,
          commands: fadeCommands__,
          outMessage: fadeOut__,
        } = Slider.update(model.fade, childMessage)
        const commands = fadeCommands__ ?? []
        const maybeChange = Option.fromNullishOr(fadeOut__)
        return {
          model: {
            ...model,
            fade,
            fadeValue: Option.match(maybeChange, {
              onNone: () => model.fadeValue,
              onSome: change => change.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            Message.GotFadeMessage({ message: next }),
          ),
        }
      },
    }),
  )

const setting = (
  iconName: string,
  title: string,
  control: Html,
  h: HtmlBuilder<Message>,
): Html => {
  return item(
    {
      size: 'sm',
      variant: 'outline',
      children: [
        itemMedia(
          {
            variant: 'icon',
            class: 'size-4',
            children: [Icon.icon(iconName, {}, h)],
          },
          h,
        ),
        itemContent(
          {
            class: 'flex-row items-center gap-3',
            children: [itemTitle({ class: 'shrink-0', children: [title] }, h)],
          },
          h,
        ),
        itemActions({ class: 'flex-1', children: [control] }, h),
      ],
    },
    h,
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isDisabled = !model.isEnabled

  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Kitchen Island'] }, h),
              cardDescription({ children: ['Hue Color Ambient'] }, h),
              cardAction(
                {
                  // PORT NOTE: the foldkit switch wrapper always includes a label;
                  // the source has a control-only switch, so its label wrapper is
                  // visually hidden here while retaining accessible text.
                  class: '[&>div>div]:sr-only',
                  children: [
                    Switch.switch(
                      {
                        id: 'kitchen-island-enabled',
                        isChecked: model.isEnabled,
                        onToggle: isChecked =>
                          Message.ToggledEnabled({ isChecked }),
                        label: 'Kitchen Island enabled',
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
        ),
        cardContent(
          {
            class: 'flex flex-col gap-4',
            children: [
              h.div(
                [h.Class('flex flex-col gap-2')],
                [
                  h.span([h.Class('sr-only')], ['Scenes']),
                  toggleGroup(
                    {
                      value: model.scene,
                      onToggle: value => Message.SelectedScene({ value }),
                      variant: 'outline',
                      class: 'flex-wrap gap-1',
                      items: [
                        {
                          value: 'cooking',
                          class: 'rounded-md border-l',
                          children: ['Cooking'],
                          isDisabled,
                        },
                        {
                          value: 'dining',
                          class: 'rounded-md border-l',
                          children: ['Dining'],
                          isDisabled,
                        },
                        {
                          value: 'nightlight',
                          class: 'rounded-md border-l',
                          children: ['Nightlight'],
                          isDisabled,
                        },
                        {
                          value: 'focus',
                          class: 'rounded-md border-l',
                          children: ['Focus'],
                          isDisabled,
                        },
                      ],
                    },
                    h,
                  ),
                ],
              ),
              itemGroup(
                {
                  class: 'gap-2.5',
                  children: [
                    setting(
                      'sun',
                      'Brightness',
                      Slider.slider(
                        {
                          model: model.brightness,
                          value: model.brightnessValue,
                          toParentMessage: message =>
                            Message.GotBrightnessMessage({ message }),
                          ariaLabel: 'Brightness',
                          isDisabled,
                          class: 'w-full',
                        },
                        h,
                      ),
                      h,
                    ),
                    setting(
                      'thermometer',
                      'Color Temp',
                      Slider.slider(
                        {
                          model: model.colorTemp,
                          value: model.colorTempValue,
                          toParentMessage: message =>
                            Message.GotColorTempMessage({ message }),
                          ariaLabel: 'Color Temp',
                          isDisabled,
                        },
                        h,
                      ),
                      h,
                    ),
                    setting(
                      'volume-2',
                      'Volume',
                      Slider.slider(
                        {
                          model: model.volume,
                          value: model.volumeValue,
                          toParentMessage: message =>
                            Message.GotVolumeMessage({ message }),
                          ariaLabel: 'Volume',
                          isDisabled,
                        },
                        h,
                      ),
                      h,
                    ),
                    setting(
                      'timer',
                      'Fade',
                      Slider.slider(
                        {
                          model: model.fade,
                          value: model.fadeValue,
                          toParentMessage: message =>
                            Message.GotFadeMessage({ message }),
                          ariaLabel: 'Fade',
                          isDisabled,
                        },
                        h,
                      ),
                      h,
                    ),
                  ],
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
}

/*
Minimal wiring:
const model = init()
const next = update(model, message)
const cardView = view(next.model)
*/
// Stateful? yes. Submodels wired: switch and four sliders. PORT NOTEs: visually hidden switch label.

// SUBSCRIPTIONS — slider drag needs document-level pointer subscriptions.

export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift({
    brightnessPointer: Slider.subscriptions.dragPointer,
    brightnessEscape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.brightness,
    toParentMessage: message => Message.GotBrightnessMessage({ message }),
  }),
  Subscription.lift({
    colorTempPointer: Slider.subscriptions.dragPointer,
    colorTempEscape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.colorTemp,
    toParentMessage: message => Message.GotColorTempMessage({ message }),
  }),
  Subscription.lift({
    volumePointer: Slider.subscriptions.dragPointer,
    volumeEscape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.volume,
    toParentMessage: message => Message.GotVolumeMessage({ message }),
  }),
  Subscription.lift({
    fadePointer: Slider.subscriptions.dragPointer,
    fadeEscape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.fade,
    toParentMessage: message => Message.GotFadeMessage({ message }),
  }),
)
