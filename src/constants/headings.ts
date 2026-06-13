export const HEADINGS = {
  // Modal Header & Input Labels
  modalTitle: "New Snapshot",
  titleLabel: "Snapshot Title",
  dexLabel: "Pokedex Regional Dex",
  swipeLeftLabel: "Swipe Left",
  swipeRightLabel: "Swipe Right",
  enableGesturesLabel: "Enable Custom Gestures",
  doubleClickLabel: "Double Click Label",
  swipeUpLabel: "Swipe Up Label",
  swipeDownLabel: "Swipe Down Label",

  // Input Placeholders
  titlePlaceholder: "e.g., Kanto Shiny Hunt",
  swipeLeftPlaceholder: "Caught",
  swipeRightPlaceholder: "Missing",
  doubleClickPlaceholder: "e.g., Favorite (Optional)",
  swipeUpPlaceholder: "e.g., To Evolve (Optional)",
  swipeDownPlaceholder: "e.g., Trash (Optional)",

  // Buttons & Loader Text
  cancelBtn: "Cancel",
  createBtn: "Create Snapshot",
  fetchingText: "Fetching Dex...",

  // Errors
  errorEmptyTitle: "Please enter a session title.",
  errorNoCards: "No cards found for this Dex option.",
  errorFetchFailed: "Failed to fetch Dex data. Please check your connection.",

  // Dashboard Text & Info
  dashboardTitle: "M.O.D.E.",
  dashboardSubtitle: "Mobile Optimized Dex Entry",
  sectionInProgress: "In Progress",
  sectionCompleted: "Completed",
  loadingSessions: "Loading sessions...",
  emptyInProgress: "No in-progress snapshots.",
  emptyCompleted: "No completed snapshots yet.",
  btnAnalyse: "Analyse",
  btnNew: "New",
  tooltipDelete: "Delete snapshot",
  tooltipUpload: "Upload snapshot JSON",

  // Dashboard Actions Confirmation/Alerts
  confirmDeleteSession:
    "Are you sure you want to delete this snapshot and all swipe history?",
  errUploadInvalidJson: "Invalid file content. Must be a JSON object.",
  errUploadMissingSession: "Missing session metadata in JSON.",
  errUploadMissingTitleDex: "Session title or dex type is missing.",
  errUploadMissingActions: "Missing actions list in JSON.",
  msgUploadSuccessPre: "Snapshot",
  msgUploadSuccessPost: "imported successfully!",
  msgUploadFailed: "Import failed:",

  // Session View Copy
  loadingPokedex: "Syncing Pokedex entries...",
  accessErrorTitle: "Access Error",
  sessionNotFound: "Session not found.",
  defaultSessionError: "An error occurred loading the snapshot.",
  btnBackToDashboard: "Back to Dashboard",
  completedStamp: "100% DONE",
  completedTitle: "Snapshot Completed!",
  completedSubtitle: "All {total} entries have been categorized.",
  resultEmptyColumn: "None",
  btnRestartSnapshot: "Restart Snapshot",
  btnExportJson: "Export JSON",
  btnAnalyseSnapshots: "Analyse Snapshots",
  confirmRestartSession:
    "Wipe all swipe data and saved card JSON for this session and start over?",
  confirmAutoSwipePrefix: "Are you sure you want to categorize all remaining ",
  confirmAutoSwipeMid: ' Pokémon as "',
  confirmAutoSwipeSuffix: '"?',
  errAutoSwipeFailed: "Failed to auto-categorize remaining Pokémon.",
  errLoadPokedexFailed:
    "Failed to load Pokedex. Please check internet connection.",
  autoSwipePrefix: "Auto ",

  // Analyse View Copy
  analyseTitle: "Analyse Snapshots",
  analyseLoading: "Joining snapshot datasets...",
  analyseEmptyState:
    "Select at least one completed snapshot from the sidebar filters to begin analysis.",
  analyseNoFilteredResults: "No results match the current filters.",
  analyseShowingEntries: "Showing {count} entries",
  analyseBannerText: "Custom Query is currently filtering the spreadsheet.",
  analyseBtnResetFilter: "Reset Filter",
  analyseBtnExport: "Export",
  analyseBtnColumns: "Columns",
  analyseBtnListView: "List",
  analyseBtnTableView: "Table",
  analyseRawCardDataHeader: "Raw Card Data",
  analyseLoadingMore: "Loading more entries...",
  analyseFiltersTitle: "Filters",
  analyseSelectSnapshotsLabel: "Select Completed Snapshots",
  analyseNoSnapshotsAvailable: "No completed snapshots available.",
  analyseFilterByLabel: "Filter By Categorization",
  analyseQueryBuilderTitle: "Query Builder",
  analyseQueryBuilderDesc: "Visual block-based query builder",
  analyseBtnAddFilterBlock: "Add filter block",
  analyseBtnApplyQuery: "Apply Query",
  analyseBtnSaveQuery: "Save Query",
  analyseLabelViewDetails: "View Details",
  analyseLabelHideDetails: "Hide Details",
  analysePromptQueryName: "Enter a name for this custom query:",
  analyseAlertUpdateCategorizationFailed:
    "Failed to update categorization in the database.",
  analyseToastCopied: "Link copied to clipboard!",
  analyseToastCopyFailed: "Failed to copy link: ",
};
