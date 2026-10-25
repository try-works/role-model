import EmblaCarousel, {
  type EmblaOptionsType,
  type EmblaPluginType,
} from 'embla-carousel'
import { Effect, Queue, Schema as S, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Model = S.Struct({
  id: S.String,
  index: S.Number,
  count: S.Number,
})
export type Model = typeof Model.Type

/** Selection is reported by the mounted Embla resource; it is not predicted by the view. */

export const Message = defineMessageUnion({
  WentTo: { index: S.Number },
})
export type Message = typeof Message.Type

export const init = (id: string, count: number, index = 0): Model => ({
  id,
  count: Math.max(0, count),
  index: Math.max(0, Math.min(index, Math.max(0, count - 1))),
})

export const update = (model: Model, message: Message): Model =>
  model.count === 0
    ? model
    : { ...model, index: Math.max(0, Math.min(message.index, model.count - 1)) }

export type CarouselRuntimeOptions = Omit<
  EmblaOptionsType,
  'axis' | 'direction' | 'loop' | 'slidesToScroll'
>

export const mountCarousel = <Msg>(
  props: Readonly<{
    viewport: HTMLElement
    orientation: 'horizontal' | 'vertical'
    direction: 'ltr' | 'rtl'
    loop: boolean
    slidesToScroll: number
    initialIndex: number
    keyboardNavigation: boolean
    plugins: ReadonlyArray<EmblaPluginType>
    options?: CarouselRuntimeOptions
    toMessage: (message: Message) => Msg
  }>,
): Stream.Stream<Msg> =>
  Stream.callback(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const root = props.viewport.parentElement
        const previousButton = root?.querySelector<HTMLElement>(
          '[data-slot="carousel-previous"]',
        )
        const nextButton = root?.querySelector<HTMLElement>(
          '[data-slot="carousel-next"]',
        )
        const reducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        const api = EmblaCarousel(
          props.viewport,
          {
            ...props.options,
            axis: props.orientation === 'vertical' ? 'y' : 'x',
            direction: props.direction,
            ...(reducedMotion ? { duration: 0 } : {}),
            loop: props.loop,
            slidesToScroll: props.slidesToScroll,
            startIndex: props.initialIndex,
          },
          reducedMotion ? [] : [...props.plugins],
        )
        const emitSelection = () =>
          Queue.offerUnsafe(
            queue,
            props.toMessage(
              Message.WentTo({ index: api.selectedScrollSnap() }),
            ),
          )
        const updateButtons = () => {
          if (previousButton instanceof HTMLButtonElement)
            previousButton.disabled = !api.canScrollPrev()
          if (nextButton instanceof HTMLButtonElement)
            nextButton.disabled = !api.canScrollNext()
        }
        const previous = () => api.scrollPrev()
        const next = () => api.scrollNext()
        const onKeyDown = (event: KeyboardEvent) => {
          if (!props.keyboardNavigation) return
          const previousKey =
            props.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
          const nextKey =
            props.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
          if (event.key === previousKey) api.scrollPrev()
          else if (event.key === nextKey) api.scrollNext()
          else if (event.key === 'Home') api.scrollTo(0)
          else if (event.key === 'End')
            api.scrollTo(api.scrollSnapList().length - 1)
          else return
          event.preventDefault()
        }

        previousButton?.addEventListener('click', previous)
        nextButton?.addEventListener('click', next)
        props.viewport.addEventListener('keydown', onKeyDown)
        api.on('select', emitSelection)
        api.on('select', updateButtons)
        api.on('reInit', updateButtons)
        updateButtons()

        return () => {
          previousButton?.removeEventListener('click', previous)
          nextButton?.removeEventListener('click', next)
          props.viewport.removeEventListener('keydown', onKeyDown)
          api.off('select', emitSelection)
          api.off('select', updateButtons)
          api.off('reInit', updateButtons)
          api.destroy()
        }
      }),
      cleanup => Effect.sync(cleanup),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
