import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineView } from 'foldkit/submodel'
import { modifyFields } from 'foldkit/struct'

import * as B01 from '@/demo/blocks/sidebar-01'
import * as B02 from '@/demo/blocks/sidebar-02'
import * as B03 from '@/demo/blocks/sidebar-03'
import * as B04 from '@/demo/blocks/sidebar-04'
import * as B05 from '@/demo/blocks/sidebar-05'
import * as B06 from '@/demo/blocks/sidebar-06'
import * as B07 from '@/demo/blocks/sidebar-07'
import * as B08 from '@/demo/blocks/sidebar-08'
import * as B09 from '@/demo/blocks/sidebar-09'
import * as B10 from '@/demo/blocks/sidebar-10'
import * as B11 from '@/demo/blocks/sidebar-11'
import * as B12 from '@/demo/blocks/sidebar-12'
import * as B13 from '@/demo/blocks/sidebar-13'
import * as B14 from '@/demo/blocks/sidebar-14'
import * as B15 from '@/demo/blocks/sidebar-15'
import * as B16 from '@/demo/blocks/sidebar-16'

/* One submodel wrapping all 16 sidebar blocks so main.ts wires a single field.
   Each block module owns its Elm quadruple; this file only aggregates. */

// MODEL

export const Model = S.Struct({
  b01: B01.Model,
  b02: B02.Model,
  b03: B03.Model,
  b04: B04.Model,
  b05: B05.Model,
  b06: B06.Model,
  b07: B07.Model,
  b08: B08.Model,
  b09: B09.Model,
  b10: B10.Model,
  b11: B11.Model,
  b12: B12.Model,
  b13: B13.Model,
  b14: B14.Model,
  b15: B15.Model,
  b16: B16.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotB01: { message: B01.Message },
  GotB02: { message: B02.Message },
  GotB03: { message: B03.Message },
  GotB04: { message: B04.Message },
  GotB05: { message: B05.Message },
  GotB06: { message: B06.Message },
  GotB07: { message: B07.Message },
  GotB08: { message: B08.Message },
  GotB09: { message: B09.Message },
  GotB10: { message: B10.Message },
  GotB11: { message: B11.Message },
  GotB12: { message: B12.Message },
  GotB13: { message: B13.Message },
  GotB14: { message: B14.Message },
  GotB15: { message: B15.Message },
  GotB16: { message: B16.Message },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  b01: B01.init(),
  b02: B02.init(),
  b03: B03.init(),
  b04: B04.init(),
  b05: B05.init(),
  b06: B06.init(),
  b07: B07.init(),
  b08: B08.init(),
  b09: B09.init(),
  b10: B10.init(),
  b11: B11.init(),
  b12: B12.init(),
  b13: B13.init(),
  b14: B14.init(),
  b15: B15.init(),
  b16: B16.init(),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotB01: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B01.update(
          model.b01,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b01: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB01({ message: inner }),
          ),
        }
      },
      GotB02: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B02.update(
          model.b02,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b02: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB02({ message: inner }),
          ),
        }
      },
      GotB03: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B03.update(
          model.b03,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b03: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB03({ message: inner }),
          ),
        }
      },
      GotB04: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B04.update(
          model.b04,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b04: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB04({ message: inner }),
          ),
        }
      },
      GotB05: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B05.update(
          model.b05,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b05: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB05({ message: inner }),
          ),
        }
      },
      GotB06: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B06.update(
          model.b06,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b06: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB06({ message: inner }),
          ),
        }
      },
      GotB07: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B07.update(
          model.b07,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b07: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB07({ message: inner }),
          ),
        }
      },
      GotB08: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B08.update(
          model.b08,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b08: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB08({ message: inner }),
          ),
        }
      },
      GotB09: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B09.update(
          model.b09,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b09: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB09({ message: inner }),
          ),
        }
      },
      GotB10: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B10.update(
          model.b10,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b10: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB10({ message: inner }),
          ),
        }
      },
      GotB11: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B11.update(
          model.b11,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b11: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB11({ message: inner }),
          ),
        }
      },
      GotB12: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B12.update(
          model.b12,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b12: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB12({ message: inner }),
          ),
        }
      },
      GotB13: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B13.update(
          model.b13,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b13: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB13({ message: inner }),
          ),
        }
      },
      GotB14: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B14.update(
          model.b14,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b14: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB14({ message: inner }),
          ),
        }
      },
      GotB15: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B15.update(
          model.b15,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b15: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB15({ message: inner }),
          ),
        }
      },
      GotB16: ({ message: child }) => {
        const { model: next, commands: nextCommands__ } = B16.update(
          model.b16,
          child,
        )
        const commands = nextCommands__ ?? []
        return {
          model: modifyFields(model, { b16: () => next }),
          commands: Command.mapMessages(commands, inner =>
            Message.GotB16({ message: inner }),
          ),
        }
      },
    }),
  )

