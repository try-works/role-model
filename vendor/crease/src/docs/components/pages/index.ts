import type { AuthoredPage } from '@/docs/components/pages/authored-page'
import { repairStyled } from '@/docs/components/styled-repair'
import { mapPage } from '@/docs/components/pages/map'
import { mapControlsPage } from '@/docs/components/pages/map-controls'
import { mapMarkerPage } from '@/docs/components/pages/map-marker'
import { mapPopupPage } from '@/docs/components/pages/map-popup'
import { mapRoutePage } from '@/docs/components/pages/map-route'
import { mapArcPage } from '@/docs/components/pages/map-arc'
import { mapGeojsonPage } from '@/docs/components/pages/map-geojson'
import { mapClusterPage } from '@/docs/components/pages/map-cluster'
import { mapStylesPage } from '@/docs/components/pages/map-styles'
import { mapLocalizationPage } from '@/docs/components/pages/map-localization'
import { accordionPage } from '@/docs/components/pages/accordion'
import { actionBarPage } from '@/docs/components/pages/action-bar'
import { alertPage } from '@/docs/components/pages/alert'
import { alertDialogPage } from '@/docs/components/pages/alert-dialog'
import { aspectRatioPage } from '@/docs/components/pages/aspect-ratio'
import { attachmentPage } from '@/docs/components/pages/attachment'
import { avatarPage } from '@/docs/components/pages/avatar'
import { avatarGroupPage } from '@/docs/components/pages/avatar-group'
import { badgePage } from '@/docs/components/pages/badge'
import { bannerPage } from '@/docs/components/pages/banner'
import { blockquotePage } from '@/docs/components/pages/blockquote'
import { breadcrumbPage } from '@/docs/components/pages/breadcrumb'
import { bubblePage } from '@/docs/components/pages/bubble'
import { buttonPage } from '@/docs/components/pages/button'
import { buttonGroupPage } from '@/docs/components/pages/button-group'
import { calendarPage } from '@/docs/components/pages/calendar'
import { cardPage } from '@/docs/components/pages/card'
import { carouselPage } from '@/docs/components/pages/carousel'
import { chartPage } from '@/docs/components/pages/chart'
import { centerPage } from '@/docs/components/pages/center'
import { chatReasoningPage } from '@/docs/components/pages/chat-reasoning'
import { checkboxPage } from '@/docs/components/pages/checkbox'
import { circularProgressPage } from '@/docs/components/pages/circular-progress'
import { codePage } from '@/docs/components/pages/code'
import { codeBlockPage } from '@/docs/components/pages/code-block'
import { collapsiblePage } from '@/docs/components/pages/collapsible'
import { colorPickerPage } from '@/docs/components/pages/color-picker'
import { comboboxPage } from '@/docs/components/pages/combobox'
import { commandPage } from '@/docs/components/pages/command'
import { contextMenuPage } from '@/docs/components/pages/context-menu'
import { dateInputPage } from '@/docs/components/pages/date-input'
import { datePickerPage } from '@/docs/components/pages/date-picker'
import { dateRangeInputPage } from '@/docs/components/pages/date-range-input'
import { dateTimeInputPage } from '@/docs/components/pages/date-time-input'
import { dataGridPage } from '@/docs/components/pages/data-grid'
import { dataTablePage } from '@/docs/components/pages/data-table'
import { directionPage } from '@/docs/components/pages/direction'
import { dialogPage } from '@/docs/components/pages/dialog'
import { drawerPage } from '@/docs/components/pages/drawer'
import { dropdownMenuPage } from '@/docs/components/pages/dropdown-menu'
import { emptyPage } from '@/docs/components/pages/empty'
import { fieldPage } from '@/docs/components/pages/field'
import { fieldStatusPage } from '@/docs/components/pages/field-status'
import { fileInputPage } from '@/docs/components/pages/file-input'
import { formPage } from '@/docs/components/pages/form'
import { gridPage } from '@/docs/components/pages/grid'
import { headingPage } from '@/docs/components/pages/heading'
import { hoverCardPage } from '@/docs/components/pages/hover-card'
import { indicatorPage } from '@/docs/components/pages/indicator'
import { infoTipPage } from '@/docs/components/pages/info-tip'
import { itemPage } from '@/docs/components/pages/item'
import { inputPage } from '@/docs/components/pages/input'
import { inputGroupPage } from '@/docs/components/pages/input-group'
import { inputOtpPage } from '@/docs/components/pages/input-otp'
import { kbdPage } from '@/docs/components/pages/kbd'
import { labelPage } from '@/docs/components/pages/label'
import { lightboxPage } from '@/docs/components/pages/lightbox'
import { linkPage } from '@/docs/components/pages/link'
import { listPage } from '@/docs/components/pages/list'
import { listInputPage } from '@/docs/components/pages/list-input'
import { logStreamPage } from '@/docs/components/pages/log-stream'
import { markdownPage } from '@/docs/components/pages/markdown'
import { markerPage } from '@/docs/components/pages/marker'
import { messagePage } from '@/docs/components/pages/message'
import { messageScrollerPage } from '@/docs/components/pages/message-scroller'
import { menubarPage } from '@/docs/components/pages/menubar'
import { metadataListPage } from '@/docs/components/pages/metadata-list'
import { mobileNavPage } from '@/docs/components/pages/mobile-nav'
import { moreMenuPage } from '@/docs/components/pages/more-menu'
import { multiSelectorPage } from '@/docs/components/pages/multi-selector'
import { nativeSelectPage } from '@/docs/components/pages/native-select'
import { navigationMenuPage } from '@/docs/components/pages/navigation-menu'
import { numberInputPage } from '@/docs/components/pages/number-input'
import { overflowListPage } from '@/docs/components/pages/overflow-list'
import { paginationPage } from '@/docs/components/pages/pagination'
import { popoverPage } from '@/docs/components/pages/popover'
import { progressPage } from '@/docs/components/pages/progress'
import { radioGroupPage } from '@/docs/components/pages/radio-group'
import { resizablePage } from '@/docs/components/pages/resizable'
import { scrollAreaPage } from '@/docs/components/pages/scroll-area'
import { sectionPage } from '@/docs/components/pages/section'
import { selectableCardPage } from '@/docs/components/pages/selectable-card'
import { separatorPage } from '@/docs/components/pages/separator'
import { selectPage } from '@/docs/components/pages/select'
import { sheetPage } from '@/docs/components/pages/sheet'
import { sidebarPage } from '@/docs/components/pages/sidebar'
import { skeletonPage } from '@/docs/components/pages/skeleton'
import { sliderPage } from '@/docs/components/pages/slider'
import { spinnerPage } from '@/docs/components/pages/spinner'
import { stackPage } from '@/docs/components/pages/stack'
import { statPage } from '@/docs/components/pages/stat'
import { statusDotPage } from '@/docs/components/pages/status-dot'
import { stepperPage } from '@/docs/components/pages/stepper'
import { switchPage } from '@/docs/components/pages/switch'
import { tabsPage } from '@/docs/components/pages/tabs'
import { tablePage } from '@/docs/components/pages/table'
import { textPage } from '@/docs/components/pages/text'
import { textareaPage } from '@/docs/components/pages/textarea'
import { thumbnailPage } from '@/docs/components/pages/thumbnail'
import { timeInputPage } from '@/docs/components/pages/time-input'
import { timerPage } from '@/docs/components/pages/timer'
import { timestampPage } from '@/docs/components/pages/timestamp'
import { toastPage } from '@/docs/components/pages/toast'
import { togglePage } from '@/docs/components/pages/toggle'
import { toggleGroupPage } from '@/docs/components/pages/toggle-group'
import { tokenPage } from '@/docs/components/pages/token'
import { tokenizerPage } from '@/docs/components/pages/tokenizer'
import { toolbarPage } from '@/docs/components/pages/toolbar'
import { tooltipPage } from '@/docs/components/pages/tooltip'
import { topNavPage } from '@/docs/components/pages/top-nav'
import { transferListPage } from '@/docs/components/pages/transfer-list'
import { treeListPage } from '@/docs/components/pages/tree-list'
import { typographyPage } from '@/docs/components/pages/typography'
import { visuallyHiddenPage } from '@/docs/components/pages/visually-hidden'

