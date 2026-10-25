import { taggedStruct } from 'foldkit/schema'
import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import {
  canonicalComponentSlug,
  componentPage,
  componentTitle,
  example,
  hero,
  toSlug,
} from '@/docs/component-page'
import * as CopyFeedback from '@/docs/copy-feedback'
import * as CodeFile from '@/lib/code-file'
import type {
  ComponentKind,
  PageDefinitions,
  ExamplePreviewProvider,
} from '@/docs/components/page-definition'
import { componentApi } from '@/docs/generated-component-api'
import { authoredPages } from '@/docs/components/pages'
import { RoutedDocsPreviewMessage } from '@/docs/components/pages/authored-page'
import type { ErasedPreviewProgram } from '@/docs/components/pages/authored-page'
import { renderer } from '@/site/config'
const stylexExamplePreviewProviders = new Map<string, ExamplePreviewProvider>()

export const installExamplePreviewProvider = (
  slug: string,
  provider: ExamplePreviewProvider,
): void => {
  stylexExamplePreviewProviders.set(slug, provider)
}

const stylexPreviewViews = new Map<string, ErasedPreviewProgram['view']>()

/** Typed views preserve native payloads while sharing the page's update logic. */
export const installStyleXPreviewView = (
  slug: string,
  view: ErasedPreviewProgram['view'],
): void => {
  stylexPreviewViews.set(slug, view)
}

const pleatExamplePreviewProviders = new Map<string, ExamplePreviewProvider>()

export const installPleatExamplePreviewProvider = (
  slug: string,
  provider: ExamplePreviewProvider,
): void => {
  pleatExamplePreviewProviders.set(slug, provider)
}

const pleatPreviewViews = new Map<string, ErasedPreviewProgram['view']>()

export const installPleatPreviewView = (
  slug: string,
  view: ErasedPreviewProgram['view'],
): void => {
  pleatPreviewViews.set(slug, view)
}

const definitions: PageDefinitions = {
  ...Object.fromEntries(
    Object.values(authoredPages).map(page => [page.slug, page.definition]),
  ),
}

const EXAMPLE_STATE_COUNT = 32
const localPrograms = Object.values(authoredPages).flatMap(page =>
  page.previewProgram === undefined
    ? []
    : [{ slug: page.slug, program: page.previewProgram }],
)

export const Model = S.Struct({
  slug: S.String,
  examples: S.Array(S.Unknown),
  renderer: S.Literals(['tailwind', 'stylex', 'pleat']),
  copiedCode: CopyFeedback.Model,
})
export type Model = typeof Model.Type

export const GotExampleMessage = taggedStruct('GotCatalogExampleMessage', {
  index: S.Number,
  message: RoutedDocsPreviewMessage,
})
export const GotCodeFileMessage = taggedStruct('GotCatalogCodeFileMessage', {
  message: CodeFile.Message,
})
export const Message = S.Union([
  GotExampleMessage,
  GotCodeFileMessage,
  CopyFeedback.Message,
])
export type Message = typeof Message.Type

