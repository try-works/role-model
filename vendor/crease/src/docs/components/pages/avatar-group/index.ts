import { authoredPage } from '@/docs/components/pages/authored-page'
import { avatarGroupExamples } from '@/docs/components/pages/avatar-group/shared'
import { avatarGroupTailwindPreviewProgram } from '@/docs/components/pages/avatar-group/tailwind'

export const avatarGroupPage = authoredPage({
  slug: 'avatar-group',
  title: 'Avatar Group',
  kind: 'recipe',
  previewProgram: avatarGroupTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'A facepile: overlapping avatars with a shared ring, an optional "+N" overflow chip, and per-avatar status dots.',
    architecture:
      'The group sets `--avatar-group-overlap` from the shared size (25% overlap) and gives member avatars their ring. `avatarGroupOverflow` renders the trailing count (as a button when `onClick` is set); `avatarStatusDot` is a corner overlay you position over an avatar.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/avatar-group.ts',
    usage:
      "StyleX cannot style child avatars, so member `Avatar.avatar` calls take `ring: true` and `layoutStyle: { marginInlineStart: 'var(--avatar-group-overlap)' }` — the variable is set by the group.",
    accessibility:
      'The group carries role="group" with an accessible name; each status dot is role="img" with its own label when given one.',
    examples: avatarGroupExamples('tailwind'),
    stylexExamples: avatarGroupExamples('stylex'),
    pleatExamples: avatarGroupExamples('pleat'),
  },
})
