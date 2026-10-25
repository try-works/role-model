import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  resizableFixtures,
  type ResizableFixture,
} from '@/docs/components/pages/resizable/shared'
import * as Resizable from '@/pleat/resizable'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  group: layoutStyle({ height: '13rem', maxWidth: '28rem', width: '100%' }),
  groupTall: layoutStyle({ height: '16rem', maxWidth: '28rem', width: '100%' }),
  panel: Style.make({
    padding: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  }),
  label: Style.make({ fontWeight: 600 }),
}

interface PreviewShape {
  readonly panels: Resizable.Model
  readonly outer: Resizable.GroupModel
  readonly inner: Resizable.GroupModel
}

const label = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.div([h.Class(className(styles.panel, styles.label))], [text])

const singleView = <Msg>(
  fixture: Extract<ResizableFixture, { kind: 'single' }>,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Resizable.resizable(
    {
      model: model.panels,
      toParentMessage: message =>
        onMessageJson(JSON.stringify({ _tag: 'GotResizableMessage', message })),
      direction: fixture.direction,
      extent: 448,
      ...(fixture.withHandle ? { withHandle: true } : {}),
      ariaLabel: fixture.ariaLabel,
      layoutStyle: styles.groupTall,
      first: label(fixture.first, h),
      second: label(fixture.second, h),
    },
    h,
  )

const nestedView = <Msg>(
  fixture: Extract<ResizableFixture, { kind: 'nested' }>,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Resizable.resizableGroup(
    {
      model: model.outer,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotOuterGroupMessage', message }),
        ),
      direction: 'horizontal',
      ...(fixture.rtl ? { rtl: true } : {}),
      extent: 448,
      withHandles: true,
      layoutStyle: styles.group,
      panels: [
        label(fixture.first, h),
        Resizable.resizableGroup(
          {
            model: model.inner,
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({ _tag: 'GotInnerGroupMessage', message }),
              ),
            direction: 'vertical',
            ...(fixture.rtl ? { rtl: true } : {}),
            extent: 208,
            withHandles: true,
            panels: [label(fixture.second, h), label(fixture.third, h)],
          },
          h,
        ),
      ],
    },
    h,
  )

export const resizablePleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = resizableFixtures[index] ?? resizableFixtures[0]
  return fixture.kind === 'single'
    ? singleView(fixture, preview, onMessageJson, h)
    : nestedView(fixture, preview, onMessageJson, h)
}
