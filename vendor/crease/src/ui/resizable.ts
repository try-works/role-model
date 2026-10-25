import { Option, Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

const Drag = S.Struct({ start: S.Number, initialSize: S.Number })
export const Model = S.Struct({
  id: S.String,
  firstSize: S.Number,
  drag: S.Option(Drag),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  StartedResize: { position: S.Number },
  DraggedResize: {
    position: S.Number,
    extent: S.Number,
  },
  EndedResize: {},
  NudgedResize: { delta: S.Number },
})
export type Message = typeof Message.Type

const clampTo = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))
const clamp = (value: number): number => clampTo(value, 10, 90)
export const init = (id: string, firstSize = 50): Model => ({
  id,
  firstSize: clamp(firstSize),
  drag: Option.none(),
})
export const update = (model: Model, message: Message): Model => {
  switch (message._tag) {
    case 'StartedResize':
      return {
        ...model,
        drag: Option.some({
          start: message.position,
          initialSize: model.firstSize,
        }),
      }
    case 'DraggedResize':
      return Option.match(model.drag, {
        onNone: () => model,
        onSome: drag => ({
          ...model,
          firstSize: clamp(
            drag.initialSize +
              ((message.position - drag.start) / Math.max(1, message.extent)) *
                100,
          ),
        }),
      })
    case 'EndedResize':
      return { ...model, drag: Option.none() }
    case 'NudgedResize':
      return { ...model, firstSize: clamp(model.firstSize + message.delta) }
  }
}

export type ResizableProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  first: Html | string
  second: Html | string
  direction?: 'horizontal' | 'vertical'
  rtl?: boolean
  withHandle?: boolean
  minSize?: number
  maxSize?: number
  /** Pixel extent of the panel group. Supply this when the group is not viewport-sized. */
  extent?: number
  keyboardStep?: number
  disabled?: boolean
  ariaLabel?: string
  class?: string
}>

export const resizable = <Msg>(
  props: ResizableProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const vertical = props.direction === 'vertical'
  const rtl = props.rtl === true && !vertical
  const dragging = Option.isSome(props.model.drag)
  const minSize = clampTo(props.minSize ?? 10, 0, 100)
  const maxSize = clampTo(props.maxSize ?? 90, minSize, 100)
  const size = clampTo(props.model.firstSize, minSize, maxSize)
  const extent = Math.max(
    1,
    props.extent ?? (vertical ? window.innerHeight : window.innerWidth),
  )
  return h.div(
    [
      h.DataAttribute('slot', 'resizable-panel-group'),
      h.DataAttribute('direction', vertical ? 'vertical' : 'horizontal'),
      ...(rtl ? [h.Dir('rtl')] : []),
      h.OnPointerMove((screenX, screenY) =>
        dragging && props.disabled !== true
          ? Option.some(
              props.toParentMessage(
                Message.DraggedResize({
                  position: vertical ? screenY : rtl ? -screenX : screenX,
                  extent,
                }),
              ),
            )
          : Option.none(),
      ),
      h.OnPointerUp(() =>
        dragging
          ? Option.some(props.toParentMessage(Message.EndedResize()))
          : Option.none(),
      ),
      h.Class(
        cn(
          'flex size-full overflow-hidden rounded-lg border data-[direction=vertical]:flex-col',
          dragging ? 'select-none' : undefined,
          props.class,
        ),
      ),
    ],
    [
      panel({ size, children: props.first }, h),
      h.div(
        [
          h.Role('separator'),
          h.AriaLabel(props.ariaLabel ?? 'Resize panels'),
          h.AriaOrientation(vertical ? 'horizontal' : 'vertical'),
          h.AriaValuemin(minSize),
          h.AriaValuemax(maxSize),
          h.AriaValuenow(Math.round(size)),
          h.AriaDisabled(props.disabled === true),
          h.Tabindex(props.disabled === true ? -1 : 0),
          h.DataAttribute('slot', 'resizable-handle'),
          h.DataAttribute('direction', vertical ? 'vertical' : 'horizontal'),
          h.OnPointerDown((_type, button, screenX, screenY) =>
            button === 0 && props.disabled !== true
              ? Option.some(
                  props.toParentMessage(
                    Message.StartedResize({
                      position: vertical ? screenY : rtl ? -screenX : screenX,
                    }),
                  ),
                )
              : Option.none(),
          ),
          h.OnKeyDownPreventDefault((key, modifiers) => {
            if (
              props.disabled === true ||
              modifiers.ctrlKey ||
              modifiers.altKey ||
              modifiers.metaKey
            )
              return Option.none()
            const step = props.keyboardStep ?? 2
            if (
              key === (vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft')
            )
              return Option.some(
                props.toParentMessage(Message.NudgedResize({ delta: -step })),
              )
            if (
              key ===
              (vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight')
            )
              return Option.some(
                props.toParentMessage(Message.NudgedResize({ delta: step })),
              )
            if (key === 'Home')
              return Option.some(
                props.toParentMessage(
                  Message.NudgedResize({ delta: minSize - size }),
                ),
              )
            if (key === 'End')
              return Option.some(
                props.toParentMessage(
                  Message.NudgedResize({ delta: maxSize - size }),
                ),
              )
            return Option.none()
          }),
          h.Class(
            cn(
              'relative flex touch-none w-px items-center justify-center bg-border outline-none focus-visible:ring-1 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
              vertical
                ? 'h-px w-full cursor-row-resize'
                : 'h-full w-px cursor-col-resize',
            ),
          ),
        ],
        [
          // Invisible ±6px hit target — the visible line stays 1px but the
          // strip drags from anywhere near it.
          h.div(
            [
              h.AriaHidden(true),
              h.Class(
                vertical
                  ? 'absolute inset-x-0 -inset-y-1.5'
                  : 'absolute inset-y-0 -inset-x-1.5',
              ),
            ],
            [],
          ),
          ...(props.withHandle === true
            ? [
                h.div(
                  [
                    h.Class(
                      'z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border',
                    ),
                  ],
                  [
                    Icon.gripVertical<Msg>(
                      {
                        class: cn(
                          'size-2.5',
                          vertical ? 'rotate-90' : undefined,
                        ),
                      },
                      h,
                    ),
                  ],
                ),
              ]
            : []),
        ],
      ),
      panel({ size: 100 - size, children: props.second }, h),
    ],
  )
}

const panel = <Msg>(
  props: Readonly<{ size: number; children: Html | string }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'resizable-panel'),
      h.Style({ flexBasis: `${props.size}%` }),
      h.Class('min-h-0 min-w-0 shrink-0 overflow-auto'),
    ],
    [props.children],
  )
}

