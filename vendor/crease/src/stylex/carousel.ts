import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { EmblaPluginType } from 'embla-carousel'
import { Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as CarouselBehavior from '@/lib/carousel'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

export * from '@/lib/carousel'

export type CarouselProps<Msg> = Readonly<{
  model: CarouselBehavior.Model
  toParentMessage: (message: CarouselBehavior.Message) => Msg
  items: ReadonlyArray<Html | string>
  ariaLabel?: string
  orientation?: 'horizontal' | 'vertical'
  loop?: boolean
  options?: CarouselBehavior.CarouselRuntimeOptions
  plugins?: ReadonlyArray<EmblaPluginType>
  slidesToScroll?: number
  itemSize?: number | ((index: number) => number)
  keyboardNavigation?: boolean
  previousLabel?: string
  nextLabel?: string
  layoutStyle?: ComponentLayoutStyle
}>

const styles = stylex.create({
  button: {
    borderColor: tokens.border,
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: { default: tokens.background, ':hover': tokens.accent },
    boxShadow: tokens.shadowSm,
    display: 'flex',
    justifyContent: 'center',
    opacity: { default: null, ':disabled': 0.5 },
    pointerEvents: { default: null, ':disabled': 'none' },
    position: 'absolute',
    height: '2rem',
    width: '2rem',
  },
  buttonDisabled: { opacity: 0.5, pointerEvents: 'none' },
  content: { overflow: 'hidden', outlineStyle: 'none' },
  contentVertical: { height: '100%' },
  horizontalItem: { paddingLeft: '1rem' },
  horizontalPrevious: {
    transform: 'translateY(-50%)',
    left: '-3rem',
    top: '50%',
  },
  horizontalNext: { transform: 'translateY(-50%)', right: '-3rem', top: '50%' },
  item: { flexGrow: 0, flexShrink: 0, scrollSnapAlign: 'start', minWidth: 0 },
  root: {
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    outlineStyle: 'none',
    position: 'relative',
  },
  srOnly: {
    margin: -1,
    padding: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
  track: { display: 'flex', touchAction: 'pan-y', marginLeft: '-1rem' },
  trackVertical: {
    flexDirection: 'column',
    touchAction: 'pan-x',
    height: '100%',
    marginLeft: 0,
    marginTop: '-1rem',
  },
  verticalItem: { minHeight: 0, paddingTop: '1rem' },
  verticalPrevious: {
    transform: 'translateX(-50%)',
    left: '50%',
    top: '-3rem',
  },
  verticalNext: { transform: 'translateX(-50%)', bottom: '-3rem', left: '50%' },
})

const clampPercent = (value: number): number =>
  Math.max(1, Math.min(100, value))

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
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      h.div(
        [
          h.Tabindex(props.keyboardNavigation === false ? -1 : 0),
          h.DataAttribute('slot', 'carousel-content'),
          h.Class(
            className(styles.content, vertical && styles.contentVertical),
          ),
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
                className(styles.track, vertical && styles.trackVertical),
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
                    className(
                      styles.item,
                      vertical ? styles.verticalItem : styles.horizontalItem,
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
  const placement = props.vertical
    ? previous
      ? styles.verticalPrevious
      : styles.verticalNext
    : previous
      ? styles.horizontalPrevious
      : styles.horizontalNext
  return h.button(
    [
      h.Type('button'),
      h.Disabled(props.isDisabled),
      h.DataAttribute('slot', `carousel-${props.direction}`),
      h.Class(
        className(
          reset.button,
          styles.button,
          placement,
          props.isDisabled && styles.buttonDisabled,
        ),
      ),
    ],
    [
      props.vertical
        ? previous
          ? Icon.arrowUp<Msg>({}, h)
          : Icon.arrowDown<Msg>({}, h)
        : previous
          ? Icon.arrowLeft<Msg>({}, h)
          : Icon.arrowRight<Msg>({}, h),
      h.span([h.Class(className(styles.srOnly))], [props.label]),
    ],
  )
}
