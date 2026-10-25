import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type AttachmentItemSpec = Readonly<{
  name: string
  meta?: string
  icon?: string
  spinner?: boolean
  src?: string
  alt?: string
  state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done'
  size?: 'default' | 'sm' | 'xs'
  orientation?: 'vertical'
  actions: ReadonlyArray<Readonly<{ icon: string; label: string }>>
  triggerLabel?: string
}>

export type AttachmentRowSpec = Readonly<{
  /** Const name used for the row's item array in generated code. */
  name: string
  /** Wrap the row's items in Attachment.attachmentGroup. */
  grouped?: boolean
  /** Width class applied to each item in a grouped row (e.g. 'w-64'). */
  itemWidth?: string
  /** Class on the group element itself ('w-full' when set). */
  groupFullWidth?: boolean
  items: ReadonlyArray<AttachmentItemSpec>
}>

export type AttachmentFixture = Readonly<{
  kind: 'demo' | 'image' | 'states' | 'sizes' | 'group' | 'trigger'
  title: string
  description: string
  /** Rendered only as the page hero, not as a named example section. */
  heroOnly?: boolean
  /** Outer frame: flex column lists vs plain centered column. */
  frame: 'gap-2' | 'gap-3' | 'plain'
  rows: Readonly<[AttachmentRowSpec, ...Array<AttachmentRowSpec>]>
}>

const WORKSPACE_SRC =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80'
const DESK_SRC =
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80'
const OFFICE_SRC =
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80'

export const attachmentFixtures: Readonly<
  [AttachmentFixture, ...Array<AttachmentFixture>]