export const init = (slug?: string): Model => {
  const canonicalSlug = canonicalComponentSlug(slug ?? '')
  return {
    slug: canonicalSlug,
    // One spare slot at the end: the hero preview on top of the page re-renders
    // the first example but keeps its own state.
    examples: Array.from(
      {
        length:
          (definitions[canonicalSlug]?.examples.length ?? 0) === 0
            ? 0
            : (definitions[canonicalSlug]?.examples.length ?? 0) + 1,
      },
      (_, index) => {
        const program = authoredPages[canonicalSlug]?.previewProgram
        if (program === undefined)
          throw new Error(`Missing preview program for ${canonicalSlug}`)
        return program.init(index)
      },
    ),
    renderer,
    copiedCode: null,
  }
}

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  if (message._tag === 'GotCatalogCodeFileMessage') return { model: model }
  if (message._tag !== 'GotCatalogExampleMessage') {
    const { model: copiedCode, commands: copiedCodeCommands__ } =
      CopyFeedback.update(model.copiedCode, message)
    const commands = copiedCodeCommands__ ?? []
    return {
      model: { ...model, copiedCode },
      commands: Command.mapMessages(commands, next => next),
    }
  }

  const current = model.examples[message.index]
  if (current === undefined) return { model: model }

  const program = authoredPages[model.slug]?.previewProgram
  if (program === undefined) return { model: model }
  const { model: example, commands: exampleCommands__ } = program.update(
    current,
    message.message,
  )
  const commands = exampleCommands__ ?? []
  return {
    model: {
      examples: model.examples.map((candidate, index) =>
        index === message.index ? example : candidate,
      ),
      slug: model.slug,
      renderer: model.renderer,
      copiedCode: model.copiedCode,
    },
    commands: Command.mapMessages(commands, next =>
      GotExampleMessage({
        index: message.index,
        message: next as RoutedDocsPreviewMessage,
      }),
    ),
  }
}

export const subscriptions = Subscription.aggregate<Model, Message>()(
  ...localPrograms.flatMap(({ slug, program }, programIndex) => {
    const childSubscriptions = program.subscriptions
    return childSubscriptions === undefined
      ? []
      : Array.from({ length: EXAMPLE_STATE_COUNT }, (_, index) => {
          const lifted = Subscription.lift(childSubscriptions)<Model, Message>({
            toChildModel: model =>
              model.slug === slug
                ? (model.examples[index] ?? program.init(index))
                : program.init(index),
            toParentMessage: message =>
              GotExampleMessage({
                index,
                message: message as RoutedDocsPreviewMessage,
              }),
            // A lifted subscription must only fire while its own page is
            // active: GotExampleMessage is routed to authoredPages[model.slug],
            // so emitting on another page feeds it a foreign message shape.
            when: model => model.slug === slug,
          })
          return Object.fromEntries(
            Object.entries(lifted).map(([key, subscription]) => [
              `local${String(programIndex)}Example${String(index)}${key}`,
              subscription,
            ]),
          ) as Subscription.Subscriptions<Model, Message>
        })
  }),
)

export const hasCatalogPage = (slug: string): boolean =>
  componentTitle(slug) !== undefined

export const hasDedicatedDefinition = (slug: string): boolean =>
  definitions[slug] !== undefined

export const dedicatedExampleTitles = (slug: string): ReadonlyArray<string> =>
  definitions[slug]?.examples.map(config => config.title) ?? []

export const componentKind = (slug: string): ComponentKind | undefined => {
  const definition = definitions[slug]
  return definition === undefined ? undefined : kindFor(slug, definition)
}

export const titleFor = componentTitle
export { canonicalComponentSlug }

const exportOverrides: Readonly<Record<string, string>> = {
  'alert-dialog': 'alertDialog',
  'aspect-ratio': 'aspectRatio',
  'button-group': 'buttonGroup',
  'context-menu': 'contextMenu',
  'data-table': 'dataTable',
  'date-picker': 'datePicker',
  chart: 'barChart',
  'dropdown-menu': 'dropdownMenu',
  'hover-card': 'hoverCard',
  'input-group': 'inputGroup',
  'input-otp': 'inputOtp',
  'message-scroller': 'messageScroller',
  'native-select': 'nativeSelect',
  'navigation-menu': 'navigationMenu',
  'radio-group': 'radioGroup',
  'scroll-area': 'scrollArea',
  'toggle-group': 'toggleGroup',
  typography: 'typographyH1',
  switch: 'switchControl',
}

const primaryExport = (slug: string): string =>
  exportOverrides[slug] ??
  slug.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())

const recipeSlugs = new Set([
  'data-table',
  'date-picker',
  'form',
  'input-group',
  'sidebar',
  'toast',
  'typography',
])