// Multi-panel API. The original two-panel API above remains source-compatible.
const GroupDrag = S.Struct({
  handle: S.Number,
  start: S.Number,
  before: S.Number,
  after: S.Number,
})
export const GroupModel = S.Struct({
  id: S.String,
  sizes: S.Array(S.Number),
  drag: S.Option(GroupDrag),
})
export type GroupModel = typeof GroupModel.Type

export const GroupMessage = defineMessageUnion({
  StartedGroupResize: {
    handle: S.Number,
    position: S.Number,
  },
  DraggedGroupResize: {
    position: S.Number,
    extent: S.Number,
    minSize: S.Number,
  },
  EndedGroupResize: {},
  NudgedGroupResize: {
    handle: S.Number,
    delta: S.Number,
    minSize: S.Number,
  },
})
export type GroupMessage = typeof GroupMessage.Type

const normalizedSizes = (
  count: number,
  sizes?: ReadonlyArray<number>,
): Array<number> => {
  if (count <= 0) return []
  const source =
    sizes?.length === count
      ? sizes.map(value => Math.max(0, value))
      : Array.from({ length: count }, () => 1)
  const total = source.reduce((sum, value) => sum + value, 0) || count
  return source.map(value => (value / total) * 100)
}

export const initGroup = (
  id: string,
  panelCount: number,
  sizes?: ReadonlyArray<number>,
): GroupModel => ({
  id,
  sizes: normalizedSizes(panelCount, sizes),
  drag: Option.none(),
})

const resizePair = (
  sizes: ReadonlyArray<number>,
  handle: number,
  delta: number,
  minSize: number,
): Array<number> => {
  const next = [...sizes]
  const before = sizes[handle]
  const after = sizes[handle + 1]
  if (before === undefined || after === undefined) return next
  const bounded = Math.max(minSize - before, Math.min(after - minSize, delta))
  next[handle] = before + bounded
  next[handle + 1] = after - bounded
  return next
}

export const updateGroup = (
  model: GroupModel,
  message: GroupMessage,
): GroupModel => {
  switch (message._tag) {
    case 'StartedGroupResize': {
      const before = model.sizes[message.handle]
      const after = model.sizes[message.handle + 1]
      return before === undefined || after === undefined
        ? model
        : {
            ...model,
            drag: Option.some({
              handle: message.handle,
              start: message.position,
              before,
              after,
            }),
          }
    }
    case 'DraggedGroupResize':
      return Option.match(model.drag, {
        onNone: () => model,
        onSome: drag => {
          const base = [...model.sizes]
          base[drag.handle] = drag.before
          base[drag.handle + 1] = drag.after
          return {
            ...model,
            sizes: resizePair(
              base,
              drag.handle,
              ((message.position - drag.start) / Math.max(1, message.extent)) *
                100,
              message.minSize,
            ),
          }
        },
      })
    case 'EndedGroupResize':
      return { ...model, drag: Option.none() }
    case 'NudgedGroupResize':
      return {
        ...model,
        sizes: resizePair(
          model.sizes,
          message.handle,
          message.delta,
          message.minSize,
        ),
      }
  }
}

