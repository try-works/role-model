import { Style } from '@pleat/core'
import * as Button from '@/pleat/button'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  ALL_COLUMNS,
  COLUMNS,
  COUNTRIES,
  PERMISSIONS,
  STATUSES,
  TEAMS,
  multiSelectorFixtures,
} from '@/docs/components/pages/multi-selector/shared'
import * as MultiSelector from '@/pleat/multi-selector'
import { className } from '@/pleat/style'

const styles = {
  stack: Style.make({
    gap: '1rem',
    display: 'grid',
    maxWidth: '18.75rem',
    minWidth: '15rem',
    width: '100%',
  }),
  toolbar: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
}

type Preview = Readonly<{
  selectors: ReadonlyArray<MultiSelector.Model>
}>

export const multiSelectorPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = multiSelectorFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview

  const selectorAt = (
    slot: number,
    props: Omit<
      MultiSelector.MultiSelectorProps<Msg>,
      'model' | 'toParentMessage' | 'options'
    >,
    options: MultiSelector.MultiSelectorProps<Msg>['options'],
  ): Html =>
    MultiSelector.multiSelector(
      {
        model: preview.selectors[slot]!,
        toParentMessage: message =>
          onMessageJson(
            JSON.stringify({
              _tag: 'GotMultiSelectorMessage',
              slot,
              message,
            }),
          ),
        options,
        ...props,
      },
      h,
    )

  const stack = (children: ReadonlyArray<Html>): Html =>
    h.div([h.Class(className(styles.stack))], [...children])

  switch (fixture.kind) {
    case 'showcase':
      return stack([
        selectorAt(0, { label: 'Columns', placeholder: 'Select columns...' }, [
          ...COLUMNS,
        ]),
      ])
    case 'searchable':
      return stack([
        selectorAt(
          0,
          {
            label: 'Countries',
            placeholder: 'Select countries...',
            hasSearch: true,
            hasSelectAll: true,
          },
          [...COUNTRIES],
        ),
      ])
    case 'sectioned':
      return stack([
        selectorAt(
          0,
          { label: 'Permissions', placeholder: 'Select permissions...' },
          [...PERMISSIONS],
        ),
      ])
    case 'columns':
      return stack([
        selectorAt(
          0,
          {
            label: 'Columns',
            isLabelHidden: true,
            hasSelectAll: true,
            hasSearch: true,
            triggerDisplay: 'count',
            placeholder: 'Columns',
          },
          [...ALL_COLUMNS],
        ),
      ])
    case 'form':
      return stack([
        selectorAt(
          0,
          {
            label: 'Visible columns',
            description: 'Choose which columns to display in the table',
            hasSelectAll: true,
            isRequired: true,
            triggerDisplay: 'labels',
          },
          [...ALL_COLUMNS.slice(0, 5)],
        ),
        selectorAt(
          1,
          {
            label: 'Status filter',
            description: 'Filter by status',
            isOptional: true,
            triggerDisplay: 'badges',
            placeholder: 'All statuses',
          },
          [...STATUSES],
        ),
      ])
    case 'ghostToolbar':
      return h.div(
        [h.Class(className(styles.toolbar))],
        [
          Button.button(
            {
              variant: 'ghost',
              size: 'sm',
              buttonAttributes: [h.Type('button')],
              children: ['Refresh'],
            },
            h,
          ),
          selectorAt(
            0,
            {
              label: 'Columns',
              isLabelHidden: true,
              variant: 'ghost',
              triggerDisplay: 'labels',
              placeholder: 'Columns',
            },
            [...COLUMNS],
          ),
          selectorAt(
            1,
            {
              label: 'Status',
              isLabelHidden: true,
              variant: 'ghost',
              triggerDisplay: 'labels',
              placeholder: 'Status',
              status: {
                type: 'warning',
                message: 'Some filters hide archived rows',
              },
              statusVariant: 'tooltip',
            },
            [...STATUSES],
          ),
          Button.button(
            {
              variant: 'ghost',
              size: 'sm',
              buttonAttributes: [h.Type('button')],
              children: ['Export'],
            },
            h,
          ),
        ],
      )
    case 'bottomSheet':
      return stack([
        selectorAt(
          0,
          {
            label: 'Teams',
            hasSelectAll: true,
            presentation: 'bottom-sheet',
            placeholder: 'Choose teams',
          },
          [...TEAMS],
        ),
      ])
    default:
      return stack([])
  }
}
