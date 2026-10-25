import type { Html, HtmlBuilder } from 'foldkit/html'

export type DocsExample = Readonly<{
  title: string
  description?: string
  staticPreview?: <Message>(
    model: Readonly<Record<string, never>>,
    h: HtmlBuilder<Message>,
  ) => Html
  code: string
  previewClass?: string
  previewLayout?: 'full-bleed'
  /** Rendered only as the page hero — no named example section. */
  heroOnly?: boolean
  /** When this example also renders as the page hero, keep its DOM ids
     canonical instead of -hero-suffixed. Required when the example's
     model already carries per-instance-unique ids that Foldkit Commands
     resolve against the DOM (sheets, drawers, dialogs, popovers,
     lightboxes, calendars, comboboxes) — rewriting them to -hero makes
     the hero's own Commands hit the named twin or nothing. */
  keepIdsCanonical?: boolean
  /** DOM anchor id override; defaults to the title slug. Needed when two
     sections share a title. */
  sectionId?: string
}>

export type ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => Html | undefined

export const rendererExamplesAreInParity = (
  slug: string,
  tailwindExamples: ReadonlyArray<DocsExample>,
  stylexExamples: ReadonlyArray<DocsExample>,
): boolean =>
  tailwindExamples.length === stylexExamples.length &&
  tailwindExamples.every((tailwindExample, index) => {
    const stylexExample = stylexExamples[index]
    return (
      stylexExample !== undefined &&
      tailwindExample.title === stylexExample.title &&
      tailwindExample.description === stylexExample.description &&
      tailwindExample.code.includes(`@/ui/${slug}`) &&
      stylexExample.code.includes(`@/stylex/${slug}`)
    )
  })

export type ComponentKind = 'helper' | 'submodel' | 'recipe'

export type DocsSection = Readonly<{
  id: string
  title: string
  description: string
  code?: string
}>

export type PageDefinition = Readonly<{
  description: string
  examples: ReadonlyArray<DocsExample>
  stylexExamples?: ReadonlyArray<DocsExample>
  pleatExamples?: ReadonlyArray<DocsExample>
  kind?: ComponentKind
  architecture?: string
  usage?: string
  sections?: ReadonlyArray<DocsSection>
  styling?: string
  accessibility?: string
  keyboard?: ReadonlyArray<readonly [key: string, behavior: string]>
  composition?: string
  apiHref?: string
  apiDescription?: string
}>

export type PageDefinitions = Readonly<Record<string, PageDefinition>>
