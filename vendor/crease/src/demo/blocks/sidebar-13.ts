import { Match as M, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/lib/icon'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbList,
  breadcrumbPage,
  breadcrumbSeparator,
} from '@/ui/breadcrumb'
import { button } from '@/ui/button'
import * as Dialog from '@/ui/dialog'
import {
  sidebar,
  sidebarContent,
  sidebarGroup,
  sidebarGroupContent,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuItem,
  sidebarProvider,
} from '@/ui/sidebar'

export const data = {
  nav: [
    { name: 'Notifications', icon: 'bell' },
    { name: 'Navigation', icon: 'menu' },
    { name: 'Home', icon: 'house' },
    { name: 'Appearance', icon: 'paintbrush' },
    { name: 'Messages & media', icon: 'message-circle' },
    { name: 'Language & region', icon: 'globe' },
    { name: 'Accessibility', icon: 'keyboard' },
    { name: 'Mark as read', icon: 'check' },
    { name: 'Audio & video', icon: 'video' },
    { name: 'Connected accounts', icon: 'link' },
    { name: 'Privacy & visibility', icon: 'lock' },
    { name: 'Advanced', icon: 'settings' },
  ],
}

export const Model = S.Struct({
  isSidebarOpen: S.Boolean,
  dialog: Dialog.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledSidebar: {},
  OpenedSettings: {},
  GotDialogMessage: {
    message: Dialog.Message,
  },
})
export type Message = typeof Message.Type

export const init = (): Model => ({
  isSidebarOpen: true,
  dialog: Dialog.init({
    id: 'sidebar-13-settings-dialog',
    isAnimated: true,
  }),
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ToggledSidebar: () => ({
        model: modifyFields(model, { isSidebarOpen: current => !current }),
      }),
      OpenedSettings: () => {
        const { model: dialog, commands: dialogCommands__ } = Dialog.open(
          model.dialog,
        )
        const commands = dialogCommands__ ?? []
        return {
          model: modifyFields(model, { dialog: () => dialog }),
          commands: Command.mapMessages(commands, next =>
            Message.GotDialogMessage({ message: next }),
          ),
        }
      },
      GotDialogMessage: ({ message: childMessage }) => {
        const { model: dialog, commands: dialogCommands__ } = Dialog.update(
          model.dialog,
          childMessage,
        )
        const commands = dialogCommands__ ?? []
        return {
          model: modifyFields(model, { dialog: () => dialog }),
          commands: Command.mapMessages(commands, next =>
            Message.GotDialogMessage({ message: next }),
          ),
        }
      },
    }),
  )

const settingsSidebar = (h: HtmlBuilder<Message>): Html =>
  sidebar(
    {
      state: 'expanded',
      collapsible: 'none',
      class: 'hidden md:flex',
      children: [
        sidebarContent(
          {
            children: [
              sidebarGroup(
                {
                  children: [
                    sidebarGroupContent(
                      {
                        children: [
                          sidebarMenu(
                            {
                              children: data.nav.map(item =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          href: '#',
                                          isActive:
                                            item.name === 'Messages & media',
                                          children: [
                                            Icon.icon(item.icon, {}, h),
                                            item.name,
                                          ],
                                        },
                                        h,
                                      ),
                                    ],
                                  },
                                  h,
                                ),
                              ),
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
      ],
    },
    h,
  )

const settingsMain = (h: HtmlBuilder<Message>): Html => {
  return h.main(
    [h.Class('flex h-[480px] flex-1 flex-col overflow-hidden')],
    [
      h.header(
        [
          h.Class(
            'flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-center gap-2 px-4')],
            [
              breadcrumb(
                {
                  children: [
                    breadcrumbList(
                      {
                        children: [
                          breadcrumbItem(
                            {
                              class: 'hidden md:block',
                              children: [
                                breadcrumbLink(
                                  {
                                    href: '#',
                                    children: ['Settings'],
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          breadcrumbSeparator({ class: 'hidden md:block' }, h),
                          breadcrumbItem(
                            {
                              children: [
                                breadcrumbPage(
                                  {
                                    children: ['Messages & media'],
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
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0')],
        Array.from({ length: 10 }, () =>
          h.div([h.Class('aspect-video max-w-3xl rounded-xl bg-muted/50')], []),
        ),
      ),
    ],
  )
}

const settingsDialog = (model: Dialog.Model, h: HtmlBuilder<Message>): Html =>
  Dialog.dialog<Message>(
    {
      model,
      toParentMessage: message => Message.GotDialogMessage({ message }),
      title: 'Settings',
      description: 'Customize your settings here.',
      showCloseButton: true,
      class:
        'overflow-hidden p-0 [&_[data-slot=dialog-header]]:px-6 [&_[data-slot=dialog-header]]:pt-6 md:max-h-[560px] md:max-w-[700px] lg:max-w-[800px]',
      content: () => [
        sidebarProvider(
          {
            state: 'expanded',
            class: 'items-start min-h-0',
            children: [settingsSidebar(h), settingsMain(h)],
          },
          h,
        ),
      ],
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [
      h.Class('flex h-svh items-center justify-center'),
      h.OnMount({
        name: 'open-settings-preview',
        f: () => Stream.succeed(Message.OpenedSettings()),
      }),
    ],
    [
      button(
        {
          size: 'sm',
          onClick: Message.OpenedSettings(),
          children: ['Open Dialog'],
        },
        h,
      ),
      settingsDialog(model.dialog, h),
    ],
  )
}

// PORT NOTE: The dialog wrapper supplies the native dialog framing and
// accessible title/description. Unlike the source's visually hidden heading,
// the installed wrapper renders that heading visibly before the two-pane
// content; it does not expose title attributes. The settings sidebar and
// independently scrolling settings pane otherwise preserve the source.
