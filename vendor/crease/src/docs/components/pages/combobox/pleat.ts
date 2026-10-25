import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  comboboxCountries,
  comboboxFixtures,
  comboboxFrameworks,
  comboboxRtlCategories,
  comboboxTimezones,
  type ComboboxFixture,
} from '@/docs/components/pages/combobox/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/pleat/button'
import * as Combobox from '@/pleat/combobox'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { className } from '@/pleat/style'

const styles = {
  row: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
  clearButton: Style.make({ position: 'relative', zIndex: 50 }),
  stack: Style.make({ gap: '0.5rem', display: 'grid' }),
  icon: Style.make({ height: '1rem', width: '1rem' }),
  itemCol: Style.make({ display: 'flex', flexDirection: 'column' }),
  itemMeta: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  chipsBox: Style.make({
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: '20rem',
    width: '100%',
  }),
  chip: Style.make({
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    paddingBlock: '0.125rem',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: 'var(--accent)',
    display: 'flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
  }),
  chipButton: Style.make({
    borderRadius: '0.375rem',
    alignItems: 'center',
    display: 'inline-flex',
    justifyContent: 'center',
    opacity: 0.6,
  }).pipe(Style.when(When.hover, { opacity: 1 })),
  chipIcon: Style.make({ height: '0.75rem', width: '0.75rem' }),
  multiInput: Style.make({
    paddingInline: '0.25rem',
    flexBasis: '0%',
    flexGrow: 1,
    borderBottomStyle: 'none',
    borderBottomWidth: 0,
    height: '1.75rem',
    minWidth: '4rem',
  }),
  chevron: Style.make({ opacity: 0.5, height: '1rem', width: '1rem' }),
  toggleButton: Style.make({
    borderRadius: '0.375rem',
    alignSelf: 'center',
    flexShrink: 0,
    opacity: 0.7,
    height: '1.5rem',
    width: '1.5rem',
  }),
}

type Preview = Readonly<{
  combobox: Combobox.Model
  multi: Combobox.MultiModel
  maybeValue: Option.Option<string>
  selectedValues: ReadonlyArray<string>
  autoHighlight: boolean
}>

const AutoHighlightCombobox = Combobox.create<string>({ autoHighlight: true })
const MultiCombobox = Combobox.createMulti<string>({ autoHighlight: true })

const labelFor =
  <Item extends { value: string; label: string }>(items: ReadonlyArray<Item>) =>
  (value: string): string =>
    items.find(item => item.value === value)?.label ?? value

