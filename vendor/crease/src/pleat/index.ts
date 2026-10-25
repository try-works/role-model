/**
 * Collision-safe public catalog for the complete StyleX component family.
 *
 * Component modules intentionally export common Elm names such as `Model`,
 * `Message`, `init`, and `update`, so flat star exports would be ambiguous.
 */
export * as Accordion from './accordion.js'
export * as ActionBar from './action-bar.js'
export * as AlertDialog from './alert-dialog.js'
export * as Alert from './alert.js'
export * as AspectRatio from './aspect-ratio.js'
export * as Attachment from './attachment.js'
export * as AvatarGroup from './avatar-group.js'
export * as Avatar from './avatar.js'
export * as Badge from './badge.js'
export * as Banner from './banner.js'
export * as Blockquote from './blockquote.js'
export * as Breadcrumb from './breadcrumb.js'
export * as Bubble from './bubble.js'
export * as ButtonGroup from './button-group.js'
export * as Button from './button.js'
export * as Calendar from './calendar.js'
export * as Card from './card.js'
export * as Carousel from './carousel.js'
export * as Center from './center.js'
export * as Chart from './chart.js'
export * as ChatReasoning from './chat-reasoning.js'
export * as Checkbox from './checkbox.js'
export * as CircularProgress from './circular-progress.js'
export * as CodeBlock from './code-block.js'
export * as Code from './code.js'
export * as Collapsible from './collapsible.js'
export * as Combobox from './combobox.js'
export * as Command from './command.js'
export * as ContextMenu from './context-menu.js'
export * as DataGrid from './data-grid.js'
export * as DataTable from './data-table.js'
export * as DateInput from './date-input.js'
export * as DatePicker from './date-picker.js'
export * as DateRangeInput from './date-range-input.js'
export * as DateTimeInput from './date-time-input.js'
export * as Dialog from './dialog.js'
export * as Direction from './direction.js'
export * as Drawer from './drawer.js'
export * as DropdownMenu from './dropdown-menu.js'
export * as Empty from './empty.js'
export * as FieldStatus from './field-status.js'
export * as Field from './field.js'
export * as FileInput from './file-input.js'
export * as Form from './form.js'
export * as Grid from './grid.js'
export * as Heading from './heading.js'
export * as HoverCard from './hover-card.js'
export * as Indicator from './indicator.js'
export * as InfoTip from './info-tip.js'
export * as InputGroup from './input-group.js'
export * as InputOtp from './input-otp.js'
export * as Input from './input.js'
export * as Item from './item.js'
export * as Kbd from './kbd.js'
export * as Label from './label.js'
export * as Lightbox from './lightbox.js'
export * as Link from './link.js'
export * as ListInput from './list-input.js'
export * as List from './list.js'
export * as LogStream from './log-stream.js'
export * as MapArc from './map-arc.js'
export * as MapCluster from './map-cluster.js'
export * as MapControls from './map-controls.js'
export * as MapGeojson from './map-geojson.js'
export * as MapLocalization from './map-localization.js'
export * as MapMarker from './map-marker.js'
export * as MapPopup from './map-popup.js'
export * as MapRoute from './map-route.js'
export * as MapStyles from './map-styles.js'
export * as Map from './map.js'
export * as Markdown from './markdown.js'
export * as Marker from './marker.js'
export * as Menubar from './menubar.js'
export * as MessageScroller from './message-scroller.js'
export * as Message from './message.js'
export * as MetadataList from './metadata-list.js'
export * as MobileNav from './mobile-nav.js'
export * as MoreMenu from './more-menu.js'
export * as MultiSelector from './multi-selector.js'
export * as NativeSelect from './native-select.js'
export * as NavigationMenu from './navigation-menu.js'
export * as NumberInput from './number-input.js'
export * as OverflowList from './overflow-list.js'
export * as Pagination from './pagination.js'
export * as Popover from './popover.js'
export * as Progress from './progress.js'
export * as RadioGroup from './radio-group.js'
export * as Resizable from './resizable.js'
export * as ScrollArea from './scroll-area.js'
export * as Section from './section.js'
export * as Select from './select.js'
export * as SelectableCard from './selectable-card.js'
export * as Separator from './separator.js'
export * as Sheet from './sheet.js'
export * as Sidebar from './sidebar.js'
export * as Skeleton from './skeleton.js'
export * as Slider from './slider.js'
export * as Spinner from './spinner.js'
export * as Stack from './stack.js'
export * as Stat from './stat.js'
export * as StatusDot from './status-dot.js'
export * as Stepper from './stepper.js'
export * as Switch from './switch.js'
export * as Table from './table.js'
export * as Tabs from './tabs.js'
export * as Text from './text.js'
export * as Textarea from './textarea.js'
export * as Thumbnail from './thumbnail.js'
export * as TimeInput from './time-input.js'
export * as Timer from './timer.js'
export * as Timestamp from './timestamp.js'
export * as Toast from './toast.js'
export * as ToggleGroup from './toggle-group.js'
export * as Toggle from './toggle.js'
export * as Token from './token.js'
export * as Tokenizer from './tokenizer.js'
export * as Toolbar from './toolbar.js'
export * as Tooltip from './tooltip.js'
export * as TopNav from './top-nav.js'
export * as TransferList from './transfer-list.js'
export * as TreeList from './tree-list.js'
export * as Typography from './typography.js'
export * as VisuallyHidden from './visually-hidden.js'