> = [
  {
    kind: 'demo',
    title: 'Demo',
    description:
      'A file list combining a vertical image strip with standalone uploads.',
    heroOnly: true,
    frame: 'gap-3',
    rows: [
      {
        name: 'images',
        grouped: true,
        items: [
          {
            name: 'workspace.png',
            meta: 'PNG · 820 KB',
            src: WORKSPACE_SRC,
            alt: 'Workspace',
            orientation: 'vertical',
            actions: [],
          },
          {
            name: 'desk-reference.jpg',
            meta: 'JPG · 1.1 MB',
            src: DESK_SRC,
            alt: 'Desk',
            orientation: 'vertical',
            actions: [],
          },
          {
            name: 'office-reference.jpg',
            meta: 'JPG · 940 KB',
            src: OFFICE_SRC,
            alt: 'Office',
            orientation: 'vertical',
            actions: [],
          },
        ],
      },
      {
        name: 'files',
        items: [
          {
            name: 'sales-dashboard.pdf',
            meta: 'Uploading · 64%',
            spinner: true,
            state: 'uploading',
            actions: [{ icon: 'x', label: 'Cancel upload' }],
          },
          {
            name: 'message-renderer.ts',
            meta: 'TypeScript · 12 KB',
            icon: 'file-code',
            actions: [{ icon: 'x', label: 'Remove message-renderer.ts' }],
          },
        ],
      },
    ],
  },
  {
    kind: 'image',
    title: 'Image',
    description:
      'Media attachments can render an image preview and still expose remove actions and a fill trigger.',
    frame: 'plain',
    rows: [
      {
        name: 'images',
        grouped: true,
        groupFullWidth: true,
        items: [
          {
            name: 'workspace.png',
            meta: 'PNG · 820 KB',
            src: WORKSPACE_SRC,
            alt: 'Workspace',
            orientation: 'vertical',
            actions: [{ icon: 'x', label: 'Remove workspace.png' }],
            triggerLabel: 'Open workspace.png',
          },
          {
            name: 'desk-reference.jpg',
            meta: 'JPG · 1.1 MB',
            src: DESK_SRC,
            alt: 'Desk',
            orientation: 'vertical',
            actions: [{ icon: 'x', label: 'Remove desk-reference.jpg' }],
            triggerLabel: 'Open desk-reference.jpg',
          },
          {
            name: 'office-reference.jpg',
            meta: 'JPG · 940 KB',
            src: OFFICE_SRC,
            alt: 'Office',
            orientation: 'vertical',
            actions: [{ icon: 'x', label: 'Remove office-reference.jpg' }],
            triggerLabel: 'Open office-reference.jpg',
          },
        ],
      },
    ],
  },
  {
    kind: 'states',
    title: 'States',
    description:
      'Render upload lifecycle as domain data: idle, uploading, processing, error, and done.',
    frame: 'gap-2',
    rows: [
      {
        name: 'items',
        items: [
          {
            name: 'selected-file.pdf',
            meta: 'Ready to upload',
            icon: 'clock',
            state: 'idle',
            actions: [{ icon: 'x', label: 'Remove selected-file.pdf' }],
          },
          {
            name: 'design-system.zip',
            meta: 'Uploading · 64%',
            spinner: true,
            state: 'uploading',
            actions: [{ icon: 'x', label: 'Cancel upload' }],
          },
          {
            name: 'market-research.pdf',
            meta: 'Processing document',
            icon: 'file-text',
            state: 'processing',
            actions: [{ icon: 'x', label: 'Remove market-research.pdf' }],
          },
          {
            name: 'financial-model.xlsx',
            meta: 'Upload failed. Try again.',
            icon: 'file-warning',
            state: 'error',
            actions: [
              { icon: 'refresh-cw', label: 'Retry upload' },
              { icon: 'x', label: 'Remove financial-model.xlsx' },
            ],
          },
          {
            name: 'uploaded-report.pdf',
            meta: 'Uploaded · 1.8 MB',
            icon: 'check',
            state: 'done',
            actions: [{ icon: 'x', label: 'Remove uploaded-report.pdf' }],
          },
        ],
      },
    ],
  },
  {
    kind: 'sizes',
    title: 'Sizes',
    description: "Use size 'sm' or 'xs' to make the attachment smaller.",
    frame: 'gap-3',
    rows: [
      {
        name: 'items',
        items: [
          {
            name: 'Default attachment',
            meta: 'PDF · 2.4 MB',
            icon: 'file-text',
            size: 'default',
            actions: [],
          },
          {
            name: 'Small attachment',
            meta: 'PDF · 2.4 MB',
            icon: 'file-text',
            size: 'sm',
            actions: [],
          },
          {
            name: 'Extra small attachment',
            icon: 'file-text',
            size: 'xs',
            actions: [],
          },
        ],
      },
    ],
  },
  {
    kind: 'group',
    title: 'Group',
    description:
      'AttachmentGroup lays out attachments in a horizontally scrollable snap row.',
    frame: 'plain',
    rows: [
      {
        name: 'items',
        grouped: true,
        groupFullWidth: true,
        itemWidth: 'w-64',
        items: [
          {
            name: 'briefing-notes.pdf',
            meta: 'PDF · 1.4 MB',
            icon: 'file-text',
            actions: [{ icon: 'x', label: 'Remove briefing-notes.pdf' }],
          },
          {
            name: 'workspace.png',
            meta: 'PNG · 820 KB',
            src: WORKSPACE_SRC,
            actions: [{ icon: 'x', label: 'Remove workspace.png' }],
          },
          {
            name: 'customers.csv',
            meta: 'CSV · 18 KB',
            icon: 'table',
            actions: [{ icon: 'x', label: 'Remove customers.csv' }],
          },
          {
            name: 'renderer.ts',
            meta: 'TSX · 12 KB',
            icon: 'file-code',
            actions: [{ icon: 'x', label: 'Remove renderer.ts' }],
          },
        ],
      },
    ],
  },
  {
    kind: 'trigger',
    title: 'Trigger',
    description:
      'The attachment trigger fills the card and opens the preview dialog, while the actions stay independently clickable above it.',
    frame: 'plain',
    rows: [
      {
        name: 'items',
        items: [
          {
            name: 'research-summary.pdf',
            meta: 'Open preview dialog',
            icon: 'file-search',
            actions: [
              { icon: 'copy', label: 'Copy link' },
              { icon: 'x', label: 'Remove research-summary.pdf' },
            ],
            triggerLabel: 'Preview research-summary.pdf',
          },
        ],
      },
    ],
  },
]

const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const allItems = (
  fixture: AttachmentFixture,
): ReadonlyArray<AttachmentItemSpec> => fixture.rows.flatMap(row => row.items)

const needsRemove = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item =>
    item.actions.some(
      action => action.icon !== 'refresh-cw' && action.icon !== 'copy',
    ),
  )
const needsRetry = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item =>
    item.actions.some(action => action.icon === 'refresh-cw'),
  )
const needsCopy = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item =>
    item.actions.some(action => action.icon === 'copy'),
  )
