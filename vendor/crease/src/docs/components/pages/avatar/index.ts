import { authoredPage } from '@/docs/components/pages/authored-page'
import { avatarExamples } from '@/docs/components/pages/avatar/shared'
import { avatarTailwindPreviewProgram } from '@/docs/components/pages/avatar/tailwind'

export const avatarPage = authoredPage({
  slug: 'avatar',
  title: 'Avatar',
  kind: 'submodel',
  previewProgram: avatarTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Displays an identity image while explicitly tracking loading, loaded, and failed image states.',
    architecture:
      'Avatar image lifecycle is a small child Model. Store Avatar.Model in the parent, wrap load/error Messages, and delegate them through Avatar.update; visual fallback selection then stays pure.',
    apiHref: 'https://foldkit.dev/core/submodels',
    composition:
      'Avatar\n├── AvatarImage (child Model + Message)\n└── AvatarFallback',
    styling:
      'Choose a stable size for each context and use initials or a recognizable neutral mark as fallback content.',
    accessibility:
      'Image alt text names the represented person or object. The fallback remains visible while loading and after failure without producing duplicate image announcements.',
    examples: avatarExamples('tailwind'),
    stylexExamples: avatarExamples('stylex'),
    pleatExamples: avatarExamples('pleat'),
  },
})