export const comboboxPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = comboboxFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview
  const toParentMessage = (message: Combobox.Message): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'GotComboboxPreviewMessage', message }),
    )

  const combo = ((): Html => {
    if (fixture.kind === 'groups') {
      return Combobox.combobox(
        {
          model: preview.combobox,
          maybeSelectedValue: preview.maybeValue,
          restingInputValue: Option.match(preview.maybeValue, {
            onNone: () => '',
            onSome: labelFor(comboboxTimezones),
          }),
          toParentMessage,
          items: comboboxTimezones,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          placeholder: 'Select a timezone',
          ariaLabel: 'Timezone',
          formName: 'docs-combobox',
          itemGroupKey: item => item.group,
          groupToHeading: group => group,
        },
        h,
      )
    }
    if (fixture.kind === 'custom') {
      return Combobox.combobox(
        {
          model: preview.combobox,
          maybeSelectedValue: preview.maybeValue,
          restingInputValue: Option.match(preview.maybeValue, {
            onNone: () => '',
            onSome: labelFor(comboboxCountries),
          }),
          toParentMessage,
          items: comboboxCountries,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          placeholder: 'Select country',
          ariaLabel: 'Country',
          formName: 'docs-combobox',
          itemToConfig: item => ({
            content: h.span(
              [h.Class(className(styles.itemCol))],
              [
                h.span([], [item.label]),
                h.span([h.Class(className(styles.itemMeta))], [item.continent]),
              ],
            ),
            searchText: `${item.label} ${item.continent}`,
          }),
        },
        h,
      )
    }
    if (fixture.kind === 'rtl') {
      return Combobox.combobox(
        {
          model: preview.combobox,
          maybeSelectedValue: preview.maybeValue,
          restingInputValue: Option.match(preview.maybeValue, {
            onNone: () => '',
            onSome: labelFor(comboboxRtlCategories),
          }),
          toParentMessage,
          items: comboboxRtlCategories,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          placeholder: 'أضف فئات',
          ariaLabel: 'الفئات',
          formName: 'docs-combobox',
          direction: 'rtl',
        },
        h,
      )
    }
    if (fixture.kind === 'autoHighlight') {
      return AutoHighlightCombobox.combobox(
        {
          model: preview.combobox,
          maybeSelectedValue: preview.maybeValue,
          restingInputValue: Option.match(preview.maybeValue, {
            onNone: () => '',
            onSome: labelFor(comboboxFrameworks),
          }),
          toParentMessage,
          items: comboboxFrameworks,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          placeholder: 'Select a framework',
          ariaLabel: 'Framework',
          formName: 'docs-combobox',
        },
        h,
      )
    }
    if (fixture.kind === 'popup') {
      return Combobox.combobox(
        {
          model: preview.combobox,
          maybeSelectedValue: preview.maybeValue,
          restingInputValue: Option.match(preview.maybeValue, {
            onNone: () => '',
            onSome: labelFor(comboboxCountries),
          }),
          toParentMessage,
          items: comboboxCountries,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          placeholder: 'Select country',
          ariaLabel: 'Country',
          formName: 'docs-combobox',
          trigger: {
            content: Icon.chevronsUpDown(
              { class: className(styles.chevron) },
              h,
            ),
            ariaLabel: 'Toggle options',
            layoutStyle: styles.toggleButton as ComponentLayoutStyle,
          },
        },
        h,
      )
    }
    return Combobox.combobox(
      {
        model: preview.combobox,
        maybeSelectedValue: preview.maybeValue,
        restingInputValue: Option.match(preview.maybeValue, {
          onNone: () => '',
          onSome: labelFor(comboboxFrameworks),
        }),
        toParentMessage,
        items: comboboxFrameworks,
        itemToValue: item => item.value,
        itemToLabel: item => item.label,
        placeholder: 'Select a framework',
        ariaLabel: 'Framework',
        formName: 'docs-combobox',
        ...(fixture.isInvalid === true ? { isInvalid: true } : {}),
        ...(fixture.isDisabled === true ? { isDisabled: true } : {}),
      },
      h,
    )
  })()

  if (fixture.kind === 'multiple') {
    return h.div(
      [h.Class(className(styles.chipsBox))],
      [
        ...preview.selectedValues.map(value =>
          h.span(
            [h.Class(className(styles.chip))],
            [
              comboboxFrameworks.find(item => item.value === value)?.label ??
                value,
              h.button(
                [
                  h.Class(className(reset.button, styles.chipButton)),
                  h.AriaLabel(`Remove ${value}`),
                  h.OnClick(
                    onMessageJson(
                      JSON.stringify({ _tag: 'RemovedChip', value }),
                    ),
                  ),
                ],
                [Icon.x({ class: className(styles.chipIcon) }, h)],
              ),
            ],
          ),
        ),
        MultiCombobox.comboboxMulti(
          {
            model: preview.multi,
            selectedValues: preview.selectedValues,
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({
                  _tag: 'GotMultiComboboxMessage',
                  message,
                }),
              ),
            items: comboboxFrameworks,
            itemToValue: item => item.value,
            itemToLabel: item => item.label,
            placeholder:
              preview.selectedValues.length === 0 ? 'Select a framework' : '',
            ariaLabel: 'Frameworks',
            triggerLayoutStyle: styles.multiInput as ComponentLayoutStyle,
          },
          h,
        ),
      ],
    )
  }
  return fixture.kind === 'clear'
    ? h.div(
        [h.Class(className(styles.row))],
        [
          combo,
          // See the Tailwind preview: the button must sit above the combobox's
          // z-40 backdrop and dispatch on mousedown (before the input blur
          // closes the popup) or the clear never reaches the update.
          h.div(
            [
              h.Class(className(styles.clearButton)),
              h.OnMouseDown(
                onMessageJson(JSON.stringify({ _tag: 'ClickedClear' })),
              ),
            ],
            [
              Button.button(
                {
                  variant: 'ghost',
                  size: 'icon',
                  ariaLabel: 'Clear selection',
                  onClick: onMessageJson(
                    JSON.stringify({ _tag: 'ClickedClear' }),
                  ),
                  children: [
                    Icon.icon('x', { class: className(styles.icon) }, h),
                  ],
                },
                h,
              ),
            ],
          ),
        ],
      )
    : h.div([h.Class(className(styles.stack))], [combo])
}