/** Canonical registry order. Additions and removals are checked in CI. */
export const STYLEX_COMPONENT_NAMES = [
  'accordion',
  'alert-dialog',
  'alert',
  'aspect-ratio',
  'attachment',
  'avatar-group',
  'avatar',
  'badge',
  'banner',
  'blockquote',
  'breadcrumb',
  'bubble',
  'button-group',
  'button',
  'calendar',
  'card',
  'carousel',
  'center',
  'chart',
  'chat-reasoning',
  'checkbox',
  'circular-progress',
  'code-block',
  'code',
  'collapsible',
  'combobox',
  'command',
  'context-menu',
  'data-grid',
  'data-table',
  'date-input',
  'date-picker',
  'date-range-input',
  'date-time-input',
  'dialog',
  'direction',
  'drawer',
  'dropdown-menu',
  'empty',
  'field-status',
  'field',
  'file-input',
  'form',
  'grid',
  'heading',
  'hover-card',
  'indicator',
  'info-tip',
  'input-group',
  'input-otp',
  'input',
  'item',
  'kbd',
  'label',
  'lightbox',
  'link',
  'list-input',
  'list',
  'log-stream',
  'map-arc',
  'map-cluster',
  'map-controls',
  'map-geojson',
  'map-localization',
  'map-marker',
  'map-popup',
  'map-route',
  'map-styles',
  'map',
  'markdown',
  'marker',
  'menubar',
  'message-scroller',
  'message',
  'metadata-list',
  'mobile-nav',
  'more-menu',
  'multi-selector',
  'native-select',
  'navigation-menu',
  'number-input',
  'overflow-list',
  'pagination',
  'popover',
  'progress',
  'radio-group',
  'resizable',
  'scroll-area',
  'section',
  'select',
  'selectable-card',
  'separator',
  'sheet',
  'sidebar',
  'skeleton',
  'slider',
  'spinner',
  'stack',
  'stat',
  'status-dot',
  'stepper',
  'switch',
  'table',
  'tabs',
  'text',
  'textarea',
  'thumbnail',
  'time-input',
  'timer',
  'timestamp',
  'toast',
  'toggle-group',
  'toggle',
  'token',
  'tokenizer',
  'toolbar',
  'tooltip',
  'top-nav',
  'transfer-list',
  'tree-list',
  'typography',
  'visually-hidden',
] as const

export type StyleXComponentName = (typeof STYLEX_COMPONENT_NAMES)[number]
