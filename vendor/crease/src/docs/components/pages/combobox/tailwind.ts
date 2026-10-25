import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  comboboxCountries,
  comboboxFixtures,
  comboboxFrameworks,
  comboboxRtlCategories,
  comboboxTimezones,
  type ComboboxFixture,
} from '@/docs/components/pages/combobox/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as Combobox from '@/ui/combobox'

const PreviewMessages = defineMessageUnion({
  GotComboboxPreviewMessage: { message: Combobox.Message },
  GotMultiComboboxMessage: { message: Combobox.Message },
  RemovedChip: { value: S.String },
  ClickedClear: {},
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('combobox'),
  combobox: Combobox.Model,
  multi: Combobox.MultiModel,
  maybeValue: S.Option(S.String),
  selectedValues: S.Array(S.String),
  autoHighlight: S.Boolean,
})
type PreviewModel = typeof PreviewModel.Type

const AutoHighlightCombobox = Combobox.create<string>({ autoHighlight: true })
const MultiCombobox = Combobox.createMulti<string>({ autoHighlight: true })

const labelFor =
  <Item extends { value: string; label: string }>(items: ReadonlyArray<Item>) =>
  (value: string): string =>
    items.find(item => item.value === value)?.label ?? value

const commonProps = (model: PreviewModel) => ({
  model: model.combobox,
  maybeSelectedValue: model.maybeValue,
  toParentMessage: (message: Combobox.Message): PreviewMessage =>
    PreviewMessages.GotComboboxPreviewMessage({ message }),
  formName: 'docs-combobox',
})

const frameworksView = (
  fixture: ComboboxFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) =>
  Combobox.combobox(
    {
      ...commonProps(model),
      restingInputValue: Option.match(model.maybeValue, {
        onNone: () => '',
        onSome: labelFor(comboboxFrameworks),
      }),
      items: comboboxFrameworks,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder: 'Select a framework',
      ariaLabel: 'Framework',
      ...(fixture.isInvalid === true ? { isInvalid: true } : {}),
      ...(fixture.isDisabled === true ? { isDisabled: true } : {}),
    },
    h,
  )

const timezonesView = (model: PreviewModel, h: HtmlBuilder<PreviewMessage>) =>
  Combobox.combobox(
    {
      ...commonProps(model),
      restingInputValue: Option.match(model.maybeValue, {
        onNone: () => '',
        onSome: labelFor(comboboxTimezones),
      }),
      items: comboboxTimezones,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder: 'Select a timezone',
      ariaLabel: 'Timezone',
      itemGroupKey: item => item.group,
      groupToHeading: group => group,
    },
    h,
  )

const countriesView = (model: PreviewModel, h: HtmlBuilder<PreviewMessage>) =>
  Combobox.combobox(
    {
      ...commonProps(model),
      restingInputValue: Option.match(model.maybeValue, {
        onNone: () => '',
        onSome: labelFor(comboboxCountries),
      }),
      items: comboboxCountries,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder: 'Select country',
      ariaLabel: 'Country',
      itemToConfig: item => ({
        content: h.span(
          [h.Class('flex flex-col')],
          [
            h.span([], [item.label]),
            h.span(
              [h.Class('text-muted-foreground text-xs')],
              [item.continent],
            ),
          ],
        ),
        searchText: `${item.label} ${item.continent}`,
      }),
    },
    h,
  )

const autoHighlightView = (
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) =>
  AutoHighlightCombobox.combobox(
    {
      ...commonProps(model),
      restingInputValue: Option.match(model.maybeValue, {
        onNone: () => '',
        onSome: labelFor(comboboxFrameworks),
      }),
      items: comboboxFrameworks,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder: 'Select a framework',
      ariaLabel: 'Framework',
    },
    h,
  )

const popupView = (model: PreviewModel, h: HtmlBuilder<PreviewMessage>) =>
  Combobox.combobox(
    {
      ...commonProps(model),
      restingInputValue: Option.match(model.maybeValue, {
        onNone: () => '',
        onSome: labelFor(comboboxCountries),
      }),
      items: comboboxCountries,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder: 'Select country',
      ariaLabel: 'Country',
      trigger: {
        content: Icon.chevronsUpDown({ class: 'size-4 opacity-50' }, h),
        ariaLabel: 'Toggle options',
        class: 'size-6 shrink-0 self-center rounded-sm opacity-70',
      },
    },
    h,
  )

const multipleView = (model: PreviewModel, h: HtmlBuilder<PreviewMessage>) =>
  h.div(
    [
      h.Class(
        'flex w-full max-w-xs flex-wrap items-center gap-1 rounded-md border bg-transparent px-1.5 py-1',
      ),
    ],
    [
      ...model.selectedValues.map(value =>
        h.span(
          [
            h.Class(
              'flex items-center gap-1 rounded-md border bg-accent px-1.5 py-0.5 text-xs font-medium',
            ),
          ],
          [
            comboboxFrameworks.find(item => item.value === value)?.label ??
              value,
            h.button(
              [
                h.Class(
                  'inline-flex items-center justify-center rounded-sm opacity-60 hover:opacity-100',
                ),
                h.AriaLabel(`Remove ${value}`),
                h.OnClick(PreviewMessages.RemovedChip({ value })),
              ],
              [Icon.x({ class: 'size-3' }, h)],
            ),
          ],
        ),
      ),
      MultiCombobox.comboboxMulti(
        {
          model: model.multi,
          selectedValues: model.selectedValues,
          toParentMessage: message =>
            PreviewMessages.GotMultiComboboxMessage({ message }),
          items: comboboxFrameworks,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          placeholder:
            model.selectedValues.length === 0 ? 'Select a framework' : '',
          ariaLabel: 'Frameworks',
          triggerClass: 'h-7 min-w-16 flex-1 border-none px-1',
        },
        h,
      ),
    ],
  )