const kindFor = (
  slug: string,
  definition: PageDefinitions[string],
): ComponentKind => {
  if (definition.kind !== undefined) return definition.kind
  if (recipeSlugs.has(slug)) return 'recipe'
  const exports = componentApi[slug] ?? []
  return exports.some(entry => entry.name === 'Model') &&
    exports.some(entry => entry.name === 'update')
    ? 'submodel'
    : 'helper'
}

const architectureFor = (kind: ComponentKind, name: string): string => {
  switch (kind) {
    case 'helper':
      return `${name} is view-only. Call its render helper directly inside your view; it does not add a child Model, Message, update branch, or h.submodel boundary.`
    case 'submodel':
      return `${name} owns interaction state. Store its Model in the parent, initialize it with the app, embed its Message, delegate update results and Commands, then render it through h.submodel.`
    case 'recipe':
      return `${name} composes source-owned Crease UI modules into an application pattern. Read the installed source as the public API and integrate stateful dependencies through the normal Foldkit update loop.`
  }
}

const compositionFor = (
  kind: ComponentKind,
  name: string,
  viewExport: string,
): string => {
  switch (kind) {
    case 'helper':
      return `${name}\n└── ${viewExport}(ViewConfig, HtmlBuilder) → Html`
    case 'submodel':
      return `${name}\n├── Model / init\n├── Message / update / Commands\n├── optional OutMessage\n└── h.submodel → ${viewExport} view`
    case 'recipe':
      return `${name}\n├── source-owned composition\n├── stateless helpers and/or child Models\n└── application Model / Message / update integration`
  }
}

const usageFor = (slug: string, name: string, kind: ComponentKind): string => {
  const namespace = name.replaceAll(' ', '')
  if (kind === 'helper') {
    return `import * as ${namespace} from '@/ui/${slug}'\n\nconst view = (model: Model, h: HtmlBuilder<Message>) =>\n  ${namespace}.${primaryExport(slug)}(viewConfig, h)`
  }
  if (kind === 'submodel') {
    const field = namespace[0]!.toLowerCase() + namespace.slice(1)
    return `import { Command } from 'foldkit'\nimport * as ${namespace} from '@/ui/${slug}'\n\n// Model and init\n${field}: ${namespace}.Model\n${field}: ${namespace}.init(initConfig)\n\n// Delegate the child update and lift its commands\nconst nextOp__ = ${namespace}.update(model.${field}, childMessage)\nreturn [\n  { ...model, ${field}: next },\n  Command.mapMessages(commands, message => Got${namespace}Message({ message })),\n]\n\n// Keep the child view behind a keyed submodel boundary\nh.submodel({\n  slotId: '${slug}',\n  model: model.${field},\n  view: ${namespace}.view,\n  viewInputs,\n  toParentMessage: message => Got${namespace}Message({ message }),\n})`
  }
  return `import * as ${namespace} from '@/ui/${slug}'\n\n// Recipes are installed as source. Compose their exports in your view and\n// wire stateful dependencies through the parent Model, Message, and update.\n${namespace}.${primaryExport(slug)}(viewConfig, h)`
}