const needsDialog = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.triggerLabel !== undefined)
const needsSpinner = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.spinner === true)
const needsIcon = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(
    item =>
      item.icon !== undefined ||
      item.actions.length > 0 ||
      (item.src === undefined && item.spinner !== true),
  )
const needsAnySrc = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.src !== undefined)
const needsState = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.state !== undefined)
const needsSize = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.size !== undefined)
const needsOrientation = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.orientation !== undefined)
const needsMeta = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.meta !== undefined)
const needsActions = (fixture: AttachmentFixture): boolean =>
  allItems(fixture).some(item => item.actions.length > 0)

const itemsConstSource = (fixture: AttachmentFixture): string =>
  `type ItemSpec = Readonly<{
  name: string
  meta?: string
  icon?: string
  spinner?: boolean
  src?: string
  alt?: string
  state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done'
  size?: 'default' | 'sm' | 'xs'
  orientation?: 'vertical'
  actions: ReadonlyArray<Readonly<{ icon: string; label: string }>>
  triggerLabel?: string
}>

${fixture.rows
  .map(
    row =>
      `const ${row.name}: ReadonlyArray<ItemSpec> = [\n${row.items
        .map(
          item =>
            `  { name: '${esc(item.name)}'${item.meta === undefined ? '' : `, meta: '${esc(item.meta)}'`}${item.icon === undefined ? '' : `, icon: '${item.icon}'`}${item.spinner === true ? `, spinner: true` : ''}${item.src === undefined ? '' : `, src: '${item.src}'`}${item.alt === undefined ? '' : `, alt: '${esc(item.alt)}'`}${item.state === undefined ? '' : `, state: '${item.state}' as const`}${item.size === undefined ? '' : `, size: '${item.size}' as const`}${item.orientation === undefined ? '' : `, orientation: '${item.orientation}' as const`}, actions: [${item.actions
              .map(
                action =>
                  `{ icon: '${action.icon}', label: '${esc(action.label)}' }`,
              )
              .join(
                ', ',
              )}]${item.triggerLabel === undefined ? '' : `, triggerLabel: '${esc(item.triggerLabel)}'`} },`,
        )
        .join('\n')}\n]`,
  )
  .join('\n\n')}`

const mediaChildrenSource = (
  fixture: AttachmentFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const iconFallback =
    renderer !== 'tailwind'
      ? `Icon.icon(item.icon ?? 'file', { class: stylex.props(styles.mediaIcon).className ?? '' }, h)`
      : `Icon.icon(item.icon ?? 'file', {}, h)`
  const imgSource =
    renderer !== 'tailwind'
      ? `h.img([h.Src(item.src), h.Alt(item.name), h.Class(stylex.props(styles.mediaImg).className ?? '')])`
      : `h.img([h.Src(item.src), h.Alt(item.name)])`
  const imgOrIcon = needsAnySrc(fixture)
    ? `item.src !== undefined\n            ? ${imgSource}\n            : ${iconFallback}`
    : iconFallback
  return needsSpinner(fixture)
    ? `item.spinner === true\n          ? Spinner.spinner({ size: 'md' as const, isDecorative: true }, h)\n          : ${imgOrIcon}`
    : imgOrIcon
}

const actionOnClickSource = (fixture: AttachmentFixture): string => {
  const retry = needsRetry(fixture)
  const copy = needsCopy(fixture)
  const tail = needsRemove(fixture)
    ? `Message['ClickedRemove']({ name: item.name })`
    : `Message['ClickedPreview']({ name: item.name })`
  return `${retry ? `action.icon === 'refresh-cw' ? Message['ClickedRetry']({ name: item.name }) : ` : ''}${copy ? `action.icon === 'copy' ? Message['ClickedCopy']({ name: item.name }) : ` : ''}${tail}`
}

