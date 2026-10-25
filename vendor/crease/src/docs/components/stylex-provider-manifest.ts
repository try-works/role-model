import {
  installExamplePreviewProvider,
  installStyleXPreviewView,
} from '@/docs/components/catalog'
import { mapStyleXPreview } from '@/docs/components/pages/map/stylex'
installExamplePreviewProvider('map', mapStyleXPreview('map'))
installExamplePreviewProvider('map-controls', mapStyleXPreview('map-controls'))
installExamplePreviewProvider('map-marker', mapStyleXPreview('map-marker'))
installExamplePreviewProvider('map-popup', mapStyleXPreview('map-popup'))
installExamplePreviewProvider('map-route', mapStyleXPreview('map-route'))
installExamplePreviewProvider('map-arc', mapStyleXPreview('map-arc'))
installExamplePreviewProvider('map-geojson', mapStyleXPreview('map-geojson'))
installExamplePreviewProvider('map-cluster', mapStyleXPreview('map-cluster'))
installExamplePreviewProvider('map-styles', mapStyleXPreview('map-styles'))
installExamplePreviewProvider(
  'map-localization',
  mapStyleXPreview('map-localization'),
)
import { accordionStyleXPreview } from '@/docs/components/pages/accordion/stylex'
import { actionBarStylexPreviewProgram } from '@/docs/components/pages/action-bar/stylex'
import { centerStyleXPreview } from '@/docs/components/pages/center/stylex'
import { gridStyleXPreview } from '@/docs/components/pages/grid/stylex'
import { sectionStyleXPreview } from '@/docs/components/pages/section/stylex'
import { stackStyleXPreview } from '@/docs/components/pages/stack/stylex'
import { visuallyHiddenStyleXPreview } from '@/docs/components/pages/visually-hidden/stylex'
import { alertStyleXPreview } from '@/docs/components/pages/alert/stylex'
import { aspectRatioStyleXPreview } from '@/docs/components/pages/aspect-ratio/stylex'
import { avatarStyleXPreview } from '@/docs/components/pages/avatar/stylex'
import { avatarGroupStyleXPreview } from '@/docs/components/pages/avatar-group/stylex'
import { badgeStyleXPreview } from '@/docs/components/pages/badge/stylex'
import { blockquoteStyleXPreview } from '@/docs/components/pages/blockquote/stylex'
import { breadcrumbStyleXPreview } from '@/docs/components/pages/breadcrumb/stylex'
import { kbdStyleXPreview } from '@/docs/components/pages/kbd/stylex'
import { codeStyleXPreview } from '@/docs/components/pages/code/stylex'
import { codeBlockStyleXPreview } from '@/docs/components/pages/code-block/stylex'
import { headingStyleXPreview } from '@/docs/components/pages/heading/stylex'
import { labelStyleXPreview } from '@/docs/components/pages/label/stylex'
import { linkStyleXPreview } from '@/docs/components/pages/link/stylex'
import { listStyleXPreview } from '@/docs/components/pages/list/stylex'
import { markdownStyleXPreview } from '@/docs/components/pages/markdown/stylex'
import { markerStyleXPreview } from '@/docs/components/pages/marker/stylex'
import { textStyleXPreview } from '@/docs/components/pages/text/stylex'
import { separatorStyleXPreview } from '@/docs/components/pages/separator/stylex'
import { skeletonStyleXPreview } from '@/docs/components/pages/skeleton/stylex'
import { spinnerStyleXPreview } from '@/docs/components/pages/spinner/stylex'
import { typographyStyleXPreview } from '@/docs/components/pages/typography/stylex'
import { buttonStyleXPreview } from '@/docs/components/pages/button/stylex'
import { buttonGroupStyleXPreview } from '@/docs/components/pages/button-group/stylex'
import { inputStylexPreviewProgram } from '@/docs/components/pages/input/stylex'
import { inputOtpStyleXPreview } from '@/docs/components/pages/input-otp/stylex'
import { textareaStyleXPreview } from '@/docs/components/pages/textarea/stylex'
import { toggleStyleXPreview } from '@/docs/components/pages/toggle/stylex'
import { toggleGroupStyleXPreview } from '@/docs/components/pages/toggle-group/stylex'
import { checkboxStyleXPreview } from '@/docs/components/pages/checkbox/stylex'
import { circularProgressStyleXPreview } from '@/docs/components/pages/circular-progress/stylex'
import { fileInputStylexPreviewProgram } from '@/docs/components/pages/file-input/stylex'
import { listInputStyleXPreview } from '@/docs/components/pages/list-input/stylex'
import { numberInputStyleXPreview } from '@/docs/components/pages/number-input/stylex'
import { timeInputStyleXPreview } from '@/docs/components/pages/time-input/stylex'
import { switchStyleXPreview } from '@/docs/components/pages/switch/stylex'
import { radioGroupStyleXPreview } from '@/docs/components/pages/radio-group/stylex'
import { multiSelectorStyleXPreview } from '@/docs/components/pages/multi-selector/stylex'
import { nativeSelectStyleXPreview } from '@/docs/components/pages/native-select/stylex'
import { progressStyleXPreview } from '@/docs/components/pages/progress/stylex'
import { sliderStyleXPreview } from '@/docs/components/pages/slider/stylex'
import { collapsibleStyleXPreview } from '@/docs/components/pages/collapsible/stylex'
import { colorPickerStyleXPreview } from '@/docs/components/pages/color-picker/stylex'
import { dateRangeInputStyleXPreview } from '@/docs/components/pages/date-range-input/stylex'
import { dateTimeInputStyleXPreview } from '@/docs/components/pages/date-time-input/stylex'
import { dialogStyleXPreview } from '@/docs/components/pages/dialog/stylex'
import { alertDialogStyleXPreview } from '@/docs/components/pages/alert-dialog/stylex'
import { drawerStyleXPreview } from '@/docs/components/pages/drawer/stylex'
import { lightboxStyleXPreview } from '@/docs/components/pages/lightbox/stylex'
import { mobileNavStyleXPreview } from '@/docs/components/pages/mobile-nav/stylex'
import { sheetStyleXPreview } from '@/docs/components/pages/sheet/stylex'
import { popoverStyleXPreview } from '@/docs/components/pages/popover/stylex'
import { hoverCardStyleXPreview } from '@/docs/components/pages/hover-card/stylex'
import { indicatorStyleXPreview } from '@/docs/components/pages/indicator/stylex'
import { tokenizerStyleXPreview } from '@/docs/components/pages/tokenizer/stylex'
import { tooltipStyleXPreview } from '@/docs/components/pages/tooltip/stylex'
import { dropdownMenuStyleXPreview } from '@/docs/components/pages/dropdown-menu/stylex'
import { contextMenuStyleXPreview } from '@/docs/components/pages/context-menu/stylex'
import { menubarStyleXPreview } from '@/docs/components/pages/menubar/stylex'
import { navigationMenuStyleXPreview } from '@/docs/components/pages/navigation-menu/stylex'
import { selectStyleXPreview } from '@/docs/components/pages/select/stylex'
import { comboboxStyleXPreview } from '@/docs/components/pages/combobox/stylex'
import { commandStyleXPreview } from '@/docs/components/pages/command/stylex'
import { attachmentStyleXPreview } from '@/docs/components/pages/attachment/stylex'
import { bubbleStyleXPreview } from '@/docs/components/pages/bubble/stylex'
import { cardStyleXPreview } from '@/docs/components/pages/card/stylex'
import { emptyStyleXPreview } from '@/docs/components/pages/empty/stylex'
import { itemStyleXPreview } from '@/docs/components/pages/item/stylex'
import { messageStyleXPreview } from '@/docs/components/pages/message/stylex'
import { messageScrollerStyleXPreview } from '@/docs/components/pages/message-scroller/stylex'
import { paginationStyleXPreview } from '@/docs/components/pages/pagination/stylex'
import { scrollAreaStyleXPreview } from '@/docs/components/pages/scroll-area/stylex'
import { resizableStyleXPreview } from '@/docs/components/pages/resizable/stylex'
import { tabsStyleXPreview } from '@/docs/components/pages/tabs/stylex'
import { tableStyleXPreview } from '@/docs/components/pages/table/stylex'
import { calendarStyleXPreview } from '@/docs/components/pages/calendar/stylex'
import { carouselStyleXPreview } from '@/docs/components/pages/carousel/stylex'
import { chartStyleXPreview } from '@/docs/components/pages/chart/stylex'
import { chatReasoningStyleXPreview } from '@/docs/components/pages/chat-reasoning/stylex'
import { logStreamStyleXPreview } from '@/docs/components/pages/log-stream/stylex'
import { timerStyleXPreview } from '@/docs/components/pages/timer/stylex'
import { timestampStyleXPreview } from '@/docs/components/pages/timestamp/stylex'
import { transferListStyleXPreview } from '@/docs/components/pages/transfer-list/stylex'
import { dataGridStylexPreviewProgram } from '@/docs/components/pages/data-grid/stylex'
import { dataTableStyleXPreview } from '@/docs/components/pages/data-table/stylex'
import { dateInputStyleXPreview } from '@/docs/components/pages/date-input/stylex'
import { datePickerStyleXPreview } from '@/docs/components/pages/date-picker/stylex'
import { directionStyleXPreview } from '@/docs/components/pages/direction/stylex'
import { fieldStyleXPreview } from '@/docs/components/pages/field/stylex'
import { formStyleXPreview } from '@/docs/components/pages/form/stylex'
import { inputGroupStyleXPreview } from '@/docs/components/pages/input-group/stylex'
import { sidebarStyleXPreview } from '@/docs/components/pages/sidebar/stylex'
import { statStyleXPreview } from '@/docs/components/pages/stat/stylex'
import { statusDotStyleXPreview } from '@/docs/components/pages/status-dot/stylex'
import { thumbnailStyleXPreview } from '@/docs/components/pages/thumbnail/stylex'
import { toastStyleXPreview } from '@/docs/components/pages/toast/stylex'
import { bannerStyleXPreview } from '@/docs/components/pages/banner/stylex'
import { fieldStatusStyleXPreview } from '@/docs/components/pages/field-status/stylex'
import { infoTipStyleXPreview } from '@/docs/components/pages/info-tip/stylex'
import { metadataListStyleXPreview } from '@/docs/components/pages/metadata-list/stylex'
import { moreMenuStyleXPreview } from '@/docs/components/pages/more-menu/stylex'
import { overflowListStyleXPreview } from '@/docs/components/pages/overflow-list/stylex'
import { selectableCardStyleXPreview } from '@/docs/components/pages/selectable-card/stylex'
import { stepperStyleXPreview } from '@/docs/components/pages/stepper/stylex'
import { tokenStyleXPreview } from '@/docs/components/pages/token/stylex'
import { toolbarStyleXPreview } from '@/docs/components/pages/toolbar/stylex'
import { topNavStyleXPreview } from '@/docs/components/pages/top-nav/stylex'
import { treeListStyleXPreview } from '@/docs/components/pages/tree-list/stylex'