export type ResizableGroupProps<Msg> = Readonly<{
  model: GroupModel
  toParentMessage: (message: GroupMessage) => Msg
  panels: ReadonlyArray<Html | string>
  direction?: 'horizontal' | 'vertical'
  rtl?: boolean
  minSize?: number
  extent: number
  withHandles?: boolean
  disabled?: boolean
  class?: string
}>

export const resizableGroup = <Msg>(
  props: ResizableGroupProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const vertical = props.direction === 'vertical'
  const rtl = props.rtl === true && !vertical
  const dragging = Option.isSome(props.model.drag)
  const minSize = Math.max(0, props.minSize ?? 5)
  const children: Array<Html> = []
  props.panels.forEach((child, index) => {
    children.push(
      panel({ size: props.model.sizes[index] ?? 0, children: child }, h),
    )
    if (index >= props.panels.length - 1) return
    const value = props.model.sizes
      .slice(0, index + 1)
      .reduce((sum, size) => sum + size, 0)
    children.push(
      h.div(
        [
          h.Role('separator'),
          h.AriaOrientation(vertical ? 'horizontal' : 'vertical'),
          h.AriaValuemin(minSize),
          h.AriaValuemax(100 - minSize),
          h.AriaValuenow(Math.round(value)),
          h.AriaDisabled(props.disabled === true),
          h.Tabindex(props.disabled === true ? -1 : 0),
          h.DataAttribute('slot', 'resizable-handle'),
          h.OnPointerDown((_type, button, x, y) =>
            button === 0 && props.disabled !== true
              ? Option.some(
                  props.toParentMessage(
                    GroupMessage.StartedGroupResize({
                      handle: index,
                      position: vertical ? y : rtl ? -x : x,
                    }),
                  ),
                )
              : Option.none(),
          ),
          h.OnKeyDownPreventDefault((key, modifiers) =>
            props.disabled === true ||
            modifiers.ctrlKey ||
            modifiers.altKey ||
            modifiers.metaKey
              ? Option.none()
              : key ===
                  (vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft')
                ? Option.some(
                    props.toParentMessage(
                      GroupMessage.NudgedGroupResize({
                        handle: index,
                        delta: -2,
                        minSize,
                      }),
                    ),
                  )
                : key ===
                    (vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight')
                  ? Option.some(
                      props.toParentMessage(
                        GroupMessage.NudgedGroupResize({
                          handle: index,
                          delta: 2,
                          minSize,
                        }),
                      ),
                    )
                  : Option.none(),
          ),
          h.Class(
            cn(
              'relative flex touch-none items-center justify-center bg-border outline-none focus-visible:ring-1 focus-visible:ring-ring',
              vertical
                ? 'h-px w-full cursor-row-resize'
                : 'h-full w-px cursor-col-resize',
            ),
          ),
        ],
        [
          h.div(
            [
              h.AriaHidden(true),
              h.Class(
                vertical
                  ? 'absolute inset-x-0 -inset-y-1.5'
                  : 'absolute inset-y-0 -inset-x-1.5',
              ),
            ],
            [],
          ),
          ...(props.withHandles === true
            ? [
                h.div(
                  [
                    h.Class(
                      'z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border',
                    ),
                  ],
                  [
                    Icon.gripVertical<Msg>(
                      {
                        class: cn(
                          'size-2.5',
                          vertical ? 'rotate-90' : undefined,
                        ),
                      },
                      h,
                    ),
                  ],
                ),
              ]
            : []),
        ],
      ),
    )
  })
  return h.div(
    [
      h.DataAttribute('slot', 'resizable-panel-group'),
      h.DataAttribute('direction', vertical ? 'vertical' : 'horizontal'),
      ...(rtl ? [h.Dir('rtl')] : []),
      h.OnPointerMove((x, y) =>
        dragging && props.disabled !== true
          ? Option.some(
              props.toParentMessage(
                GroupMessage.DraggedGroupResize({
                  position: vertical ? y : rtl ? -x : x,
                  extent: props.extent,
                  minSize,
                }),
              ),
            )
          : Option.none(),
      ),
      h.OnPointerUp(() =>
        dragging
          ? Option.some(props.toParentMessage(GroupMessage.EndedGroupResize()))
          : Option.none(),
      ),
      h.Class(
        cn(
          'flex size-full overflow-hidden rounded-lg border',
          vertical ? 'flex-col' : undefined,
          dragging ? 'select-none' : undefined,
          props.class,
        ),
      ),
    ],
    children,
  )
}
