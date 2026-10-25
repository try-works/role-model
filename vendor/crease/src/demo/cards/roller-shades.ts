import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import * as Slider from '@/ui/slider'
import { toggleGroup } from '@/ui/toggle-group'

export const Model = S.Struct({
  position: Slider.Model,
  positionValue: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotPositionMessage: {
    message: Slider.Message,
  },
  SelectedPreset: { value: S.String },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const init = (): Model => ({
  position: Slider.init({
    id: 'roller-shades-position',
    min: 0,
    max: 100,
    step: 1,
  }),
  positionValue: 50,
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotPositionMessage: ({ message: childMessage }) => {
        const {
          model: position,
          commands: positionCommands__,
          outMessage: positionOut__,
        } = Slider.update(model.position, childMessage)
        const commands = positionCommands__ ?? []
        const maybeChange = Option.fromNullishOr(positionOut__)
        return {
          model: {
            ...model,
            position,
            positionValue: Option.match(maybeChange, {
              onNone: () => model.positionValue,
              onSome: change => change.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            Message.GotPositionMessage({ message: next }),
          ),
        }
      },
      SelectedPreset: ({ value }) => {
        const position =
          value === 'open'
            ? 0
            : value === 'half'
              ? 50
              : value === 'closed'
                ? 100
                : undefined

        return position === undefined
          ? { model: model }
          : {
              model: {
                ...model,
                positionValue: position,
              },
            }
      },
    }),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const preset =
    model.positionValue <= 10
      ? 'open'
      : model.positionValue >= 90
        ? 'closed'
        : 'half'

  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Living Room'] }, h),
              cardDescription({ children: ['Roller Shades'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex flex-col gap-4',
            children: [
              h.div(
                [
                  h.Class(
                    'flex h-32 flex-col overflow-hidden rounded-lg border bg-muted',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        'bg-muted-foreground transition-all duration-300',
                      ),
                      h.Style({ height: `${model.positionValue}%` }),
                    ],
                    [],
                  ),
                ],
              ),
              h.div(
                [h.Class('flex items-center gap-3')],
                [
                  h.span(
                    [
                      h.Class(
                        'text-xs font-medium tracking-wider text-muted-foreground uppercase',
                      ),
                    ],
                    ['Open'],
                  ),
                  Slider.slider(
                    {
                      model: model.position,
                      value: model.positionValue,
                      toParentMessage: message =>
                        Message.GotPositionMessage({ message }),
                      ariaLabel: 'Shade position',
                      class: 'flex-1',
                    },
                    h,
                  ),
                  h.span(
                    [
                      h.Class(
                        'text-xs font-medium tracking-wider text-muted-foreground uppercase',
                      ),
                    ],
                    ['Close'],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'py-2.5',
            children: [
              toggleGroup(
                {
                  value: preset,
                  onToggle: value => Message.SelectedPreset({ value }),
                  variant: 'outline',
                  class: 'w-full gap-1',
                  items: [
                    {
                      value: 'open',
                      class: 'flex-1 rounded-md border-l',
                      children: ['Open'],
                    },
                    {
                      value: 'half',
                      class: 'flex-1 rounded-md border-l',
                      children: ['Half'],
                    },
                    {
                      value: 'closed',
                      class: 'flex-1 rounded-md border-l',
                      children: ['Closed'],
                    },
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
// Stateful? yes. Submodels wired: position slider. PORT NOTEs: none.

// SUBSCRIPTIONS — slider drag needs document-level pointer subscriptions.

export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift({
    shadePositionPointer: Slider.subscriptions.dragPointer,
    shadePositionEscape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.position,
    toParentMessage: message => Message.GotPositionMessage({ message }),
  }),
)
