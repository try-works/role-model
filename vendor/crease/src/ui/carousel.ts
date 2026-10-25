import type { EmblaPluginType } from 'embla-carousel'
import { Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as CarouselBehavior from '@/lib/carousel'
import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

export * from '@/lib/carousel'

export type CarouselProps<Msg> = Readonly<{
  model: CarouselBehavior.Model
  toParentMessage: (message: CarouselBehavior.Message) => Msg
  items: ReadonlyArray<Html | string>
  ariaLabel?: string
  orientation?: 'horizontal' | 'vertical'
  loop?: boolean
  /** Additional Embla options. Component-level options take precedence. */
  options?: CarouselBehavior.CarouselRuntimeOptions
  /** Embla plugins, such as Autoplay or Wheel Gestures. */
  plugins?: ReadonlyArray<EmblaPluginType>
  /** Number of slides advanced by the controls. */
  slidesToScroll?: number
  /** Slide width/height as a percentage of the viewport; may vary per item. */
  itemSize?: number | ((index: number) => number)
  keyboardNavigation?: boolean
  previousLabel?: string
  nextLabel?: string
  class?: string
}>

export const carousel = <Msg>(
  props: CarouselProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const vertical = props.orientation === 'vertical'
  const count = Math.min(props.model.count, props.items.length)
  const step = Math.max(1, Math.floor(props.slidesToScroll ?? 1))
  const sizeAt = (index: number) =>
    clampPercent(
      typeof props.itemSize === 'function'
        ? props.itemSize(index)
        : (props.itemSize ?? 100),
    )
  return h.section(
    [
      h.Role('region'),
      h.AriaRoleDescription('carousel'),
      h.AriaLabel(props.ariaLabel ?? 'Carousel'),
      h.DataAttribute('slot', 'carousel'),
      h.Class(
        cn(
          'relative outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          props.class,
        ),
      ),
    ],
    [
      h.div(
        [
          h.Tabindex(props.keyboardNavigation === false ? -1 : 0),
          h.DataAttribute('slot', 'carousel-content'),
          h.Class(cn('overflow-hidden outline-none', vertical && 'h-full')),
          h.OnMount({
            name: `embla-carousel-${props.model.id}`,
            f: element =>
              element instanceof HTMLElement
                ? CarouselBehavior.mountCarousel({
                    viewport: element,
                    orientation: vertical ? 'vertical' : 'horizontal',
                    direction: element.closest('[dir="rtl"]') ? 'rtl' : 'ltr',
                    loop: props.loop ?? false,
                    slidesToScroll: step,
                    initialIndex: props.model.index,
                    keyboardNavigation: props.keyboardNavigation !== false,
                    plugins: props.plugins ?? [],
                    ...(props.options === undefined
                      ? {}
                      : { options: props.options }),
                    toMessage: props.toParentMessage,
                  })
                : Stream.empty,
          }),
        ],
        [
          h.div(
            [
              h.Class(
                cn(
                  'flex touch-pan-y',
                  vertical ? '-mt-4 h-full flex-col touch-pan-x' : '-ml-4',
                ),
              ),
            ],
            props.items.map((item, index) =>
              h.div(
                [
                  h.Role('group'),
                  h.AriaRoleDescription('slide'),
                  h.AriaLabel(`${index + 1} of ${props.items.length}`),
                  h.DataAttribute('slot', 'carousel-item'),
                  h.Style({ flexBasis: `${sizeAt(index)}%` }),
                  h.Class(
                    cn(
                      'min-w-0 shrink-0 grow-0 snap-start',
                      vertical ? 'min-h-0 basis-full pt-4' : 'pl-4',
                    ),
                  ),
                ],
                [item],
              ),
            ),
          ),
        ],
      ),
      carouselButton(
        {
          direction: 'previous',
          isDisabled:
            count === 0 || (props.model.index === 0 && props.loop !== true),
          vertical,
          label: props.previousLabel ?? 'Previous slide',
        },
        h,
      ),
      carouselButton(
        {
          direction: 'next',
          isDisabled:
            count === 0 ||
            (props.model.index >= count - 1 && props.loop !== true),
          vertical,
          label: props.nextLabel ?? 'Next slide',
        },
        h,
      ),
    ],
  )
}

const clampPercent = (value: number): number =>
  Math.max(1, Math.min(100, value))

const carouselButton = <Msg>(
  props: Readonly<{
    direction: 'previous' | 'next'
    isDisabled: boolean
    vertical: boolean
    label: string
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const previous = props.direction === 'previous'
  return h.button(
    [
      h.Type('button'),
      h.Disabled(props.isDisabled),
      h.DataAttribute('slot', `carousel-${props.direction}`),
      h.Class(
        cn(
          'absolute flex size-8 items-center justify-center rounded-full border bg-background shadow-xs hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
          props.vertical
            ? `left-1/2 -translate-x-1/2 ${previous ? '-top-12' : '-bottom-12'}`
            : `top-1/2 -translate-y-1/2 ${previous ? '-left-12' : '-right-12'}`,
        ),
      ),
    ],
    [
      props.vertical
        ? previous
          ? Icon.arrowUp<Msg>({ class: 'size-4' }, h)
          : Icon.arrowDown<Msg>({ class: 'size-4' }, h)
        : previous
          ? Icon.arrowLeft<Msg>({ class: 'size-4' }, h)
          : Icon.arrowRight<Msg>({ class: 'size-4' }, h),
      h.span([h.Class('sr-only')], [props.label]),
    ],
  )
}
