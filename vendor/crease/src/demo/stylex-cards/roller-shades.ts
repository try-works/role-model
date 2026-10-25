import * as stylex from '@stylexjs/stylex'
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
} from '@/stylex/card'
import * as Slider from '@/stylex/slider'
import { toggleGroup } from '@/stylex/toggle-group'
import { className } from '@/stylex/style'
import { cardTokens } from './complex-card-tokens.stylex'
import { tokens } from '../../stylex/tokens.stylex'
import { interactionTokens } from '../../stylex/interaction-tokens.stylex.const'

const styles = stylex.create({
  content: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  flex: { flexGrow: 1 },
  footer: { paddingBlock: '0.625rem' },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textTransform: 'uppercase',
  },
  shade: {
    borderColor: tokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: cardTokens.muted,
    display: 'flex',
    flexDirection: 'column',
    height: '8rem',
  },
  shadeFill: {
    backgroundColor: tokens.mutedForeground,
    transitionDuration: interactionTokens.motionSlow,
    transitionProperty: 'height',
  },
  sliderRow: { gap: '0.75rem', alignItems: 'center', display: 'flex' },
  toggle: { gap: '0.25rem', display: 'flex', width: '100%' },
})

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
            children: [
              h.div(
                [h.Class(className(styles.content))],
                [
                  h.div(
                    [h.Class(className(styles.shade))],
                    [
                      h.div(
                        [
                          h.Class(className(styles.shadeFill)),
                          h.Style({ height: `${model.positionValue}%` }),
                        ],
                        [],
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class(className(styles.sliderRow))],
                    [
                      h.span([h.Class(className(styles.label))], ['Open']),
                      Slider.slider(
                        {
                          model: model.position,
                          value: model.positionValue,
                          toParentMessage: message =>
                            Message.GotPositionMessage({ message }),
                          ariaLabel: 'Shade position',
                          layoutStyle: styles.flex,
                        },
                        h,
                      ),
                      h.span([h.Class(className(styles.label))], ['Close']),
                    ],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            children: [
              h.div(
                [h.Class(className(styles.footer))],
                [
                  h.div(
                    [h.Class(className(styles.toggle))],
                    [
                      toggleGroup(
                        {
                          value: preset,
                          onToggle: value => Message.SelectedPreset({ value }),
                          variant: 'outline',
                          items: [
                            {
                              value: 'open',
                              layoutStyle: styles.flex,
                              children: ['Open'],
                            },
                            {
                              value: 'half',
                              layoutStyle: styles.flex,
                              children: ['Half'],
                            },
                            {
                              value: 'closed',
                              layoutStyle: styles.flex,
                              children: ['Closed'],
                            },
                          ],
                        },
                        h,
                      ),
                    ],
                  ),
                ],
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
