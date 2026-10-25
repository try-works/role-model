import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  accordionCardCopy,
  accordionFixtures,
  type AccordionFixture,
} from '@/docs/components/pages/accordion/shared'
import * as Accordion from '@/ui/accordion'
import * as Card from '@/ui/card'

const GotAccordionPreviewMessage = defineMessageUnion({
  GotAccordionPreviewMessage: {
    message: Accordion.Message,
  },
})
type GotAccordionPreviewMessage = typeof GotAccordionPreviewMessage.Type

const AccordionPreviewModel = S.Struct({
  _docsPage: S.Literal('accordion'),
  accordion: Accordion.Model,
  maybeLastToggledValue: S.Option(S.String),
})
type AccordionPreviewModel = typeof AccordionPreviewModel.Type

const fixtureViewInputs = (
  fixture: AccordionFixture,
): Accordion.ViewInputs => ({
  items: fixture.items,
  ...(fixture.kind === 'borders'
    ? { class: 'rounded-lg border', itemClass: 'border-b px-4 last:border-b-0' }
    : {}),
})

const fixtureView = <Msg>(
  fixture: AccordionFixture,
  accordionModel: Accordion.Model,
  toParentMessage: (message: Accordion.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const submodel = h.submodel({
    slotId: 'docs-accordion',
    model: accordionModel,
    view: Accordion.view,
    viewInputs: fixtureViewInputs(fixture),
    toParentMessage,
  })
  switch (fixture.kind) {
    case 'card':
      return Card.card(
        {
          class: 'mx-auto w-full max-w-sm',
          children: [
            Card.cardHeader(
              {
                children: [
                  Card.cardTitle({ children: [accordionCardCopy.title] }, h),
                  Card.cardDescription(
                    { children: [accordionCardCopy.description] },
                    h,
                  ),
                ],
              },
              h,
            ),
            Card.cardContent({ children: [submodel] }, h),
          ],
        },
        h,
      )
    case 'rtl':
      return h.div([h.Dir('rtl'), h.Class('w-full max-w-md')], [submodel])
    default:
      return submodel
  }
}

export const accordionTailwindPreviewProgram = definePreviewProgram<
  AccordionPreviewModel,
  GotAccordionPreviewMessage
>({
  Model: AccordionPreviewModel,
  Message: GotAccordionPreviewMessage,
  init: index => {
    const fixture = accordionFixtures[index] ?? accordionFixtures[0]
    return {
      _docsPage: 'accordion',
      accordion: Accordion.init({
        id: `docs-accordion-${String(index)}`,
        type: fixture.type,
        value: [...fixture.initialValue],
      }),
      maybeLastToggledValue: Option.none(),
    }
  },
  update: (model, message) => {
    const accordionOp__ = Accordion.update(model.accordion, message.message)
    const accordion = accordionOp__.model
    const commands = accordionOp__.commands ?? []
    const maybeToggle = Option.fromNullishOr(accordionOp__.outMessage)
    return {
      model: {
        ...model,
        accordion,
        maybeLastToggledValue: Option.match(maybeToggle, {
          onNone: () => model.maybeLastToggledValue,
          onSome: changed => Option.some(changed.toggledValue),
        }),
      },
      commands: Command.mapMessages(commands, next =>
        GotAccordionPreviewMessage.GotAccordionPreviewMessage({
          message: next,
        }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = accordionFixtures[index] ?? accordionFixtures[0]
    return h.div(
      [h.Class('w-full max-w-xl')],
      [
        fixtureView(
          fixture,
          model.accordion,
          message =>
            GotAccordionPreviewMessage.GotAccordionPreviewMessage({ message }),
          h,
        ),
      ],
    )
  },
})
