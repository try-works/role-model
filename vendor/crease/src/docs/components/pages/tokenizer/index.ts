import { authoredPage } from '@/docs/components/pages/authored-page'
import { tokenizerExamples } from '@/docs/components/pages/tokenizer/shared'
import { tokenizerTailwindPreviewProgram } from '@/docs/components/pages/tokenizer/tailwind'

export const tokenizerPage = authoredPage({
  slug: 'tokenizer',
  title: 'Tokenizer',
  kind: 'submodel',
  previewProgram: tokenizerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A multi-select input with token chips and typeahead search. Tokens render inline before the text input; selecting an item adds a token and clears the query.',
    architecture:
      'Tokenizer is a foldkit submodel. The child Model owns the committed token list plus an embedded foldkit Multi combobox for the input and anchored listbox; ChangedTokens OutMessages carry token add/remove. reflect/reflectItems sync externally-derived tokens and option labels.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/tokenizer.ts',
    styling:
      'The wrapper follows the input-group chrome — input border, 8px radius, inset border shadow on hover, accent ring on focus-within — and wraps chips + input in one flex-wrap row. Tokens are 4px-radius muted chips at the field height minus 8px, each with a 16px circular remove affordance. Overflow behaviors clip the chip row while unfocused.',
    accessibility:
      'The inner input is a combobox with an anchored listbox: arrow keys navigate options, Enter commits. Each token carries an aria-labelled remove button, and the clear-all control clears every token at once.',
    keyboard: [
      [
        'Type',
        'Filters the listbox items; with hasCreate a free-text "Create" row appears for unmatched text.',
      ],
      [
        'ArrowDown / Click',
        'Opens the anchored listbox while focus stays in the input.',
      ],
      [
        'Enter',
        'Commits the highlighted option as a token, or creates one from the typed query.',
      ],
      ['Escape', 'Closes the listbox and returns focus to the input.'],
      [
        'Token × / Clear all',
        'Removes one token or empties the selection, emitting ChangedTokens.',
      ],
    ],
    composition:
      'Parent Model\n├── Tokenizer child Model (tokens + embedded Multi combobox)\n└── ChangedTokens OutMessage → parent domain state\n    ├── hasCreate offers a free-text create row from the typed query\n    ├── maxEntries hides the input once the cap is reached\n    └── tokenOverflowBehavior collapses the chip row while unfocused',
    examples: tokenizerExamples('tailwind'),
    stylexExamples: tokenizerExamples('stylex'),
    pleatExamples: tokenizerExamples('pleat'),
  },
})
