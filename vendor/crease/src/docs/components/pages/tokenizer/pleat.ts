import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import * as Button from '@/pleat/button'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  SKILLS,
  USERS,
  tokenizerFixtures,
} from '@/docs/components/pages/tokenizer/shared'
import * as Tokenizer from '@/pleat/tokenizer'
import { className } from '@/pleat/style'

const styles = {
  stack: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    maxWidth: '25rem',
    minWidth: 0,
    width: '100%',
  }),
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

type Preview = Readonly<{
  tokenizers: ReadonlyArray<Tokenizer.Model>
}>

export const tokenizerPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = tokenizerFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview

  const tokenizerAt = (
    slot: number,
    props: Omit<Tokenizer.TokenizerProps<Msg>, 'model' | 'toParentMessage'>,
  ): Html =>
    Tokenizer.tokenizer(
      {
        model: preview.tokenizers[slot]!,
        toParentMessage: message =>
          onMessageJson(
            JSON.stringify({
              _tag: 'GotTokenizerMessage',
              slot,
              message,
            }),
          ),
        ...props,
      },
      h,
    )

  const stack = (children: ReadonlyArray<Html>): Html =>
    h.div([h.Class(className(styles.stack))], [...children])
  const supporting = (text: string): Html =>
    h.p([h.Class(className(reset.text, styles.supporting))], [text])

  switch (fixture.kind) {
    case 'showcase':
      return stack([
        tokenizerAt(0, {
          label: 'Tags',
          placeholder: 'Search...',
          items: [],
          width: 400,
        }),
      ])
    case 'clear':
      return stack([
        supporting('Clear-all button appears when tokens are selected'),
        tokenizerAt(0, {
          label: 'Team Members',
          placeholder: 'Search people...',
          items: [...USERS],
          hasClear: true,
          width: 400,
        }),
      ])
    case 'creatable':
      return stack([
        supporting('Free-text only'),
        tokenizerAt(0, {
          label: 'Tags',
          placeholder: 'Type a tag and press Enter...',
          items: [],
          hasCreate: true,
          width: 400,
        }),
        supporting('Create or search'),
        tokenizerAt(1, {
          label: 'Team Members',
          placeholder: 'Search or type a new name...',
          items: [...USERS],
          hasCreate: true,
          hasEntriesOnFocus: true,
          width: 400,
        }),
      ])
    case 'endContent':
      return stack([
        supporting('Action button in the end slot'),
        tokenizerAt(0, {
          label: 'Team Members',
          placeholder: 'Search people...',
          items: [...USERS],
          endContent: Button.button(
            {
              variant: 'default',
              size: 'sm',
              buttonAttributes: [h.Type('button')],
              children: ['Apply'],
            },
            h,
          ),
          width: 400,
        }),
      ])
    case 'icon':
      return stack([
        supporting('Leading icon reinforces the search affordance'),
        tokenizerAt(0, {
          label: 'Team Members',
          placeholder: 'Search people...',
          items: [...USERS],
          hasStartIcon: true,
          width: 400,
        }),
      ])
    case 'maxEntries':
      return stack([
        supporting(
          `Limited to 3 selections — ${String(3 - (preview.tokenizers[0]?.tokens.length ?? 0))} remaining`,
        ),
        tokenizerAt(0, {
          label: 'Top Skills',
          description: 'Choose up to 3 skills',
          placeholder: 'Search skills...',
          items: [...SKILLS],
          maxEntries: 3,
          width: 400,
        }),
      ])
    case 'overflow':
      return stack([
        supporting('Inline overflow — content shifts down on expand'),
        tokenizerAt(0, {
          label: 'Inline Overflow',
          placeholder: 'Add more...',
          items: [...USERS],
          tokenOverflowBehavior: 'unfocusedInline',
          width: 400,
        }),
        supporting('Layer overflow — expands as overlay, no layout shift'),
        tokenizerAt(1, {
          label: 'Layer Overflow',
          placeholder: 'Add more...',
          items: [...USERS],
          tokenOverflowBehavior: 'unfocusedLayer',
          width: 400,
        }),
      ])
    case 'states':
      return stack(
        [
          {
            label: 'Disabled field',
            isDisabled: true,
          },
          {
            label: 'Error message',
            status: {
              type: 'error' as const,
              message: 'At least one reviewer is required',
            },
          },
          {
            label: 'Warning message',
            status: {
              type: 'warning' as const,
              message: 'Consider adding at least 2 approvers',
            },
          },
          {
            label: 'Success message',
            status: {
              type: 'success' as const,
              message: 'All required reviewers added',
            },
          },
        ].map((field, i) =>
          tokenizerAt(i, {
            label: field.label,
            placeholder: 'Search people...',
            items: [...USERS],
            isDisabled: 'isDisabled' in field && field.isDisabled,
            isRequired: i === 1,
            ...('status' in field ? { status: field.status } : {}),
            width: 400,
          }),
        ),
      )
    default:
      return stack([])
  }
}