export const view = (
  model: Model,
  slug: string,
  dark: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const name = componentTitle(slug)
  const definition = definitions[slug]

  if (name === undefined || definition === undefined) {
    throw new Error(`Missing dedicated documentation definition for ${slug}`)
  }
  const kind = kindFor(slug, definition)
  const stylexExamples = definition.stylexExamples
  const stylexExamplePreviewProvider = stylexExamplePreviewProviders.get(slug)
  const nativeStylexPreviewView = stylexPreviewViews.get(slug)
  const pleatExamples = definition.pleatExamples
  const pleatExamplePreviewProvider = pleatExamplePreviewProviders.get(slug)
  const nativePleatPreviewView = pleatPreviewViews.get(slug)
  if (
    model.renderer === 'stylex' &&
    (stylexExamples === undefined ||
      (stylexExamplePreviewProvider === undefined &&
        !stylexPreviewViews.has(slug)))
  ) {
    throw new Error(`Missing StyleX example parity for ${slug}`)
  }
  if (
    model.renderer === 'pleat' &&
    (pleatExamples === undefined ||
      (pleatExamplePreviewProvider === undefined &&
        !pleatPreviewViews.has(slug)))
  ) {
    throw new Error(`Missing pleat example parity for ${slug}`)
  }
  const authoredExamples =
    model.renderer === 'pleat' && pleatExamples !== undefined
      ? pleatExamples
      : model.renderer === 'stylex' && stylexExamples !== undefined
        ? stylexExamples
        : definition.examples
  const authoredProgram = authoredPages[slug]?.previewProgram

  // stateIndex selects the preview-model slot; contentIndex selects which
  // example fixture it renders — the hero reuses content 0 on a spare slot.
  const previewFor = (contentIndex: number, stateIndex: number): Html => {
    const program = authoredProgram
    if (program === undefined)
      throw new Error(`Missing preview program for ${slug}`)
    const exampleModel =
      model.examples[stateIndex] ?? program.init(contentIndex)
    const previewView = defineView<unknown, RoutedDocsPreviewMessage>(
      (previewModel, previewBuilder) =>
        model.renderer === 'stylex' && nativeStylexPreviewView !== undefined
          ? nativeStylexPreviewView(contentIndex, previewModel, previewBuilder)
          : model.renderer === 'pleat' && nativePleatPreviewView !== undefined
            ? nativePleatPreviewView(contentIndex, previewModel, previewBuilder)
            : program.view(contentIndex, previewModel, previewBuilder),
    )
    if (
      model.renderer === 'pleat' &&
      !pleatPreviewViews.has(slug) &&
      pleatExamples !== undefined &&
      pleatExamplePreviewProvider !== undefined
    ) {
      return h.submodel({
        slotId: `docs-${slug}-pleat-example-${String(stateIndex)}`,
        model: exampleModel,
        view: defineView<unknown, RoutedDocsPreviewMessage>(
          (pleatModel, pleatBuilder) =>
            pleatExamplePreviewProvider(
              contentIndex,
              pleatModel,
              messageJson =>
                RoutedDocsPreviewMessage.RoutedDocsPreviewMessage({
                  messageJson,
                }),
              pleatBuilder,
            ) ?? pleatBuilder.div([], []),
        ),
        toParentMessage: (message): Message =>
          GotExampleMessage({ index: stateIndex, message }),
      })
    }
    if (
      model.renderer === 'stylex' &&
      !stylexPreviewViews.has(slug) &&
      stylexExamples !== undefined &&
      stylexExamplePreviewProvider !== undefined
    ) {
      return h.submodel({
        slotId: `docs-${slug}-stylex-example-${String(stateIndex)}`,
        model: exampleModel,
        view: defineView<unknown, RoutedDocsPreviewMessage>(
          (stylexModel, stylexBuilder) =>
            stylexExamplePreviewProvider(
              contentIndex,
              stylexModel,
              messageJson =>
                RoutedDocsPreviewMessage.RoutedDocsPreviewMessage({
                  messageJson,
                }),
              stylexBuilder,
            ) ?? stylexBuilder.div([], []),
        ),
        toParentMessage: (message): Message =>
          GotExampleMessage({ index: stateIndex, message }),
      })
    }
    return h.submodel({
      slotId: `docs-${slug}-example-${String(stateIndex)}`,
      model: exampleModel,
      view: previewView,
      toParentMessage: (message): Message =>
        GotExampleMessage({ index: stateIndex, message }),
    })
  }

  const renderedExamples = authoredExamples
    .map((config, index) => ({ config, index }))
    .filter(({ config }) => config.heroOnly !== true)
    .map(({ config, index }) => {
      const exampleCode = config.code
      return example<Message>(
        {
          title: config.title,
          ...(config.sectionId === undefined
            ? {}
            : { sectionId: config.sectionId }),
          ...(config.description === undefined
            ? {}
            : { description: config.description }),
          preview: previewFor(index, index),
          code: exampleCode,
          onCopy: CopyFeedback.Message.ClickedDocsCopyCode({
            code: exampleCode,
          }),
          isCopied: model.copiedCode === exampleCode,
          dark,
          codeFileMessage: message => GotCodeFileMessage({ message }),
          ...(config.previewClass === undefined
            ? {}
            : { previewClass: config.previewClass }),
          ...(config.previewLayout === undefined
            ? {}
            : { previewLayout: config.previewLayout }),
        },
        h,
      )
    })

  const heroEntry =
    authoredExamples
      .map((config, index) => ({ config, index }))
      .find(({ config }) => config.heroOnly === true) ??
    (authoredExamples[0] === undefined
      ? undefined
      : { config: authoredExamples[0], index: 0 })
  const heroIndex = authoredExamples.length
  const heroExample =
    heroEntry === undefined
      ? undefined
      : hero<Message>(
          {
            title: heroEntry.config.title,
            keepIdsCanonical:
              heroEntry.config.heroOnly === true ||
              heroEntry.config.keepIdsCanonical === true,
            preview: previewFor(heroEntry.index, heroIndex),
            code: heroEntry.config.code,
            onCopy: CopyFeedback.Message.ClickedDocsCopyCode({
              code: heroEntry.config.code,
            }),
            isCopied: model.copiedCode === heroEntry.config.code,
            dark,
            codeFileMessage: message => GotCodeFileMessage({ message }),
            ...(heroEntry.config.previewClass === undefined
              ? {}
              : { previewClass: heroEntry.config.previewClass }),
            ...(heroEntry.config.previewLayout === undefined
              ? {}
              : { previewLayout: heroEntry.config.previewLayout }),
          },
          h,
        )

  return componentPage<Message>(
    {
      name,
      description: definition.description,
      kind,
      architecture: definition.architecture ?? architectureFor(kind, name),
      installation:
        renderer === 'tailwind'
          ? `npx shadcn@latest add Potti1234/creaseui/${slug}`
          : `npx shadcn@latest add Potti1234/creaseui/${renderer}-${slug}`,
      usage:
        model.renderer === 'tailwind'
          ? (definition.usage ?? usageFor(slug, name, kind))
          : (definition.usage ?? usageFor(slug, name, kind)).replaceAll(
              `@/ui/${slug}`,
              `@/${model.renderer}/${slug}`,
            ),
      ...(definition.sections === undefined
        ? {}
        : { sections: definition.sections }),
      ...(definition.styling === undefined
        ? {}
        : { styling: definition.styling }),
      ...(definition.accessibility === undefined
        ? {}
        : { accessibility: definition.accessibility }),
      ...(definition.keyboard === undefined
        ? {}
        : { keyboard: definition.keyboard }),
      copiedCode: model.copiedCode,
      onCopyCode: code => CopyFeedback.Message.ClickedDocsCopyCode({ code }),
      dark,
      codeFileMessage: message => GotCodeFileMessage({ message }),
      exampleTitles: authoredExamples
        .filter(example => example.heroOnly !== true)
        .map(
          example =>
            [
              example.sectionId ?? toSlug(example.title),
              example.title,
            ] as const,
        ),
      ...(heroExample === undefined ? {} : { heroExample }),
      sidebarScrolled: CopyFeedback.Message.ObservedDocsSidebarScroll(),
      renderer: model.renderer,
      composition:
        definition.composition ??
        compositionFor(kind, name, primaryExport(slug)),
      examples: renderedExamples,
      apiHref: definition.apiHref ?? 'https://foldkit.dev/ui/overview',
      sourceHref: `https://github.com/Potti1234/creaseui/blob/main/src/${model.renderer === 'tailwind' ? 'ui' : model.renderer}/${slug}.ts`,
      apiDescription:
        definition.apiDescription ??
        `${name} is source-owned after installation. Its public model, messages, update function, and view helpers are documented directly in the installed TypeScript source.`,
      apiEntries: componentApi[slug] ?? [],
    },
    h,
  )
}
