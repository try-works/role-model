import {
  installPleatExamplePreviewProvider,
  installPleatPreviewView,
} from '@/docs/components/catalog'
import { mapPleatPreview } from '@/docs/components/pages/map/pleat'
installPleatExamplePreviewProvider('map', mapPleatPreview('map'))
installPleatExamplePreviewProvider(
  'map-controls',
  mapPleatPreview('map-controls'),
)
installPleatExamplePreviewProvider('map-marker', mapPleatPreview('map-marker'))
installPleatExamplePreviewProvider('map-popup', mapPleatPreview('map-popup'))
installPleatExamplePreviewProvider('map-route', mapPleatPreview('map-route'))
installPleatExamplePreviewProvider('map-arc', mapPleatPreview('map-arc'))
installPleatExamplePreviewProvider(
  'map-geojson',
  mapPleatPreview('map-geojson'),
)
installPleatExamplePreviewProvider(
  'map-cluster',
  mapPleatPreview('map-cluster'),
)
installPleatExamplePreviewProvider('map-styles', mapPleatPreview('map-styles'))
installPleatExamplePreviewProvider(
  'map-localization',
  mapPleatPreview('map-localization'),
)
import { accordionPleatPreview } from '@/docs/components/pages/accordion/pleat'
import { centerPleatPreview } from '@/docs/components/pages/center/pleat'
import { gridPleatPreview } from '@/docs/components/pages/grid/pleat'
import { sectionPleatPreview } from '@/docs/components/pages/section/pleat'
import { stackPleatPreview } from '@/docs/components/pages/stack/pleat'
import { visuallyHiddenPleatPreview } from '@/docs/components/pages/visually-hidden/pleat'
import { alertPleatPreview } from '@/docs/components/pages/alert/pleat'
import { aspectRatioPleatPreview } from '@/docs/components/pages/aspect-ratio/pleat'
import { avatarPleatPreview } from '@/docs/components/pages/avatar/pleat'
import { avatarGroupPleatPreview } from '@/docs/components/pages/avatar-group/pleat'
import { badgePleatPreview } from '@/docs/components/pages/badge/pleat'
import { blockquotePleatPreview } from '@/docs/components/pages/blockquote/pleat'
import { breadcrumbPleatPreview } from '@/docs/components/pages/breadcrumb/pleat'
import { kbdPleatPreview } from '@/docs/components/pages/kbd/pleat'
import { codePleatPreview } from '@/docs/components/pages/code/pleat'
import { codeBlockPleatPreview } from '@/docs/components/pages/code-block/pleat'
import { headingPleatPreview } from '@/docs/components/pages/heading/pleat'
import { labelPleatPreview } from '@/docs/components/pages/label/pleat'
import { linkPleatPreview } from '@/docs/components/pages/link/pleat'
import { listPleatPreview } from '@/docs/components/pages/list/pleat'
import { markdownPleatPreview } from '@/docs/components/pages/markdown/pleat'
import { markerPleatPreview } from '@/docs/components/pages/marker/pleat'
import { textPleatPreview } from '@/docs/components/pages/text/pleat'
import { separatorPleatPreview } from '@/docs/components/pages/separator/pleat'
import { skeletonPleatPreview } from '@/docs/components/pages/skeleton/pleat'
import { spinnerPleatPreview } from '@/docs/components/pages/spinner/pleat'
import { typographyPleatPreview } from '@/docs/components/pages/typography/pleat'
import { buttonPleatPreview } from '@/docs/components/pages/button/pleat'
import { buttonGroupPleatPreview } from '@/docs/components/pages/button-group/pleat'
import { inputPleatPreviewProgram } from '@/docs/components/pages/input/pleat'
import { inputOtpPleatPreview } from '@/docs/components/pages/input-otp/pleat'
import { textareaPleatPreview } from '@/docs/components/pages/textarea/pleat'
import { togglePleatPreview } from '@/docs/components/pages/toggle/pleat'
import { toggleGroupPleatPreview } from '@/docs/components/pages/toggle-group/pleat'
import { checkboxPleatPreview } from '@/docs/components/pages/checkbox/pleat'
import { circularProgressPleatPreview } from '@/docs/components/pages/circular-progress/pleat'
import { fileInputPleatPreviewProgram } from '@/docs/components/pages/file-input/pleat'
import { listInputPleatPreview } from '@/docs/components/pages/list-input/pleat'
import { numberInputPleatPreview } from '@/docs/components/pages/number-input/pleat'
import { timeInputPleatPreview } from '@/docs/components/pages/time-input/pleat'
import { switchPleatPreview } from '@/docs/components/pages/switch/pleat'
import { radioGroupPleatPreview } from '@/docs/components/pages/radio-group/pleat'
import { multiSelectorPleatPreview } from '@/docs/components/pages/multi-selector/pleat'
import { nativeSelectPleatPreview } from '@/docs/components/pages/native-select/pleat'
import { progressPleatPreview } from '@/docs/components/pages/progress/pleat'
import { sliderPleatPreview } from '@/docs/components/pages/slider/pleat'
import { collapsiblePleatPreview } from '@/docs/components/pages/collapsible/pleat'
import { colorPickerPleatPreview } from '@/docs/components/pages/color-picker/pleat'
import { dateRangeInputPleatPreview } from '@/docs/components/pages/date-range-input/pleat'
import { dateTimeInputPleatPreview } from '@/docs/components/pages/date-time-input/pleat'
import { dialogPleatPreview } from '@/docs/components/pages/dialog/pleat'
import { alertDialogPleatPreview } from '@/docs/components/pages/alert-dialog/pleat'
import { drawerPleatPreview } from '@/docs/components/pages/drawer/pleat'
import { lightboxPleatPreview } from '@/docs/components/pages/lightbox/pleat'
import { mobileNavPleatPreview } from '@/docs/components/pages/mobile-nav/pleat'
import { sheetPleatPreview } from '@/docs/components/pages/sheet/pleat'
import { popoverPleatPreview } from '@/docs/components/pages/popover/pleat'
import { hoverCardPleatPreview } from '@/docs/components/pages/hover-card/pleat'
import { indicatorPleatPreview } from '@/docs/components/pages/indicator/pleat'
import { tokenizerPleatPreview } from '@/docs/components/pages/tokenizer/pleat'
import { tooltipPleatPreview } from '@/docs/components/pages/tooltip/pleat'
import { dropdownMenuPleatPreview } from '@/docs/components/pages/dropdown-menu/pleat'
import { contextMenuPleatPreview } from '@/docs/components/pages/context-menu/pleat'
import { menubarPleatPreview } from '@/docs/components/pages/menubar/pleat'
import { navigationMenuPleatPreview } from '@/docs/components/pages/navigation-menu/pleat'
import { selectPleatPreview } from '@/docs/components/pages/select/pleat'
import { comboboxPleatPreview } from '@/docs/components/pages/combobox/pleat'
import { commandPleatPreview } from '@/docs/components/pages/command/pleat'
import { attachmentPleatPreview } from '@/docs/components/pages/attachment/pleat'
import { bubblePleatPreview } from '@/docs/components/pages/bubble/pleat'
import { cardPleatPreview } from '@/docs/components/pages/card/pleat'
import { emptyPleatPreview } from '@/docs/components/pages/empty/pleat'
import { itemPleatPreview } from '@/docs/components/pages/item/pleat'
import { messagePleatPreview } from '@/docs/components/pages/message/pleat'
import { messageScrollerPleatPreview } from '@/docs/components/pages/message-scroller/pleat'
import { paginationPleatPreview } from '@/docs/components/pages/pagination/pleat'
import { scrollAreaPleatPreview } from '@/docs/components/pages/scroll-area/pleat'
import { resizablePleatPreview } from '@/docs/components/pages/resizable/pleat'
import { tabsPleatPreview } from '@/docs/components/pages/tabs/pleat'
import { tablePleatPreview } from '@/docs/components/pages/table/pleat'
import { calendarPleatPreview } from '@/docs/components/pages/calendar/pleat'
import { carouselPleatPreview } from '@/docs/components/pages/carousel/pleat'
import { chartPleatPreview } from '@/docs/components/pages/chart/pleat'
import { chatReasoningPleatPreview } from '@/docs/components/pages/chat-reasoning/pleat'
import { logStreamPleatPreview } from '@/docs/components/pages/log-stream/pleat'
import { timerPleatPreview } from '@/docs/components/pages/timer/pleat'
import { timestampPleatPreview } from '@/docs/components/pages/timestamp/pleat'
import { transferListPleatPreview } from '@/docs/components/pages/transfer-list/pleat'
import { actionBarPleatPreviewProgram } from '@/docs/components/pages/action-bar/pleat'
import { dataGridPleatPreviewProgram } from '@/docs/components/pages/data-grid/pleat'
import { dataTablePleatPreview } from '@/docs/components/pages/data-table/pleat'
import { dateInputPleatPreview } from '@/docs/components/pages/date-input/pleat'
import { datePickerPleatPreview } from '@/docs/components/pages/date-picker/pleat'
import { directionPleatPreview } from '@/docs/components/pages/direction/pleat'
import { fieldPleatPreview } from '@/docs/components/pages/field/pleat'
import { formPleatPreview } from '@/docs/components/pages/form/pleat'
import { inputGroupPleatPreview } from '@/docs/components/pages/input-group/pleat'
import { sidebarPleatPreview } from '@/docs/components/pages/sidebar/pleat'
import { statPleatPreview } from '@/docs/components/pages/stat/pleat'
import { statusDotPleatPreview } from '@/docs/components/pages/status-dot/pleat'
import { thumbnailPleatPreview } from '@/docs/components/pages/thumbnail/pleat'
import { toastPleatPreview } from '@/docs/components/pages/toast/pleat'
import { bannerPleatPreview } from '@/docs/components/pages/banner/pleat'
import { fieldStatusPleatPreview } from '@/docs/components/pages/field-status/pleat'
import { infoTipPleatPreview } from '@/docs/components/pages/info-tip/pleat'
import { metadataListPleatPreview } from '@/docs/components/pages/metadata-list/pleat'
import { moreMenuPleatPreview } from '@/docs/components/pages/more-menu/pleat'
import { overflowListPleatPreview } from '@/docs/components/pages/overflow-list/pleat'
import { selectableCardPleatPreview } from '@/docs/components/pages/selectable-card/pleat'
import { stepperPleatPreview } from '@/docs/components/pages/stepper/pleat'
import { tokenPleatPreview } from '@/docs/components/pages/token/pleat'
import { toolbarPleatPreview } from '@/docs/components/pages/toolbar/pleat'
import { topNavPleatPreview } from '@/docs/components/pages/top-nav/pleat'
import { treeListPleatPreview } from '@/docs/components/pages/tree-list/pleat'