const itemChildrenSource = (
  fixture: AttachmentFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => `[
      Attachment.attachmentMedia({ ${needsAnySrc(fixture) ? `variant: item.src === undefined ? 'icon' as const : 'image' as const, ` : ''}children: [
        ${mediaChildrenSource(fixture, renderer)},
      ] }, h),
      Attachment.attachmentContent({ children: [
        Attachment.attachmentTitle({ children: [item.name] }, h),${
          needsMeta(fixture)
            ? `
        ...(item.meta === undefined ? [] : [Attachment.attachmentDescription({ children: [item.meta] }, h)]),`
            : ''
        }
      ] }, h),${
        needsActions(fixture)
          ? `
      ...(item.actions.length === 0 ? [] : [Attachment.attachmentActions({ children: item.actions.map(action =>
        Attachment.attachmentAction({
          onClick: ${actionOnClickSource(fixture)},
          label: action.label,
          children: [Icon.icon(action.icon, ${renderer !== 'tailwind' ? `{ class: stylex.props(styles.actionIcon).className ?? '' }` : '{}'}, h)],
        }, h),
      ) }, h)]),`
          : ''
      }${
        needsDialog(fixture)
          ? `
      ...(item.triggerLabel === undefined ? [] : [Attachment.attachmentTrigger({ onClick: Message['ClickedPreview']({ name: item.name }), label: item.triggerLabel }, h)]),`
          : ''
      }
    ]`

const attachmentCallSource = (
  fixture: AttachmentFixture,
  row: AttachmentRowSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const widthProp =
    row.grouped === true
      ? row.itemWidth === undefined
        ? ''
        : renderer !== 'tailwind'
          ? `layoutStyle: layoutStyle({ width: "16rem" }),`
          : `class: '${row.itemWidth}',`
      : renderer !== 'tailwind'
        ? `layoutStyle: layoutStyle({ width: "100%" }),`
        : `class: 'w-full',`
  return `Attachment.attachment({${
    needsState(fixture)
      ? `
      state: item.state ?? 'done',`
      : ''
  }${
    needsSize(fixture)
      ? `
      size: item.size ?? 'default',`
      : ''
  }${
    needsOrientation(fixture)
      ? `
      orientation: item.orientation ?? 'horizontal',`
      : ''
  }${widthProp}
      children: ${itemChildrenSource(fixture, renderer)},
    }, h)`
}

const rowSource = (
  fixture: AttachmentFixture,
  row: AttachmentRowSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const filtered = needsRemove(fixture)
    ? `${row.name}.filter(item => !model.removed.includes(item.name))`
    : row.name
  const mapBody = `${filtered}.map(item =>\n    ${attachmentCallSource(fixture, row, renderer)},\n  )`
  if (row.grouped === true) {
    return `Attachment.attachmentGroup({${row.groupFullWidth === true ? (renderer !== 'tailwind' ? ' layoutStyle: layoutStyle({ width: "100%" }),' : ` class: 'w-full',`) : ''} children: ${mapBody} }, h)`
  }
  return `...${mapBody}`
}

const bodySource = (
  fixture: AttachmentFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const frameAttr =
    renderer !== 'tailwind'
      ? `[h.Class(stylex.props(styles.frame).className ?? '')]`
      : `[h.Class('${fixture.frame === 'plain' ? 'mx-auto w-full max-w-sm py-12' : `mx-auto flex w-full max-w-sm flex-col ${fixture.frame} py-12`}')]`
  const rows = fixture.rows.map(
    row => `    ${rowSource(fixture, row, renderer)},`,
  )
  return `h.div(${frameAttr}, [
${rows.join('\n')}
    ])${
      needsDialog(fixture)
        ? `,
    Dialog.dialog({
      model: model.preview,
      toParentMessage: message => Message['GotDialogMessage']({ message }),
      title: model.previewFor,
      description: 'The attachment trigger fills the card and opens the dialog, while the actions stay independently clickable above it.',
    }, h)`
        : ''
    }`
}

const stylexStylesSource = (fixture: AttachmentFixture): string => {
  const frameDecl =
    fixture.frame === 'plain'
      ? `  frame: { marginInline: 'auto', maxWidth: '24rem', paddingBlock: '3rem', width: '100%' },`
      : `  frame: { display: 'flex', flexDirection: 'column', gap: '${fixture.frame === 'gap-3' ? '0.75rem' : '0.5rem'}', marginInline: 'auto', maxWidth: '24rem', paddingBlock: '3rem', width: '100%' },`
  const fullWidth = fixture.rows.some(
    row => row.grouped !== true || row.groupFullWidth === true,
  )
    ? `\n  fullWidth: { width: '100%' },`
    : ''
  const itemWidth = fixture.rows.some(row => row.itemWidth !== undefined)
    ? `\n  itemWidth: { width: '16rem' },`
    : ''
  const mediaImg = needsAnySrc(fixture)
    ? `\n  mediaImg: { aspectRatio: '1', objectFit: 'cover', width: '100%' },`
    : ''
  const mediaIcon = `\n  mediaIcon: { height: '1rem', width: '1rem' },`
  const actionIcon = needsActions(fixture)
    ? `\n  actionIcon: { flexShrink: 0, height: '0.75rem', width: '0.75rem' },`
    : ''
  return `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${frameDecl}${fullWidth}${itemWidth}${mediaImg}${mediaIcon}${actionIcon}
})

`
}

const componentImports = (
  fixture: AttachmentFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const ui = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const stylexBits =
    renderer !== 'tailwind'
      ? `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

${stylexStylesSource(fixture)}`
      : ''
  return `${stylexBits}import * as Attachment from '@/${ui}/attachment'${needsIcon(fixture) ? `\nimport * as Icon from '@/lib/icon'` : ''}${needsSpinner(fixture) ? `\nimport * as Spinner from '@/${ui}/spinner'` : ''}${needsDialog(fixture) ? `\nimport * as Dialog from '@/${ui}/dialog'` : ''}`
}

const source = (
  fixture: AttachmentFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const dialog = needsDialog(fixture)
  const removed = needsRemove(fixture)
  const interactive =
    removed || needsRetry(fixture) || needsCopy(fixture) || dialog
  return foldkitApplication({
    title: `Attachment — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${componentImports(fixture, renderer)}`,
    model: interactive
      ? `export const Model = S.Struct({ ${removed ? 'removed: S.Array(S.String)' : '_: S.optional(S.Never)'}${dialog ? ', preview: Dialog.Model, previewFor: S.String' : ''} })
export type Model = typeof Model.Type`
      : `export const Model = S.Struct({})
export type Model = typeof Model.Type`,
    messages: interactive
      ? `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({${
          removed
            ? `
  ClickedRemove: { name: S.String },`
            : ''
        }${
          needsRetry(fixture)
            ? `
  ClickedRetry: { name: S.String },`
            : ''
        }${
          needsCopy(fixture)
            ? `
  ClickedCopy: { name: S.String },`
            : ''
        }${
          dialog
            ? `
  ClickedPreview: { name: S.String },
  GotDialogMessage: { message: Dialog.Message },`
            : ''
        }
});
export type Message = typeof Message.Type`
      : `import { taggedStruct } from 'foldkit/schema'
// This example has no interaction. Runtime applications still expose a
// closed Message schema so the program boundary remains explicit.
export const NoOp = taggedStruct('NoOpAttachmentSizes');
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`,
    init: interactive
      ? `export const init = (): Update.Return<Model, Message> => ({ model: { ${removed ? 'removed: []' : '_: undefined'}${dialog ? `, preview: Dialog.init({ id: 'attachment-preview', isAnimated: true }), previewFor: ''` : ''} } })`
      : `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: interactive
      ? `${
          dialog
            ? `const mapDialog = (
  model: Model,
  result: ReturnType<typeof Dialog.update>,
): Update.Return<Model, Message> => ({
  model: { ...model, preview: result.model },
  commands: Command.mapMessages(result.commands, next => Message['GotDialogMessage']({ message: next })),
})

`
            : ''
        }export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {${
    removed
      ? `
    case 'ClickedRemove':
      return { model: { ...model, removed: [...model.removed, message.name] } }`
      : ''
  }${
    needsRetry(fixture)
      ? `
    case 'ClickedRetry':
      return { model: { ...model, removed: model.removed.filter(name => name !== message.name) } }`
      : ''
  }${
    needsCopy(fixture)
      ? `
    case 'ClickedCopy':
      return { model }`
      : ''
  }${
    dialog
      ? `
    case 'ClickedPreview': {
      const opened = Dialog.open(model.preview)
      return mapDialog({ ...model, previewFor: message.name }, opened)
    }
    case 'GotDialogMessage':
      return mapDialog(model, Dialog.update(model.preview, message.message))`
      : ''
  }
  }
}`
      : `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model: model })`,
    view: `${itemsConstSource(fixture)}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Attachment — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${bodySource(fixture, renderer)},
  ]),
})`,
  })
}

const attachmentExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  attachmentFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const attachmentExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, attachmentExamplesFor(renderer))