// VIEW

const v01 = defineView<B01.Model, B01.Message>(B01.view)
const v02 = defineView<B02.Model, B02.Message>(B02.view)
const v03 = defineView<B03.Model, B03.Message>(B03.view)
const v04 = defineView<B04.Model, B04.Message>(B04.view)
const v05 = defineView<B05.Model, B05.Message>(B05.view)
const v06 = defineView<B06.Model, B06.Message>(B06.view)
const v07 = defineView<B07.Model, B07.Message>(B07.view)
const v08 = defineView<B08.Model, B08.Message>(B08.view)
const v09 = defineView<B09.Model, B09.Message>(B09.view)
const v10 = defineView<B10.Model, B10.Message>(B10.view)
const v11 = defineView<B11.Model, B11.Message>(B11.view)
const v12 = defineView<B12.Model, B12.Message>(B12.view)
const v13 = defineView<B13.Model, B13.Message>(B13.view)
const v14 = defineView<B14.Model, B14.Message>(B14.view)
const v15 = defineView<B15.Model, B15.Message>(B15.view)
const v16 = defineView<B16.Model, B16.Message>(B16.view)

const withHtml = M.withReturnType<Html>()

export const view = (
  model: Model,
  blockId: string,
  h: HtmlBuilder<Message>,
): Html => {
  const embed = <ChildModel, ChildMessage>(
    id: string,
    childModel: ChildModel,
    childView: ReturnType<typeof defineView<ChildModel, ChildMessage>>,
    wrap: (message: ChildMessage) => Message,
  ): Html =>
    h.keyed('div')(
      `block-${id}`,
      [],
      [
        h.submodel({
          slotId: `block-${id}`,
          model: childModel,
          view: childView,
          toParentMessage: wrap,
        }),
      ],
    )

  return M.value(blockId).pipe(
    withHtml,
    M.when('01', () =>
      embed('01', model.b01, v01, message => Message.GotB01({ message })),
    ),
    M.when('02', () =>
      embed('02', model.b02, v02, message => Message.GotB02({ message })),
    ),
    M.when('03', () =>
      embed('03', model.b03, v03, message => Message.GotB03({ message })),
    ),
    M.when('04', () =>
      embed('04', model.b04, v04, message => Message.GotB04({ message })),
    ),
    M.when('05', () =>
      embed('05', model.b05, v05, message => Message.GotB05({ message })),
    ),
    M.when('06', () =>
      embed('06', model.b06, v06, message => Message.GotB06({ message })),
    ),
    M.when('07', () =>
      embed('07', model.b07, v07, message => Message.GotB07({ message })),
    ),
    M.when('08', () =>
      embed('08', model.b08, v08, message => Message.GotB08({ message })),
    ),
    M.when('09', () =>
      embed('09', model.b09, v09, message => Message.GotB09({ message })),
    ),
    M.when('10', () =>
      embed('10', model.b10, v10, message => Message.GotB10({ message })),
    ),
    M.when('11', () =>
      embed('11', model.b11, v11, message => Message.GotB11({ message })),
    ),
    M.when('12', () =>
      embed('12', model.b12, v12, message => Message.GotB12({ message })),
    ),
    M.when('13', () =>
      embed('13', model.b13, v13, message => Message.GotB13({ message })),
    ),
    M.when('14', () =>
      embed('14', model.b14, v14, message => Message.GotB14({ message })),
    ),
    M.when('15', () =>
      embed('15', model.b15, v15, message => Message.GotB15({ message })),
    ),
    M.when('16', () =>
      embed('16', model.b16, v16, message => Message.GotB16({ message })),
    ),
    M.orElse(() =>
      h.div(
        [
          h.Class(
            'flex min-h-svh items-center justify-center text-sm text-muted-foreground',
          ),
        ],
        [`Unknown block: sidebar-${blockId}`],
      ),
    ),
  )
}
