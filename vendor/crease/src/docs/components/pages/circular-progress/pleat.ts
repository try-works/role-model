import { Style } from '@pleat/core'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  circularProgressFixtures,
  type CircularProgressItem,
} from '@/docs/components/pages/circular-progress/shared'
import { className } from '@/pleat/style'
import * as CircularProgress from '@/pleat/circular-progress'

const styles = {
  row: Style.make({
    gap: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  }),
}

const itemView = <Msg>(item: CircularProgressItem, h: HtmlBuilder<Msg>) =>
  CircularProgress.circularProgress(
    {
      label: item.label ?? 'Progress',
      isLabelHidden: item.isLabelHidden ?? true,
      ...(item.value === undefined ? {} : { value: item.value }),
      ...(item.max === undefined ? {} : { max: item.max }),
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.hasValueLabel === undefined
        ? {}
        : { hasValueLabel: item.hasValueLabel }),
      ...(item.formatValueLabel === undefined
        ? {}
        : {
            formatValueLabel: (value: number, max: number) => `${value}/${max}`,
          }),
      ...(item.isDisabled === undefined ? {} : { isDisabled: item.isDisabled }),
      ...(item.isIndeterminate === undefined
        ? {}
        : { isIndeterminate: item.isIndeterminate }),
    },
    h,
  )

export const circularProgressPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture =
    circularProgressFixtures[exampleIndex] ?? circularProgressFixtures[0]
  return fixture.layout === 'row'
    ? h.div(
        [h.Class(className(styles.row))],
        fixture.items.map(item => itemView(item, h)),
      )
    : h.div(
        [],
        fixture.items.map(item => itemView(item, h)),
      )
}