installPleatExamplePreviewProvider('accordion', accordionPleatPreview)
installPleatExamplePreviewProvider('alert', alertPleatPreview)
installPleatExamplePreviewProvider('aspect-ratio', aspectRatioPleatPreview)
installPleatExamplePreviewProvider('avatar', avatarPleatPreview)
installPleatExamplePreviewProvider('avatar-group', avatarGroupPleatPreview)
installPleatExamplePreviewProvider('badge', badgePleatPreview)
installPleatExamplePreviewProvider('blockquote', blockquotePleatPreview)
installPleatExamplePreviewProvider('breadcrumb', breadcrumbPleatPreview)
installPleatExamplePreviewProvider('code', codePleatPreview)
installPleatExamplePreviewProvider('code-block', codeBlockPleatPreview)
installPleatExamplePreviewProvider('heading', headingPleatPreview)
installPleatExamplePreviewProvider('link', linkPleatPreview)
installPleatExamplePreviewProvider('list', listPleatPreview)
installPleatExamplePreviewProvider('markdown', markdownPleatPreview)
installPleatExamplePreviewProvider('text', textPleatPreview)
installPleatExamplePreviewProvider('kbd', kbdPleatPreview)
installPleatExamplePreviewProvider('label', labelPleatPreview)
installPleatExamplePreviewProvider('marker', markerPleatPreview)
installPleatExamplePreviewProvider('separator', separatorPleatPreview)
installPleatExamplePreviewProvider('skeleton', skeletonPleatPreview)
installPleatExamplePreviewProvider('spinner', spinnerPleatPreview)
installPleatExamplePreviewProvider('typography', typographyPleatPreview)
installPleatExamplePreviewProvider('button', buttonPleatPreview)
installPleatExamplePreviewProvider('button-group', buttonGroupPleatPreview)
installPleatPreviewView('input', inputPleatPreviewProgram.view)
installPleatExamplePreviewProvider('input-otp', inputOtpPleatPreview)
installPleatExamplePreviewProvider('textarea', textareaPleatPreview)
installPleatExamplePreviewProvider('toggle', togglePleatPreview)
installPleatExamplePreviewProvider('toggle-group', toggleGroupPleatPreview)
installPleatExamplePreviewProvider('checkbox', checkboxPleatPreview)
installPleatExamplePreviewProvider(
  'circular-progress',
  circularProgressPleatPreview,
)
installPleatExamplePreviewProvider('switch', switchPleatPreview)
installPleatExamplePreviewProvider('radio-group', radioGroupPleatPreview)
installPleatExamplePreviewProvider('multi-selector', multiSelectorPleatPreview)
installPleatExamplePreviewProvider('native-select', nativeSelectPleatPreview)
installPleatExamplePreviewProvider('progress', progressPleatPreview)
installPleatExamplePreviewProvider('slider', sliderPleatPreview)
installPleatExamplePreviewProvider('collapsible', collapsiblePleatPreview)
installPleatExamplePreviewProvider('color-picker', colorPickerPleatPreview)
installPleatExamplePreviewProvider(
  'date-range-input',
  dateRangeInputPleatPreview,
)
installPleatExamplePreviewProvider('date-time-input', dateTimeInputPleatPreview)
installPleatExamplePreviewProvider('dialog', dialogPleatPreview)
installPleatExamplePreviewProvider('alert-dialog', alertDialogPleatPreview)
installPleatExamplePreviewProvider('drawer', drawerPleatPreview)
installPleatExamplePreviewProvider('sheet', sheetPleatPreview)
installPleatExamplePreviewProvider('popover', popoverPleatPreview)
installPleatExamplePreviewProvider('hover-card', hoverCardPleatPreview)
installPleatExamplePreviewProvider('indicator', indicatorPleatPreview)
installPleatExamplePreviewProvider('tokenizer', tokenizerPleatPreview)
installPleatExamplePreviewProvider('tooltip', tooltipPleatPreview)
installPleatExamplePreviewProvider('dropdown-menu', dropdownMenuPleatPreview)
installPleatExamplePreviewProvider('context-menu', contextMenuPleatPreview)
installPleatExamplePreviewProvider('menubar', menubarPleatPreview)
installPleatExamplePreviewProvider(
  'navigation-menu',
  navigationMenuPleatPreview,
)
installPleatExamplePreviewProvider('select', selectPleatPreview)
installPleatExamplePreviewProvider('combobox', comboboxPleatPreview)
installPleatExamplePreviewProvider('command', commandPleatPreview)
installPleatExamplePreviewProvider('attachment', attachmentPleatPreview)
installPleatExamplePreviewProvider('bubble', bubblePleatPreview)
installPleatExamplePreviewProvider('card', cardPleatPreview)
installPleatExamplePreviewProvider('empty', emptyPleatPreview)
installPleatExamplePreviewProvider('item', itemPleatPreview)
installPleatExamplePreviewProvider('message', messagePleatPreview)
installPleatExamplePreviewProvider(
  'message-scroller',
  messageScrollerPleatPreview,
)
installPleatExamplePreviewProvider('pagination', paginationPleatPreview)
installPleatExamplePreviewProvider('scroll-area', scrollAreaPleatPreview)
installPleatExamplePreviewProvider('resizable', resizablePleatPreview)
installPleatExamplePreviewProvider('tabs', tabsPleatPreview)
installPleatExamplePreviewProvider('table', tablePleatPreview)
installPleatExamplePreviewProvider('calendar', calendarPleatPreview)
installPleatExamplePreviewProvider('carousel', carouselPleatPreview)
installPleatExamplePreviewProvider('chart', chartPleatPreview)
installPleatExamplePreviewProvider('center', centerPleatPreview)
installPleatPreviewView('action-bar', actionBarPleatPreviewProgram.view)
installPleatPreviewView('data-grid', dataGridPleatPreviewProgram.view)
installPleatExamplePreviewProvider('data-table', dataTablePleatPreview)
installPleatExamplePreviewProvider('date-input', dateInputPleatPreview)
installPleatExamplePreviewProvider('date-picker', datePickerPleatPreview)
installPleatExamplePreviewProvider('direction', directionPleatPreview)
installPleatExamplePreviewProvider('field', fieldPleatPreview)
installPleatExamplePreviewProvider('form', formPleatPreview)
installPleatExamplePreviewProvider('grid', gridPleatPreview)
installPleatExamplePreviewProvider('input-group', inputGroupPleatPreview)
installPleatExamplePreviewProvider('section', sectionPleatPreview)
installPleatExamplePreviewProvider('sidebar', sidebarPleatPreview)
installPleatExamplePreviewProvider('stack', stackPleatPreview)
installPleatExamplePreviewProvider('stat', statPleatPreview)
installPleatExamplePreviewProvider('status-dot', statusDotPleatPreview)
installPleatExamplePreviewProvider('thumbnail', thumbnailPleatPreview)
installPleatExamplePreviewProvider('toast', toastPleatPreview)
installPleatExamplePreviewProvider('banner', bannerPleatPreview)
installPleatExamplePreviewProvider('chat-reasoning', chatReasoningPleatPreview)
installPleatExamplePreviewProvider('field-status', fieldStatusPleatPreview)
installPleatPreviewView('file-input', fileInputPleatPreviewProgram.view)
installPleatExamplePreviewProvider('info-tip', infoTipPleatPreview)
installPleatExamplePreviewProvider('lightbox', lightboxPleatPreview)
installPleatExamplePreviewProvider('list-input', listInputPleatPreview)
installPleatExamplePreviewProvider('log-stream', logStreamPleatPreview)
installPleatExamplePreviewProvider('metadata-list', metadataListPleatPreview)
installPleatExamplePreviewProvider('mobile-nav', mobileNavPleatPreview)
installPleatExamplePreviewProvider('more-menu', moreMenuPleatPreview)
installPleatExamplePreviewProvider('number-input', numberInputPleatPreview)
installPleatExamplePreviewProvider('overflow-list', overflowListPleatPreview)
installPleatExamplePreviewProvider(
  'selectable-card',
  selectableCardPleatPreview,
)
installPleatExamplePreviewProvider('stepper', stepperPleatPreview)
installPleatExamplePreviewProvider('time-input', timeInputPleatPreview)
installPleatExamplePreviewProvider('timer', timerPleatPreview)
installPleatExamplePreviewProvider('timestamp', timestampPleatPreview)
installPleatExamplePreviewProvider('token', tokenPleatPreview)
installPleatExamplePreviewProvider('toolbar', toolbarPleatPreview)
installPleatExamplePreviewProvider('top-nav', topNavPleatPreview)
installPleatExamplePreviewProvider('transfer-list', transferListPleatPreview)
installPleatExamplePreviewProvider('tree-list', treeListPleatPreview)
installPleatExamplePreviewProvider(
  'visually-hidden',
  visuallyHiddenPleatPreview,
)
