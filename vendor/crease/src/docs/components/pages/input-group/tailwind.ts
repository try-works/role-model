import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  inputGroupFixtures,
  inputGroupRtlCopy,
} from '@/docs/components/pages/input-group/shared'
import * as Icon from '@/lib/icon'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Field from '@/ui/field'
import * as InputGroup from '@/ui/input-group'
import * as Kbd from '@/ui/kbd'
import * as Popover from '@/ui/popover'
import * as Spinner from '@/ui/spinner'

const FILE_MENU_ITEMS = ['Settings', 'Copy path', 'Open location'] as const
const SEARCH_MENU_ITEMS = ['Documentation', 'Blog Posts', 'Changelog'] as const

const InputGroupPreviewMessage = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
  GotDropdownMessage: { index: S.Number, message: DropdownMenu.Message },
  GotPopoverMessage: { message: Popover.Message },
  ClickedFavorite: {},
  ClickedShowPassword: {},
  ClickedCopy: { text: S.String },
  CompletedCopy: {},
  CompletedWaitBeforeClearingCopy: {},
})
type InputGroupPreviewMessage = typeof InputGroupPreviewMessage.Type

const InputGroupPreviewModel = S.Struct({
  _docsPage: S.Literal('input-group'),
  values: S.Record(S.String, S.String),
  dropdowns: S.Array(DropdownMenu.Model),
  popover: Popover.Model,
  isFavorite: S.Boolean,
  isCopied: S.Boolean,
  isPasswordShown: S.Boolean,
})
type InputGroupPreviewModel = typeof InputGroupPreviewModel.Type

const CopyUrl = Command.define('CopyDocsUrl', {
  args: { text: S.String },
  messages: [InputGroupPreviewMessage.CompletedCopy],
  execute: ({ text }) =>
    /* Clipboard permission can be denied (e.g. unfocused iframe); swallow
       the rejection inside the promise so a denied write can't crash the
       app, and still surface the check feedback. */
    Effect.promise(() =>
      navigator.clipboard.writeText(text).catch(() => {}),
    ).pipe(Effect.as(InputGroupPreviewMessage.CompletedCopy())),
})
const WaitBeforeClearingCopy = Command.define(
  'WaitBeforeClearingCopyFeedback',
  {
    messages: [InputGroupPreviewMessage.CompletedWaitBeforeClearingCopy],
    execute: Effect.sleep('1800 millis').pipe(
      Effect.as(InputGroupPreviewMessage.CompletedWaitBeforeClearingCopy()),
    ),
  },
)

const lbl = (
  forId: string,
  text: string,
  h: HtmlBuilder<InputGroupPreviewMessage>,
): Html => Field.fieldLabel({ for: forId, children: [text] }, h)

const dsc = (text: string, h: HtmlBuilder<InputGroupPreviewMessage>): Html =>
  Field.fieldDescription({ children: [text] }, h)

const in_ = (
  model: InputGroupPreviewModel,
  key: string,
  id: string,
  extras: Partial<
    Parameters<typeof InputGroup.inputGroupInput<InputGroupPreviewMessage>>[0]
  > = {},
  h: HtmlBuilder<InputGroupPreviewMessage>,
): Html =>
  InputGroup.inputGroupInput(
    {
      id,
      value: model.values[key] ?? '',
      onInput: value =>
        InputGroupPreviewMessage.ChangedInputValue({ field: key, value }),
      ...extras,
    },
    h,
  )

const area = (
  model: InputGroupPreviewModel,
  key: string,
  id: string,
  extras: Partial<
    Parameters<
      typeof InputGroup.inputGroupTextarea<InputGroupPreviewMessage>
    >[0]
  > = {},
  h: HtmlBuilder<InputGroupPreviewMessage>,
): Html =>
  InputGroup.inputGroupTextarea(
    {
      id,
      value: model.values[key] ?? '',
      onInput: value =>
        InputGroupPreviewMessage.ChangedInputValue({ field: key, value }),
      ...extras,
    },
    h,
  )

