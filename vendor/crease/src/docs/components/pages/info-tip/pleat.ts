import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  infoTipFixtures,
  type InfoTipFixture,
  type InfoTipSpec,
} from '@/docs/components/pages/info-tip/shared'
import * as InfoTip from '@/pleat/info-tip'
import { input } from '@/pleat/input'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  row: Style.make({
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  }),
  inline: Style.make({
    gap: '0.375rem',
    alignItems: 'center',
    display: 'flex',
  }),
  column: Style.make({
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  label: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  text: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  input: layoutStyle({ width: '14rem' }),
}

interface PreviewShape {
  readonly tips: Readonly<Record<string, InfoTip.Model>>
}

const tipView = <Msg>(
  tip: InfoTipSpec,
  shape: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  InfoTip.infoTip(
    {
      model: shape.tips[tip.id] ?? InfoTip.init({ id: tip.id }),
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag: 'GotDocsInfoTipMessage',
            id: tip.id,
            message,
          }),
        ),
      content: tip.content,
      ...(tip.label === undefined ? {} : { label: tip.label }),
      ...(tip.size === undefined ? {} : { size: tip.size }),
    },
    h,
  )

const bodyFor = <Msg>(
  fixture: InfoTipFixture,
  shape: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'sizes':
      return h.div(
        [h.Class(className(styles.row))],
        fixture.tips.map(tip => tipView(tip, shape, onMessageJson, h)),
      )
    case 'label':
      return h.div(
        [h.Class(className(styles.inline))],
        [
          h.span([h.Class(className(styles.text))], ['Active sessions']),
          tipView(fixture.tips[0]!, shape, onMessageJson, h),
        ],
      )
    case 'context':
      return h.div(
        [h.Class(className(styles.column))],
        [
          h.div(
            [h.Class(className(styles.inline))],
            [
              h.label([h.Class(className(styles.label))], ['Access level']),
              tipView(fixture.tips[0]!, shape, onMessageJson, h),
            ],
          ),
          input(
            {
              id: 'access-level',
              value: '',
              placeholder: 'Editor',
              layoutStyle: styles.input,
            },
            h,
          ),
        ],
      )
    case 'basic':
    default:
      return h.div(
        [h.Class(className(styles.inline))],
        [
          h.span([h.Class(className(styles.text))], ['Access level']),
          tipView(fixture.tips[0]!, shape, onMessageJson, h),
        ],
      )
  }
}

export const infoTipPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  bodyFor(
    infoTipFixtures[exampleIndex] ?? infoTipFixtures[0],
    model as PreviewShape,
    onMessageJson,
    h,
  )