installExamplePreviewProvider('accordion', accordionStyleXPreview)
installStyleXPreviewView('action-bar', actionBarStylexPreviewProgram.view)
installExamplePreviewProvider('alert', alertStyleXPreview)
installExamplePreviewProvider('aspect-ratio', aspectRatioStyleXPreview)
installExamplePreviewProvider('avatar', avatarStyleXPreview)
installExamplePreviewProvider('avatar-group', avatarGroupStyleXPreview)
installExamplePreviewProvider('badge', badgeStyleXPreview)
installExamplePreviewProvider('blockquote', blockquoteStyleXPreview)
installExamplePreviewProvider('breadcrumb', breadcrumbStyleXPreview)
installExamplePreviewProvider('code', codeStyleXPreview)
installExamplePreviewProvider('code-block', codeBlockStyleXPreview)
installExamplePreviewProvider('heading', headingStyleXPreview)
installExamplePreviewProvider('link', linkStyleXPreview)
installExamplePreviewProvider('list', listStyleXPreview)
installExamplePreviewProvider('markdown', markdownStyleXPreview)
installExamplePreviewProvider('text', textStyleXPreview)
installExamplePreviewProvider('kbd', kbdStyleXPreview)
installExamplePreviewProvider('label', labelStyleXPreview)
installExamplePreviewProvider('marker', markerStyleXPreview)
installExamplePreviewProvider('separator', separatorStyleXPreview)
installExamplePreviewProvider('skeleton', skeletonStyleXPreview)
installExamplePreviewProvider('spinner', spinnerStyleXPreview)
installExamplePreviewProvider('typography', typographyStyleXPreview)
installExamplePreviewProvider('button', buttonStyleXPreview)
installExamplePreviewProvider('button-group', buttonGroupStyleXPreview)
installStyleXPreviewView('input', inputStylexPreviewProgram.view)
installExamplePreviewProvider('input-otp', inputOtpStyleXPreview)
installExamplePreviewProvider('textarea', textareaStyleXPreview)
installExamplePreviewProvider('toggle', toggleStyleXPreview)
installExamplePreviewProvider('toggle-group', toggleGroupStyleXPreview)
installExamplePreviewProvider('checkbox', checkboxStyleXPreview)
installExamplePreviewProvider(
  'circular-progress',
  circularProgressStyleXPreview,
)
installExamplePreviewProvider('switch', switchStyleXPreview)
installExamplePreviewProvider('radio-group', radioGroupStyleXPreview)
installExamplePreviewProvider('multi-selector', multiSelectorStyleXPreview)
installExamplePreviewProvider('native-select', nativeSelectStyleXPreview)
installExamplePreviewProvider('progress', progressStyleXPreview)
installExamplePreviewProvider('slider', sliderStyleXPreview)
installExamplePreviewProvider('collapsible', collapsibleStyleXPreview)
installExamplePreviewProvider('color-picker', colorPickerStyleXPreview)
installExamplePreviewProvider('date-range-input', dateRangeInputStyleXPreview)
installExamplePreviewProvider('date-time-input', dateTimeInputStyleXPreview)
installExamplePreviewProvider('dialog', dialogStyleXPreview)
installExamplePreviewProvider('alert-dialog', alertDialogStyleXPreview)
installExamplePreviewProvider('drawer', drawerStyleXPreview)
installExamplePreviewProvider('sheet', sheetStyleXPreview)
installExamplePreviewProvider('popover', popoverStyleXPreview)
installExamplePreviewProvider('hover-card', hoverCardStyleXPreview)
installExamplePreviewProvider('indicator', indicatorStyleXPreview)
installExamplePreviewProvider('tokenizer', tokenizerStyleXPreview)
installExamplePreviewProvider('tooltip', tooltipStyleXPreview)
installExamplePreviewProvider('dropdown-menu', dropdownMenuStyleXPreview)
installExamplePreviewProvider('context-menu', contextMenuStyleXPreview)
installExamplePreviewProvider('menubar', menubarStyleXPreview)
installExamplePreviewProvider('navigation-menu', navigationMenuStyleXPreview)
installExamplePreviewProvider('select', selectStyleXPreview)
installExamplePreviewProvider('combobox', comboboxStyleXPreview)
installExamplePreviewProvider('command', commandStyleXPreview)
installExamplePreviewProvider('attachment', attachmentStyleXPreview)
installExamplePreviewProvider('bubble', bubbleStyleXPreview)
installExamplePreviewProvider('card', cardStyleXPreview)
installExamplePreviewProvider('empty', emptyStyleXPreview)
installExamplePreviewProvider('item', itemStyleXPreview)
installExamplePreviewProvider('message', messageStyleXPreview)
installExamplePreviewProvider('message-scroller', messageScrollerStyleXPreview)
installExamplePreviewProvider('pagination', paginationStyleXPreview)
installExamplePreviewProvider('scroll-area', scrollAreaStyleXPreview)
installExamplePreviewProvider('resizable', resizableStyleXPreview)
installExamplePreviewProvider('tabs', tabsStyleXPreview)
installExamplePreviewProvider('table', tableStyleXPreview)
installExamplePreviewProvider('calendar', calendarStyleXPreview)
installExamplePreviewProvider('carousel', carouselStyleXPreview)
installExamplePreviewProvider('chart', chartStyleXPreview)
installExamplePreviewProvider('center', centerStyleXPreview)
installStyleXPreviewView('data-grid', dataGridStylexPreviewProgram.view)
installExamplePreviewProvider('data-table', dataTableStyleXPreview)
installExamplePreviewProvider('date-input', dateInputStyleXPreview)
installExamplePreviewProvider('date-picker', datePickerStyleXPreview)
installExamplePreviewProvider('direction', directionStyleXPreview)
installExamplePreviewProvider('field', fieldStyleXPreview)
installExamplePreviewProvider('form', formStyleXPreview)
installExamplePreviewProvider('grid', gridStyleXPreview)
installExamplePreviewProvider('input-group', inputGroupStyleXPreview)
installExamplePreviewProvider('section', sectionStyleXPreview)
installExamplePreviewProvider('sidebar', sidebarStyleXPreview)
installExamplePreviewProvider('stack', stackStyleXPreview)
installExamplePreviewProvider('stat', statStyleXPreview)
installExamplePreviewProvider('status-dot', statusDotStyleXPreview)
installExamplePreviewProvider('thumbnail', thumbnailStyleXPreview)
installExamplePreviewProvider('toast', toastStyleXPreview)
installExamplePreviewProvider('banner', bannerStyleXPreview)
installExamplePreviewProvider('chat-reasoning', chatReasoningStyleXPreview)
installExamplePreviewProvider('field-status', fieldStatusStyleXPreview)
installStyleXPreviewView('file-input', fileInputStylexPreviewProgram.view)
installExamplePreviewProvider('info-tip', infoTipStyleXPreview)
installExamplePreviewProvider('lightbox', lightboxStyleXPreview)
installExamplePreviewProvider('list-input', listInputStyleXPreview)
installExamplePreviewProvider('log-stream', logStreamStyleXPreview)
installExamplePreviewProvider('metadata-list', metadataListStyleXPreview)
installExamplePreviewProvider('mobile-nav', mobileNavStyleXPreview)
installExamplePreviewProvider('more-menu', moreMenuStyleXPreview)
installExamplePreviewProvider('number-input', numberInputStyleXPreview)
installExamplePreviewProvider('overflow-list', overflowListStyleXPreview)
installExamplePreviewProvider('selectable-card', selectableCardStyleXPreview)
installExamplePreviewProvider('stepper', stepperStyleXPreview)
installExamplePreviewProvider('time-input', timeInputStyleXPreview)
installExamplePreviewProvider('timer', timerStyleXPreview)
installExamplePreviewProvider('timestamp', timestampStyleXPreview)
installExamplePreviewProvider('token', tokenStyleXPreview)
installExamplePreviewProvider('toolbar', toolbarStyleXPreview)
installExamplePreviewProvider('top-nav', topNavStyleXPreview)
installExamplePreviewProvider('transfer-list', transferListStyleXPreview)
installExamplePreviewProvider('tree-list', treeListStyleXPreview)
installExamplePreviewProvider('visually-hidden', visuallyHiddenStyleXPreview)
