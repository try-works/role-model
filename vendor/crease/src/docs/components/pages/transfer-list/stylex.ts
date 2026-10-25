import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { previewLayout } from '@/docs/components/preview-layout.stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { transferListFixtures } from '@/docs/components/pages/transfer-list/shared'
import * as TransferList from '@/stylex/transfer-list'

interface PreviewOption {
  readonly value: string
  readonly label: string
  readonly description?: string | undefined
  readonly group?: string | undefined
  readonly isTransferDisabled?: boolean | undefined
  readonly isReorderDisabled?: boolean | undefined
  readonly disabledMessage?: string | undefined
}

interface PreviewShape {
  readonly list: TransferList.Model
  readonly list2: TransferList.Model
  readonly options: ReadonlyArray<PreviewOption>
  readonly isReorderable: boolean
}

const cleanOptions = (
  rows: ReadonlyArray<PreviewOption>,
): ReadonlyArray<TransferList.TransferListOption> =>
  rows.map(row => ({
    value: row.value,
    label: row.label,
    ...(row.description === undefined ? {} : { description: row.description }),
    ...(row.group === undefined ? {} : { group: row.group }),
    ...(row.isTransferDisabled === undefined
      ? {}
      : { isTransferDisabled: row.isTransferDisabled }),
    ...(row.isReorderDisabled === undefined
      ? {}
      : { isReorderDisabled: row.isReorderDisabled }),
    ...(row.disabledMessage === undefined
      ? {}
      : { disabledMessage: row.disabledMessage }),
  }))

export const transferListStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = transferListFixtures[index] ?? transferListFixtures[0]
  const options = cleanOptions(preview.options)
  const toList = (message: TransferList.Message): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'GotListMessage', message }))
  const toList2 = (message: TransferList.Message): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'GotList2Message', message }))
  const first = TransferList.transferList(
    {
      model: preview.list,
      toParentMessage: toList,
      label: fixture.label,
      description: fixture.listDescription,
      options,
      selectedLabel: fixture.selectedLabel,
      availableLabel: fixture.availableLabel,
      ...(fixture.hasSearch === true ? { hasSearch: true } : {}),
      ...(fixture.searchLabel === undefined
        ? {}
        : { searchLabel: fixture.searchLabel }),
      ...(fixture.searchPlaceholder === undefined
        ? {}
        : { searchPlaceholder: fixture.searchPlaceholder }),
      isReorderable: preview.isReorderable,
      ...(fixture.hasSelectAll === true ? { hasSelectAll: true } : {}),
      ...(fixture.hasClear === true ? { hasClear: true } : {}),
      ...(fixture.selectedEmptyText === undefined
        ? {}
        : { selectedEmptyText: fixture.selectedEmptyText }),
      ...(fixture.availableEmptyText === undefined
        ? {}
        : { availableEmptyText: fixture.availableEmptyText }),
      ...(fixture.noResultsText === undefined
        ? {}
        : { noResultsText: fixture.noResultsText }),
    },
    h,
  )
  if (fixture.layout !== 'empty-pair') {
    return first
  }
  return h.div(
    [h.Class(className(previewLayout.stack))],
    [
      first,
      h.hr([h.Class(className(reset.rule, previewLayout.rule))]),
      TransferList.transferList(
        {
          model: preview.list2,
          toParentMessage: toList2,
          label: 'Report fields',
          description:
            'A query that matches nothing replaces both panels with the no-results copy.',
          options,
          selectedLabel: 'In report',
          availableLabel: 'Available',
          hasSearch: true,
          searchLabel: 'Search report fields',
          searchPlaceholder: 'Try a term that matches nothing',
          noResultsText: 'No field matches that search.',
        },
        h,
      ),
    ],
  )
}