const inputGroupView = (
  fixture: (typeof inputGroupFixtures)[number],
  model: InputGroupPreviewModel,
  h: HtmlBuilder<InputGroupPreviewMessage>,
): Html => {
  switch (fixture.kind) {
    case 'demo':
      return InputGroup.inputGroup(
        {
          class: 'max-w-xs',
          children: [
            in_(
              model,
              'demo',
              'input-group-demo',
              { placeholder: 'Search...' },
              h,
            ),
            InputGroup.inputGroupAddon(
              { children: [Icon.icon('search', {}, h)] },
              h,
            ),
            InputGroup.inputGroupAddon(
              { align: 'inline-end', children: ['12 results'] },
              h,
            ),
          ],
        },
        h,
      )
    case 'align':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-10')],
        [
          Field.field(
            {
              children: [
                lbl('inline-start-input', 'Input', h),
                InputGroup.inputGroup(
                  {
                    children: [
                      in_(
                        model,
                        'alignStart',
                        'inline-start-input',
                        { placeholder: 'Search...' },
                        h,
                      ),
                      InputGroup.inputGroupAddon(
                        {
                          align: 'inline-start',
                          children: [Icon.icon('search', {}, h)],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                dsc('Icon positioned at the start.', h),
              ],
            },
            h,
          ),
          Field.field(
            {
              children: [
                lbl('inline-end-input', 'Input', h),
                InputGroup.inputGroup(
                  {
                    children: [
                      in_(
                        model,
                        'alignEnd',
                        'inline-end-input',
                        {
                          type: model.isPasswordShown ? 'text' : 'password',
                          placeholder: 'Enter password',
                        },
                        h,
                      ),
                      InputGroup.inputGroupAddon(
                        {
                          align: 'inline-end',
                          children: [
                            InputGroup.inputGroupButton(
                              {
                                size: 'icon-xs',
                                ariaLabel: model.isPasswordShown
                                  ? 'Hide password'
                                  : 'Show password',
                                onClick:
                                  InputGroupPreviewMessage.ClickedShowPassword(),
                                children: [
                                  Icon.icon(
                                    model.isPasswordShown ? 'eye' : 'eye-off',
                                    {},
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                dsc('Icon positioned at the end.', h),
              ],
            },
            h,
          ),
          Field.fieldGroup(
            {
              children: [
                Field.field(
                  {
                    children: [
                      lbl('block-start-input', 'Input', h),
                      InputGroup.inputGroup(
                        {
                          children: [
                            in_(
                              model,
                              'alignBlockInput',
                              'block-start-input',
                              { placeholder: 'Enter your name' },
                              h,
                            ),
                            InputGroup.inputGroupAddon(
                              {
                                align: 'block-start',
                                children: [
                                  InputGroup.inputGroupText(
                                    { children: ['Full Name'] },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      dsc('Header positioned above the input.', h),
                    ],
                  },
                  h,
                ),
                Field.field(
                  {
                    children: [
                      lbl('block-start-textarea', 'Textarea', h),
                      InputGroup.inputGroup(
                        {
                          children: [
                            area(
                              model,
                              'alignBlockTextarea',
                              'block-start-textarea',
                              {
                                placeholder: "console.log('Hello, world!');",
                                class: 'font-mono text-sm',
                              },
                              h,
                            ),
                            InputGroup.inputGroupAddon(
                              {
                                align: 'block-start',
                                children: [
                                  Icon.icon('file-code', {}, h),
                                  InputGroup.inputGroupText(
                                    {
                                      children: [
                                        h.span(
                                          [h.Class('font-mono')],
                                          ['script.js'],
                                        ),
                                      ],
                                    },
                                    h,
                                  ),
                                  InputGroup.inputGroupButton(
                                    {
                                      size: 'icon-xs',
                                      class: 'ml-auto',
                                      ariaLabel: 'Copy',
                                      onClick:
                                        InputGroupPreviewMessage.ClickedCopy({
                                          text:
                                            model.values[
                                              'alignBlockTextarea'
                                            ] ?? '',
                                        }),
                                      children: [
                                        model.isCopied
                                          ? Icon.icon('check', {}, h)
                                          : Icon.icon('copy', {}, h),
                                      ],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      dsc('Header positioned above the textarea.', h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          Field.fieldGroup(
            {
              children: [
                Field.field(
                  {
                    children: [
                      lbl('block-end-input', 'Input', h),
                      InputGroup.inputGroup(
                        {
                          children: [
                            in_(
                              model,
                              'alignBlockEndInput',
                              'block-end-input',
                              { placeholder: 'Enter amount' },
                              h,
                            ),
                            InputGroup.inputGroupAddon(
                              {
                                align: 'block-end',
                                children: [
                                  InputGroup.inputGroupText(
                                    { children: ['USD'] },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      dsc('Footer positioned below the input.', h),
                    ],
                  },
                  h,
                ),
                Field.field(
                  {
                    children: [
                      lbl('block-end-textarea', 'Textarea', h),
                      InputGroup.inputGroup(
                        {
                          children: [
                            area(
                              model,
                              'alignBlockEndTextarea',
                              'block-end-textarea',
                              { placeholder: 'Write a comment...' },
                              h,
                            ),
                            InputGroup.inputGroupAddon(
                              {
                                align: 'block-end',
                                children: [
                                  InputGroup.inputGroupText(
                                    { children: ['0/280'] },
                                    h,
                                  ),
                                  InputGroup.inputGroupButton(
                                    {
                                      variant: 'default',
                                      size: 'sm',
                                      class: 'ml-auto',
                                      children: ['Post'],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      dsc('Footer positioned below the textarea.', h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'icon':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-6')],
        [
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'iconSearch',
                  'icon-search',
                  { placeholder: 'Search...' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Icon.icon('search', {}, h)] },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'iconEmail',
                  'icon-email',
                  { type: 'email', placeholder: 'Enter your email' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Icon.icon('mail', {}, h)] },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'iconCard',
                  'icon-card',
                  { placeholder: 'Card number' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Icon.icon('credit-card', {}, h)] },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [Icon.icon('check', {}, h)],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'iconCardStar',
                  'icon-card-star',
                  { placeholder: 'Card number' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      Icon.icon('star', {}, h),
                      Icon.icon('info', {}, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'text':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-6')],
        [
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupAddon(
                  {
                    children: [
                      InputGroup.inputGroupText({ children: ['$'] }, h),
                    ],
                  },
                  h,
                ),
                in_(
                  model,
                  'textAmount',
                  'text-amount',
                  { placeholder: '0.00' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupText({ children: ['USD'] }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupAddon(
                  {
                    children: [
                      InputGroup.inputGroupText({ children: ['https://'] }, h),
                    ],
                  },
                  h,
                ),
                in_(
                  model,
                  'textDomain',
                  'text-domain',
                  { placeholder: 'example.com' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupText({ children: ['.com'] }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'textUsername',
                  'text-username',
                  { placeholder: 'Enter your username' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupText(
                        { children: ['@company.com'] },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                area(
                  model,
                  'textMessage',
                  'text-message',
                  { placeholder: 'Enter your message' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'block-end',
                    children: [
                      InputGroup.inputGroupText(
                        {
                          children: [
                            h.span(
                              [h.Class('text-xs text-muted-foreground')],
                              ['120 characters left'],
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'button':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-6')],
        [
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'buttonCopy',
                  'button-copy',
                  { placeholder: 'https://creaseui.com' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupButton(
                        {
                          size: 'icon-xs',
                          ariaLabel: 'Copy',
                          onClick: InputGroupPreviewMessage.ClickedCopy({
                            text: model.values['buttonCopy'] ?? '',
                          }),
                          children: [
                            model.isCopied
                              ? Icon.icon('check', {}, h)
                              : Icon.icon('copy', {}, h),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              radius: 'full',
              children: [
                Popover.popover(
                  {
                    model: model.popover,
                    toParentMessage: message =>
                      InputGroupPreviewMessage.GotPopoverMessage({ message }),
                    trigger: Icon.icon('info', {}, h),
                    triggerClass:
                      'flex size-6 items-center justify-center rounded-[calc(var(--radius)-5px)] text-muted-foreground hover:bg-accent/50',
                    align: 'start',
                    content: h.div(
                      [h.Class('flex flex-col gap-1 text-sm')],
                      [
                        h.p(
                          [h.Class('font-medium')],
                          ['Your connection is not secure.'],
                        ),
                        h.p(
                          [],
                          [
                            'You should not enter any sensitive information on this site.',
                          ],
                        ),
                      ],
                    ),
                  },
                  h,
                ),
                InputGroup.inputGroupAddon({ children: ['https://'] }, h),
                in_(model, 'buttonSecure', 'button-secure', {}, h),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupButton(
                        {
                          size: 'icon-xs',
                          onClick: InputGroupPreviewMessage.ClickedFavorite(),
                          children: [
                            Icon.icon(
                              'star',
                              {
                                class: model.isFavorite
                                  ? 'fill-primary stroke-primary'
                                  : '',
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'buttonSearch',
                  'button-search',
                  { placeholder: 'Type to search...' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupButton(
                        { variant: 'secondary', children: ['Search'] },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'kbd':
      return InputGroup.inputGroup(
        {
          class: 'max-w-sm',
          children: [
            in_(model, 'kbd', 'kbd-search', { placeholder: 'Search...' }, h),
            InputGroup.inputGroupAddon(
              { children: [Icon.icon('search', {}, h)] },
              h,
            ),
            InputGroup.inputGroupAddon(
              {
                align: 'inline-end',
                children: [Kbd.kbd({ children: ['⌘K'] }, h)],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'dropdown':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-4')],
        [
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'dropdownFile',
                  'dropdown-file',
                  { placeholder: 'Enter file name' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      DropdownMenu.dropdownMenu(
                        {
                          model:
                            model.dropdowns[0] ??
                            DropdownMenu.init({
                              id: 'unbound-0',
                              isAnimated: false,
                            }),
                          toParentMessage: message =>
                            InputGroupPreviewMessage.GotDropdownMessage({
                              index: 0,
                              message,
                            }),
                          trigger: Icon.icon(
                            'ellipsis',
                            { ariaLabel: 'More' },
                            h,
                          ),
                          triggerClass:
                            'flex size-6 items-center justify-center rounded-[calc(var(--radius)-5px)] text-muted-foreground hover:bg-accent/50',
                          triggerAriaLabel: 'More',
                          align: 'end',
                          items: FILE_MENU_ITEMS,
                          itemToConfig: item => ({ label: item }),
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              radius: 'xl',
              children: [
                in_(
                  model,
                  'dropdownQuery',
                  'dropdown-query',
                  { placeholder: 'Enter search query' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      DropdownMenu.dropdownMenu(
                        {
                          model:
                            model.dropdowns[1] ??
                            DropdownMenu.init({
                              id: 'unbound-1',
                              isAnimated: false,
                            }),
                          toParentMessage: message =>
                            InputGroupPreviewMessage.GotDropdownMessage({
                              index: 1,
                              message,
                            }),
                          trigger: h.span(
                            [],
                            ['Search In...', Icon.icon('chevron-down', {}, h)],
                          ),
                          triggerClass:
                            'flex h-6 items-center gap-1 rounded-[calc(var(--radius)-5px)] px-1.5 text-xs text-muted-foreground hover:bg-accent/50',
                          triggerAriaLabel: 'Search in',
                          align: 'end',
                          items: SEARCH_MENU_ITEMS,
                          itemToConfig: item => ({ label: item }),
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'spinner':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-4')],
        [
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'spinnerSearch',
                  'spinner-search',
                  { placeholder: 'Searching...' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [Spinner.spinner({ isDecorative: true }, h)],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'spinnerProcessing',
                  'spinner-processing',
                  { placeholder: 'Processing...' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Spinner.spinner({ isDecorative: true }, h)] },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'spinnerSaving',
                  'spinner-saving',
                  { placeholder: 'Saving changes...' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupText({ children: ['Saving...'] }, h),
                      Spinner.spinner({ isDecorative: true }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'spinnerRefresh',
                  'spinner-refresh',
                  { placeholder: 'Refreshing data...' },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Spinner.spinner({ isDecorative: true }, h)] },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupText(
                        { children: ['Please wait...'] },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'textarea':
      return h.div(
        [h.Class('grid w-full max-w-md gap-4')],
        [
          InputGroup.inputGroup(
            {
              children: [
                area(
                  model,
                  'textareaCode',
                  'textarea-code',
                  {
                    placeholder: "console.log('Hello, world!');",
                    class: 'min-h-[200px]',
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'block-end',
                    children: [
                      InputGroup.inputGroupText(
                        { children: ['Line 1, Column 1'] },
                        h,
                      ),
                      InputGroup.inputGroupButton(
                        {
                          size: 'sm',
                          variant: 'default',
                          class: 'ml-auto',
                          children: [
                            'Run ',
                            Icon.icon('corner-down-left', {}, h),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'block-start',
                    children: [
                      InputGroup.inputGroupText(
                        {
                          children: [
                            Icon.icon('file-code', {}, h),
                            'script.js',
                          ],
                        },
                        h,
                      ),
                      InputGroup.inputGroupButton(
                        {
                          size: 'icon-xs',
                          class: 'ml-auto',
                          children: [Icon.icon('refresh-cw', {}, h)],
                        },
                        h,
                      ),
                      InputGroup.inputGroupButton(
                        {
                          size: 'icon-xs',
                          children: [Icon.icon('copy', {}, h)],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'custom':
      return h.div(
        [h.Class('grid w-full max-w-sm gap-6')],
        [
          InputGroup.inputGroup(
            {
              children: [
                h.textarea([
                  h.DataAttribute('slot', 'input-group-control'),
                  h.Placeholder('Autoresize textarea...'),
                  h.Value(model.values['customMessage'] ?? ''),
                  h.OnInput(value =>
                    InputGroupPreviewMessage.ChangedInputValue({
                      field: 'customMessage',
                      value,
                    }),
                  ),
                  h.Class(
                    'flex field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base outline-none md:text-sm',
                  ),
                ]),
                InputGroup.inputGroupAddon(
                  {
                    align: 'block-end',
                    children: [
                      InputGroup.inputGroupButton(
                        {
                          size: 'sm',
                          variant: 'default',
                          class: 'ml-auto',
                          children: ['Submit'],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'rtl': {
      const t = inputGroupRtlCopy
      return h.div(
        [h.Dir('rtl'), h.Class('grid w-full max-w-sm gap-6')],
        [
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'rtlSearch',
                  'rtl-search',
                  { placeholder: t.placeholder },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Icon.icon('search', {}, h)] },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { align: 'inline-end', children: [t.results] },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'rtlSearching',
                  'rtl-searching',
                  { placeholder: t.searching },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [Spinner.spinner({ isDecorative: true }, h)],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                in_(
                  model,
                  'rtlSaving',
                  'rtl-saving',
                  { placeholder: t.savingChanges },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      InputGroup.inputGroupText({ children: [t.saving] }, h),
                      Spinner.spinner({ isDecorative: true }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          Field.fieldGroup(
            {
              children: [
                Field.field(
                  {
                    children: [
                      lbl('rtl-textarea', t.textareaLabel, h),
                      InputGroup.inputGroup(
                        {
                          children: [
                            area(
                              model,
                              'rtlComment',
                              'rtl-textarea',
                              { placeholder: t.textareaPlaceholder },
                              h,
                            ),
                            InputGroup.inputGroupAddon(
                              {
                                align: 'block-end',
                                children: [
                                  InputGroup.inputGroupText(
                                    { children: [t.characterCount] },
                                    h,
                                  ),
                                  InputGroup.inputGroupButton(
                                    {
                                      variant: 'default',
                                      size: 'sm',
                                      class: 'ml-auto',
                                      children: [t.post],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      dsc(t.textareaDescription, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    }
  }
}

export const inputGroupTailwindPreviewProgram = definePreviewProgram<
  InputGroupPreviewModel,
  InputGroupPreviewMessage
>({
  Model: InputGroupPreviewModel,
  Message: InputGroupPreviewMessage,
  init: index => ({
    _docsPage: 'input-group',
    values: {},
    dropdowns: [
      DropdownMenu.init({
        id: `docs-input-group-${String(index)}-file`,
        isAnimated: false,
      }),
      DropdownMenu.init({
        id: `docs-input-group-${String(index)}-search`,
        isAnimated: false,
      }),
    ],
    popover: Popover.init({
      id: `docs-input-group-${String(index)}-info`,
      isAnimated: false,
    }),
    isFavorite: false,
    isCopied: false,
    isPasswordShown: false,
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedInputValue':
        return {
          model: {
            ...model,
            values: { ...model.values, [message.field]: message.value },
          },
        }
      case 'GotDropdownMessage': {
        const target = model.dropdowns[message.index]
        if (target === undefined) return { model }
        const { model: dropdown, commands: dropdownCommands__ } =
          DropdownMenu.update(target, message.message)
        const commands = dropdownCommands__ ?? []
        return {
          model: {
            ...model,
            dropdowns: model.dropdowns.map((entry, entryIndex) =>
              entryIndex === message.index ? dropdown : entry,
            ),
          },
          commands: Command.mapMessages(commands, next =>
            InputGroupPreviewMessage.GotDropdownMessage({
              index: message.index,
              message: next,
            }),
          ),
        }
      }
      case 'GotPopoverMessage': {
        const { model: popover, commands: popoverCommands__ } = Popover.update(
          model.popover,
          message.message,
        )
        const commands = popoverCommands__ ?? []
        return {
          model: { ...model, popover },
          commands: Command.mapMessages(commands, next =>
            InputGroupPreviewMessage.GotPopoverMessage({ message: next }),
          ),
        }
      }
      case 'ClickedFavorite':
        return { model: { ...model, isFavorite: !model.isFavorite } }
      case 'ClickedShowPassword':
        return {
          model: { ...model, isPasswordShown: !model.isPasswordShown },
        }
      case 'ClickedCopy':
        return { model, commands: [CopyUrl({ text: message.text })] }
      case 'CompletedCopy':
        return {
          model: { ...model, isCopied: true },
          commands: [WaitBeforeClearingCopy()],
        }
      case 'CompletedWaitBeforeClearingCopy':
        return { model: { ...model, isCopied: false } }
    }
  },
  view: (index, model, h) =>
    inputGroupView(
      inputGroupFixtures[index] ?? inputGroupFixtures[0],
      model,
      h,
    ),
})
