import { authoredPage } from '@/docs/components/pages/authored-page'
import { dropdownMenuExamples } from '@/docs/components/pages/dropdown-menu/shared'
import { dropdownMenuTailwindPreviewProgram } from '@/docs/components/pages/dropdown-menu/tailwind'

export const dropdownMenuPage = authoredPage({
  slug: 'dropdown-menu',
  title: 'Dropdown Menu',
  kind: 'submodel',
  previewProgram: dropdownMenuTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Presents a keyboard-navigable set of actions from a button trigger.',
    architecture:
      'A skin-neutral behavior module owns disclosure, active item, disabled traversal, typeahead, submenu routing, context anchoring, and selection. Use create<Action>() so the Selected OutMessage is typed; skins only project semantic parts and visual tokens.',
    apiHref: 'https://foldkit.dev/ui/menu',
    composition:
      'Parent Model\n├── Dropdown Menu child Model\n├── optional last domain action\n└── menu view\n    ├── trigger\n    ├── items / checked items\n    ├── shortcuts\n    └── optional submenu',
    styling:
      'Use destructive treatment only for destructive actions and separate unrelated groups. Shortcut labels are hints, not event handlers.',
    accessibility:
      'The menu implements menu/menuitem roles, deterministic trigger/content relationships, roving active state, disabled items, typeahead, mirrored RTL submenu keys, outside dismissal, and Escape dismissal. The trigger needs a clear accessible name.',
    keyboard: [
      ['Enter / Space', 'Opens the menu or selects the active action.'],
      ['Arrow Up / Down', 'Moves among enabled items.'],
      ['Arrow Right / Left', 'Opens or closes a submenu.'],
      ['Escape', 'Closes the complete menu tree.'],
    ],
    examples: dropdownMenuExamples('tailwind'),
    stylexExamples: dropdownMenuExamples('stylex'),
    pleatExamples: dropdownMenuExamples('pleat'),
  },
})