export const authoredPages: Readonly<Record<string, AuthoredPage>> = {
  ...Object.fromEntries(
    [
      mapPage,
      mapControlsPage,
      mapMarkerPage,
      mapPopupPage,
      mapRoutePage,
      mapArcPage,
      mapGeojsonPage,
      mapClusterPage,
      mapStylesPage,
      mapLocalizationPage,
      accordionPage,
      actionBarPage,
      alertPage,
      alertDialogPage,
      aspectRatioPage,
      attachmentPage,
      avatarPage,
      avatarGroupPage,
      badgePage,
      bannerPage,
      blockquotePage,
      breadcrumbPage,
      bubblePage,
      buttonPage,
      buttonGroupPage,
      calendarPage,
      cardPage,
      carouselPage,
      chartPage,
      centerPage,
      chatReasoningPage,
      checkboxPage,
      circularProgressPage,
      codePage,
      codeBlockPage,
      collapsiblePage,
      colorPickerPage,
      comboboxPage,
      commandPage,
      contextMenuPage,
      dateInputPage,
      datePickerPage,
      dateRangeInputPage,
      dateTimeInputPage,
      dataGridPage,
      dataTablePage,
      directionPage,
      dialogPage,
      drawerPage,
      dropdownMenuPage,
      emptyPage,
      fieldPage,
      fieldStatusPage,
      fileInputPage,
      formPage,
      gridPage,
      headingPage,
      hoverCardPage,
      indicatorPage,
      itemPage,
      infoTipPage,
      inputPage,
      inputGroupPage,
      inputOtpPage,
      kbdPage,
      labelPage,
      lightboxPage,
      linkPage,
      listPage,
      listInputPage,
      logStreamPage,
      markdownPage,
      markerPage,
      messagePage,
      messageScrollerPage,
      menubarPage,
      metadataListPage,
      mobileNavPage,
      moreMenuPage,
      multiSelectorPage,
      nativeSelectPage,
      navigationMenuPage,
      numberInputPage,
      overflowListPage,
      paginationPage,
      popoverPage,
      progressPage,
      radioGroupPage,
      resizablePage,
      scrollAreaPage,
      sectionPage,
      selectableCardPage,
      separatorPage,
      selectPage,
      sheetPage,
      sidebarPage,
      skeletonPage,
      sliderPage,
      spinnerPage,
      stackPage,
      statPage,
      statusDotPage,
      stepperPage,
      switchPage,
      tabsPage,
      tablePage,
      textPage,
      textareaPage,
      thumbnailPage,
      timeInputPage,
      timerPage,
      timestampPage,
      togglePage,
      toastPage,
      toggleGroupPage,
      tokenPage,
      tokenizerPage,
      toolbarPage,
      tooltipPage,
      topNavPage,
      transferListPage,
      treeListPage,
      typographyPage,
      visuallyHiddenPage,
    ].map(page => [
      page.slug,
      {
        ...page,
        definition: {
          ...page.definition,
          ...(page.definition.stylexExamples === undefined
            ? {}
            : {
                stylexExamples: page.definition.stylexExamples.map(example => ({
                  ...example,
                  code: repairStyled(example.code, 'stylex'),
                })),
              }),
          ...(page.definition.pleatExamples === undefined
            ? {}
            : {
                pleatExamples: page.definition.pleatExamples.map(example => ({
                  ...example,
                  code: repairStyled(example.code, 'pleat'),
                })),
              }),
        },
      },
    ]),
  ),
}