const rtlView = (model: PreviewModel, h: HtmlBuilder<PreviewMessage>) =>
  Combobox.combobox(
    {
      ...commonProps(model),
      restingInputValue: Option.match(model.maybeValue, {
        onNone: () => '',
        onSome: labelFor(comboboxRtlCategories),
      }),
      items: comboboxRtlCategories,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder: 'أضف فئات',
      ariaLabel: 'الفئات',
      direction: 'rtl',
    },
    h,
  )

export const comboboxTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => ({
    _docsPage: 'combobox',
    combobox: (() => {
      const initial = Combobox.init({
        id: `docs-combobox-${String(index)}`,
        isAnimated: true,
      })
      // Seed inputValue for the pre-selected clear example — upstream combobox
      // does not derive it from the resting label yet (foldkit finding F15).
      return comboboxFixtures[index]?.kind === 'clear'
        ? { ...initial, inputValue: 'Foldkit' }
        : initial
    })(),
    multi: Combobox.multiInit({
      id: `docs-combobox-multi-${String(index)}`,
      isAnimated: true,
    }),
    maybeValue:
      comboboxFixtures[index]?.kind === 'clear'
        ? Option.some('foldkit')
        : Option.none(),
    selectedValues:
      comboboxFixtures[index]?.kind === 'multiple' ? ['foldkit'] : [],
    autoHighlight: comboboxFixtures[index]?.kind === 'autoHighlight',
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotComboboxPreviewMessage': {
        const next = (
          model.autoHighlight ? AutoHighlightCombobox : Combobox
        ).update(model.combobox, message.message)
        const maybeOut = Option.fromNullishOr(next.outMessage)
        const maybeValue = Option.match(maybeOut, {
          onNone: () => model.maybeValue,
          onSome: out =>
            out._tag === 'Selected'
              ? Option.some(out.value)
              : Option.none<string>(),
        })
        return {
          model: { ...model, combobox: next.model, maybeValue },
          commands: Command.mapMessages(next.commands ?? [], child =>
            PreviewMessages.GotComboboxPreviewMessage({ message: child }),
          ),
        }
      }
      case 'GotMultiComboboxMessage': {
        const next = MultiCombobox.update(model.multi, message.message)
        const maybeOut = Option.fromNullishOr(next.outMessage)
        const selectedValues = Option.match(maybeOut, {
          onNone: () => model.selectedValues,
          onSome: out =>
            out._tag === 'Selected'
              ? model.selectedValues.includes(out.value)
                ? model.selectedValues.filter(value => value !== out.value)
                : [...model.selectedValues, out.value]
              : model.selectedValues,
        })
        return {
          model: { ...model, multi: next.model, selectedValues },
          commands: Command.mapMessages(next.commands ?? [], child =>
            PreviewMessages.GotMultiComboboxMessage({ message: child }),
          ),
        }
      }
      case 'RemovedChip':
        return {
          model: {
            ...model,
            selectedValues: model.selectedValues.filter(
              value => value !== message.value,
            ),
          },
        }
      case 'ClickedClear': {
        // Close once via BlurredInput, which restores the empty resting
        // value — routing UpdatedInputValue would reopen the popup first
        // (its typing semantics open the listbox) and flash the options
        // before the deferred close lands.
        const next = model.combobox.isOpen
          ? Combobox.update(
              model.combobox,
              Combobox.Message.BlurredInput({
                restingInputValue: '',
                isClearable: true,
              }),
            )
          : {
              model: { ...model.combobox, inputValue: '' },
              commands: [],
            }
        return {
          model: {
            ...model,
            combobox: next.model,
            maybeValue: Option.none(),
          },
          commands: Command.mapMessages(next.commands ?? [], child =>
            PreviewMessages.GotComboboxPreviewMessage({ message: child }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = comboboxFixtures[index] ?? comboboxFixtures[0]!
    const combo =
      fixture.kind === 'groups'
        ? timezonesView(model, h)
        : fixture.kind === 'custom'
          ? countriesView(model, h)
          : fixture.kind === 'rtl'
            ? rtlView(model, h)
            : fixture.kind === 'autoHighlight'
              ? autoHighlightView(model, h)
              : fixture.kind === 'popup'
                ? popupView(model, h)
                : frameworksView(fixture, model, h)
    if (fixture.kind === 'multiple') {
      return multipleView(model, h)
    }
    return fixture.kind === 'clear'
      ? h.div(
          [h.Class('flex items-center gap-2')],
          [
            combo,
            // The open combobox renders a fixed z-40 backdrop that covers
            // this button, so the clear would only restore the selection
            // instead of running. Keep the button above it and dispatch on
            // mousedown, which lands before the input blur closes the popup.
            h.div(
              [
                h.Class('relative z-50'),
                h.OnMouseDown(PreviewMessages.ClickedClear()),
              ],
              [
                Button.button(
                  {
                    variant: 'ghost',
                    size: 'icon',
                    ariaLabel: 'Clear selection',
                    onClick: PreviewMessages.ClickedClear(),
                    children: [Icon.icon('x', { class: 'size-4' }, h)],
                  },
                  h,
                ),
              ],
            ),
          ],
        )
      : h.div([h.Class('grid gap-2')], [combo])
  },
})
