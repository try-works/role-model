import { Style } from '@pleat/core'
import { previewLayout } from '@/docs/components/preview-layout.pleat'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  accordionCardCopy,
  accordionFixtures,
  type AccordionFixture,
} from '@/docs/components/pages/accordion/shared'
import * as Accordion from '@/pleat/accordion'
import * as Card from '@/pleat/card'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  card: layoutStyle({ maxWidth: '24rem', width: '100%', marginInline: 'auto' }),
  frame: Style.make({ maxWidth: '28rem', width: '100%' }),
}

const fixtureView = <Msg>(
  fixture: AccordionFixture,
  accordionModel: Accordion.Model,
  toParentMessage: (message: Accordion.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const submodel = h.submodel({
    slotId: 'docs-pleat-accordion',
    model: accordionModel,
    view: Accordion.view,
    viewInputs: {
      items: fixture.items,
      ...(fixture.kind === 'borders' ? { bordered: true } : {}),
    },
    toParentMessage,
  })
  switch (fixture.kind) {
    case 'card':
      return Card.card(
        {
          layoutStyle: styles.card,
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
      return h.div([h.Dir('rtl'), h.Class(className(styles.frame))], [submodel])
    default:
      return submodel
  }
}

export const accordionPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = accordionFixtures[exampleIndex] ?? accordionFixtures[0]
  return h.div(
    [h.Class(className(previewLayout.wide))],
    [
      fixtureView(
        fixture,
        (model as { accordion: Accordion.Model }).accordion,
        message =>
          onMessageJson(
            JSON.stringify({
              _tag: 'GotAccordionPreviewMessage',
              message,
            }),
          ),
        h,
      ),
    ],
  )
}
