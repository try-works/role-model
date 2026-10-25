import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  toggleGroupFixtures,
  type TGFixture,
  type TGGroupSpec,
  type TGItem,
} from '@/docs/components/pages/toggle-group/shared'
import * as Field from '@/pleat/field'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import * as ToggleGroup from '@/pleat/toggle-group'
import { className } from '@/pleat/style'

const styles = {
  stack: Style.make({ gap: '1rem', display: 'flex', flexDirection: 'column' }),
  wFull: Style.make({ width: '100%' }),
  weightItem: Style.make({
    borderRadius: 'calc(var(--radius) + 4px)',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '4rem',
    width: '4rem',
  }),
  weightItemBox: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '4rem',
    width: '4rem',
  }),
  iconMd: Style.make({
    flexShrink: 0,
    pointerEvents: 'none',
    height: '1rem',
    width: '1rem',
  }),
  weightLight: Style.make({
    fontSize: '1.5rem',
    fontWeight: 'inherit',
    lineHeight: 1,
  }),
  weightNormal: Style.make({
    fontSize: '1.5rem',
    fontWeight: 400,
    lineHeight: 1,
  }),
  weightMedium: Style.make({
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1,
  }),
  weightBold: Style.make({
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1,
  }),
  weightLabel: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  inlineCode: Style.make({
    borderRadius: 'calc(var(--radius) - 2px)',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    backgroundColor: 'var(--muted)',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  }),
}

const Bundle = ToggleGroup.create<string>()

interface PreviewShape {
  readonly groups: Readonly<Record<string, ToggleGroup.Model>>
  readonly selections: Readonly<Record<string, ReadonlyArray<string>>>
}

const weightClass = (weight: string) =>
  weight === 'light'
    ? styles.weightLight
    : weight === 'medium'
      ? styles.weightMedium
      : weight === 'bold'
        ? styles.weightBold
        : styles.weightNormal

const itemChildren = <Msg>(
  item: TGItem,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> => {
  if (item.icon !== undefined) {
    return [Icon.icon(item.icon, { class: className(styles.iconMd) }, h)]
  }
  if (item.weight !== undefined) {
    return [
      h.div(
        [h.Class(className(styles.weightItem))],
        [
          h.span([h.Class(className(weightClass(item.weight)))], ['Aa']),
          h.span([h.Class(className(styles.weightLabel))], [item.label ?? '']),
        ],
      ),
    ]
  }
  return [item.label ?? '']
}

const itemConfig = <Msg>(item: TGItem, h: HtmlBuilder<Msg>) => ({
  value: item.value,
  ariaLabel: item.ariaLabel,
  children: itemChildren(item, h),
  ...(item.isDisabled === true ? { isDisabled: true } : {}),
  ...(item.weight !== undefined
    ? { layoutStyle: styles.weightItemBox as ComponentLayoutStyle }
    : {}),
})

const groupView = <Msg>(
  group: TGGroupSpec,
  preview: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  groupLayoutStyle?: ComponentLayoutStyle | undefined,
): Html =>
  Bundle.toggleGroup(
    {
      model: preview.groups[group.id] ?? ToggleGroup.init({ id: group.id }),
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag: 'GotToggleGroupPreviewMessage',
            id: group.id,
            message,
          }),
        ),
      ariaLabel: group.ariaLabel,
      ...(group.multiple
        ? { values: preview.selections[group.id] ?? [] }
        : {
            value: preview.selections[group.id]?.[0] ?? group.selected[0] ?? '',
          }),
      items: group.items.map(item => itemConfig(item, h)),
      ...(group.variant === 'outline' ? { variant: 'outline' as const } : {}),
      ...(group.size !== undefined ? { size: group.size } : {}),
      ...(group.arrangement === 'wrapped'
        ? { arrangement: 'wrapped' as const }
        : {}),
      ...(group.orientation === 'vertical'
        ? { orientation: 'vertical' as const }
        : {}),
      ...(group.rtl === true ? { direction: 'rtl' as const } : {}),
      ...(groupLayoutStyle === undefined
        ? {}
        : { layoutStyle: groupLayoutStyle }),
    },
    h,
  )

export const toggleGroupPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const preview = model as PreviewShape
  const fixture: TGFixture =
    toggleGroupFixtures[exampleIndex] ?? toggleGroupFixtures[0]
  if (fixture.kind === 'stack') {
    return h.div(
      [h.Class(className(styles.stack))],
      fixture.groups.map(group => groupView(group, preview, onMessageJson, h)),
    )
  }
  if (fixture.kind === 'custom') {
    const group = fixture.groups[0]!
    return Field.field(
      {
        children: [
          Field.fieldLabel({ children: ['Font Weight'] }, h),
          groupView(
            group,
            preview,
            onMessageJson,
            h,
            styles.wFull as ComponentLayoutStyle,
          ),
          Field.fieldDescription(
            {
              children: [
                'Use ',
                h.code(
                  [h.Class(className(reset.code, styles.inlineCode))],
                  [`font-${preview.selections[group.id]?.[0] ?? 'normal'}`],
                ),
                ' to set the font weight.',
              ],
            },
            h,
          ),
        ],
      },
      h,
    )
  }
  return groupView(fixture.groups[0]!, preview, onMessageJson, h)
}
