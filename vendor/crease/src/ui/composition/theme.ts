import type { Html, HtmlBuilder } from 'foldkit/html'
import type { SemanticThemeName } from '@/stylex/composition/theme'
export type { SemanticThemeName } from '@/stylex/composition/theme'
export const themeScope = <M>(
  props: Readonly<{
    children: ReadonlyArray<Html | string>
    theme?: SemanticThemeName | undefined
    /** Re-resolve every theme role against the `.dark` or light palette for this subtree. */
    colorScheme?: 'dark' | 'light' | undefined
  }>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.DataAttribute('semantic-theme', props.theme ?? 'default'),
      ...(props.colorScheme === undefined
        ? []
        : [h.DataAttribute('color-scheme', props.colorScheme)]),
      h.Class(
        `${
          props.colorScheme === 'dark'
            ? 'dark [color-scheme:dark] '
            : props.colorScheme === 'light'
              ? 'light [color-scheme:light] '
              : ''
        }${
          props.theme === 'compact'
            ? '[--block-space-md:0.75rem] [--block-space-sm:0.5rem] [--block-space-lg:1rem]'
            : props.theme === 'expressive'
              ? '[--block-space-md:1.25rem] [--block-space-sm:0.75rem] [--block-space-lg:2rem]'
              : '[--block-space-md:1rem] [--block-space-sm:0.75rem] [--block-space-lg:1.5rem]'
        }`,
      ),
    ],
    props.children,
  )
