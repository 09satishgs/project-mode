import React from "react";
import { useNavigate } from "react-router-dom";
import JsonTreeView from "../../components/JsonTreeView/JsonTreeView";
import MobileSheet from "../../components/MobileSheet/MobileSheet";
import { formatTime } from "../../utils/helpers";
import { HEADINGS } from "../../constants/headings";
import { useAnalyse } from "./useAnalyse";
import type { QueryRelation } from "./useAnalyse";
import "./Analyse.scss";

export const Analyse: React.FC = () => {
  const navigate = useNavigate();
  const {
    completedSessions,
    selectedSessionIds,
    searchText,
    setSearchText,
    nestedQuery,
    setNestedQuery,
    selectedLabels,
    availableLabels,
    sortField,
    sortOrder,
    expandedRows,
    viewMode,
    setViewMode,
    loading,
    visibleCount,
    showQueryBuilder,
    setShowQueryBuilder,
    isQueryBuilderActive,
    queryBlocks,
    queryRelations,
    blockCounts,
    savedQueries,
    isFiltersOpen,
    setIsFiltersOpen,
    showColumnDropdown,
    setShowColumnDropdown,
    visibleColumns,
    setVisibleColumns,
    toggleSession,
    toggleLabelFilter,
    toggleRowExpanded,
    handleSort,
    handleCategorizationChange,
    handleCycleCategorization,
    handleExportJSON,
    addBlock,
    removeBlock,
    handleRelationChange,
    toggleBlockSession,
    toggleBlockLabel,
    getBlockAvailableLabels,
    isQueryValid,
    applyQueryBuilder,
    resetQueryBuilder,
    handleSaveQuery,
    handleLoadQuery,
    handleDeleteQuery,
    getSessionOptions,
    sentinelRef,
    filtered,
    visibleColumnsCount,
    copyShareableLink,
    copyIDs,
  } = useAnalyse();

  return (
    <div className="analyse-view fade-in">
      {/* Sticky Header */}
      <header className="analyse-header">
        <button
          className="back-btn"
          onClick={() => navigate("/")}
          aria-label="Back to dashboard"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{HEADINGS.analyseTitle}</h1>
        <div className="spacer"></div>
        <button
          className="btn-secondary toggle-filters-btn"
          style={{ display: "none" }}
        >
          Toggle
        </button>
      </header>

      {/* Floating Actions Group (Top-Right of Viewport) */}
      <div className="floating-actions-group">
        {/* Filters Trigger Button */}
        <button
          className={`floating-trigger-btn filters-trigger ${isFiltersOpen ? "active" : ""}`}
          onClick={() => {
            const nextVal = !isFiltersOpen;
            setIsFiltersOpen(nextVal);
            if (nextVal) {
              setShowQueryBuilder(false);
            }
          }}
          aria-label={isFiltersOpen ? HEADINGS.analyseLabelHideDetails : "Show Filters"}
        >
          <span className="icon">
            {isFiltersOpen ? (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            )}
          </span>
          <span className="label-text">{HEADINGS.analyseLabelHideDetails}</span>
        </button>

        {/* Query Builder Trigger Button */}
        <button
          className={`floating-trigger-btn query-trigger ${showQueryBuilder ? "active" : ""} ${isQueryBuilderActive ? "query-active" : ""}`}
          onClick={() => {
            const nextVal = !showQueryBuilder;
            setShowQueryBuilder(nextVal);
            if (nextVal) {
              setIsFiltersOpen(false);
            }
          }}
          aria-label={
            showQueryBuilder ? "Close Query Builder" : "Show Query Builder"
          }
        >
          <span className="icon">
            {showQueryBuilder ? (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            )}
          </span>
          <span className="label-text">Close Query Builder</span>
          {isQueryBuilderActive && !showQueryBuilder && (
            <span className="active-dot" />
          )}
        </button>
      </div>

      {/* Main Analysis Filters & Table Grid */}
      <div className="analyse-container">
        {/* Right Side: Tabular Spreadsheet Display */}
        <main className="table-area">
          {isQueryBuilderActive && (
            <div className="query-active-banner animate-slide-down">
              <span>{HEADINGS.analyseBannerText}</span>
              <button
                className="btn-secondary btn-small"
                onClick={resetQueryBuilder}
              >
                {HEADINGS.analyseBtnResetFilter}
              </button>
            </div>
          )}

          {loading ? (
            <div className="loader-container">
              <span className="spinner"></span> {HEADINGS.analyseLoading}
            </div>
          ) : !isQueryBuilderActive && selectedSessionIds.length === 0 ? (
            <div className="empty-state">
              <p>{HEADINGS.analyseEmptyState}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>{HEADINGS.analyseNoFilteredResults}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <div className="table-controls">
                <div className="results-info-group">
                  <span className="results-count">
                    {HEADINGS.analyseShowingEntries.replace(
                      "{count}",
                      filtered.length.toString(),
                    )}
                  </span>
                  <span className="info-separator">·</span>
                  <button className="copy-ids-text-btn" onClick={copyIDs}>
                    {HEADINGS.analyseBtnCopyIDs}
                  </button>
                </div>

                <div className="table-actions-group">
                  {/* View Mode Toggle */}
                  <button
                    className="btn-secondary view-toggle-btn"
                    onClick={() =>
                      setViewMode(viewMode === "table" ? "list" : "table")
                    }
                    aria-label={
                      viewMode === "table"
                        ? HEADINGS.analyseBtnListView
                        : HEADINGS.analyseBtnTableView
                    }
                  >
                    {viewMode === "table" ? (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{ marginRight: "6px" }}
                        >
                          <rect x="3" y="3" width="7" height="9" />
                          <rect x="14" y="3" width="7" height="5" />
                          <rect x="14" y="12" width="7" height="9" />
                          <rect x="3" y="16" width="7" height="5" />
                        </svg>
                        {HEADINGS.analyseBtnListView}
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{ marginRight: "6px" }}
                        >
                          <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
                        </svg>
                        {HEADINGS.analyseBtnTableView}
                      </>
                    )}
                  </button>

                  {/* Columns Select Dropdown */}
                  <div className="column-selector-wrapper">
                    <button
                      className={`btn-secondary columns-btn ${showColumnDropdown ? "active" : ""}`}
                      onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ marginRight: "6px" }}
                      >
                        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
                      </svg>
                      {HEADINGS.analyseBtnColumns}
                    </button>
                    {showColumnDropdown && (
                      <div className="columns-dropdown">
                        {Object.keys(visibleColumns).map((col) => (
                          <label key={col} className="column-checkbox-item">
                            <input
                              type="checkbox"
                              checked={
                                visibleColumns[
                                  col as keyof typeof visibleColumns
                                ]
                              }
                              onChange={() =>
                                setVisibleColumns((prev) => ({
                                  ...prev,
                                  [col]:
                                    !prev[col as keyof typeof visibleColumns],
                                }))
                              }
                            />
                            <span>
                              {col === "cardId"
                                ? "ID"
                                : col === "label"
                                  ? "Categorization"
                                  : col === "timestamp"
                                    ? "Time"
                                    : col.charAt(0).toUpperCase() +
                                      col.slice(1)}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>


                  {/* Export button */}
                  <button
                    className="btn-secondary export-btn"
                    onClick={() => handleExportJSON(filtered)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ marginRight: "6px" }}
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {HEADINGS.analyseBtnExport}
                  </button>
                </div>
              </div>

              {viewMode === "table" ? (
                <div className="spreadsheet-container">
                  <table className="spreadsheet">
                    <thead>
                      <tr>
                        <th
                          style={{
                            width: "40px",
                            padding: "0.75rem 0.5rem",
                            textAlign: "center",
                          }}
                        ></th>
                        {visibleColumns.snapshot && <th>Snapshot</th>}
                        {visibleColumns.cardId && (
                          <th
                            className="sortable"
                            onClick={() => handleSort("cardId")}
                          >
                            ID{" "}
                            {sortField === "cardId"
                              ? sortOrder === "asc"
                                ? "▲"
                                : "▼"
                              : ""}
                          </th>
                        )}
                        {visibleColumns.name && (
                          <th
                            className="sortable"
                            onClick={() => handleSort("name")}
                          >
                            Name{" "}
                            {sortField === "name"
                              ? sortOrder === "asc"
                                ? "▲"
                                : "▼"
                              : ""}
                          </th>
                        )}
                        {visibleColumns.label && (
                          <th
                            className="sortable"
                            onClick={() => handleSort("label")}
                          >
                            Categorization{" "}
                            {sortField === "label"
                              ? sortOrder === "asc"
                                ? "▲"
                                : "▼"
                              : ""}
                          </th>
                        )}
                        {visibleColumns.timestamp && (
                          <th
                            className="sortable"
                            onClick={() => handleSort("timestamp")}
                          >
                            Time{" "}
                            {sortField === "timestamp"
                              ? sortOrder === "asc"
                                ? "▲"
                                : "▼"
                              : ""}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, visibleCount).map((record) => {
                        const isRowExpanded = !!expandedRows[record.id];
                        return (
                          <React.Fragment key={record.id}>
                            <tr
                              className={`data-row ${isRowExpanded ? "expanded-row-active" : ""}`}
                              onClick={() => toggleRowExpanded(record.id)}
                            >
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "0.75rem 0.5rem",
                                }}
                              >
                                <button
                                  className="details-toggle-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpanded(record.id);
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className={`chevron-icon ${isRowExpanded ? "expanded" : ""}`}
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>
                              </td>
                              {visibleColumns.snapshot && (
                                <td className="truncate-cell">
                                  {record.sessionTitle}
                                </td>
                              )}
                              {visibleColumns.cardId && (
                                <td>#{record.cardId.padStart(3, "0")}</td>
                              )}
                              {visibleColumns.name && (
                                <td className="name-cell">
                                  <div className="name-cell-content">
                                    {record.details?.imageUrl && (
                                      <img
                                        src={record.details.imageUrl}
                                        alt=""
                                        className="pokemon-mini-sprite"
                                        loading="lazy"
                                      />
                                    )}
                                    <strong>{record.name}</strong>
                                  </div>
                                </td>
                              )}
                              {visibleColumns.label && (
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div className="categorization-cell-wrapper">
                                    <select
                                      value={record.direction}
                                      onChange={(e) =>
                                        handleCategorizationChange(
                                          record,
                                          e.target.value,
                                        )
                                      }
                                      className={`badge-label-select ${record.direction}`}
                                    >
                                      {getSessionOptions(record.sessionId).map(
                                        (opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                    <button
                                      className="btn-cycle-categorization"
                                      onClick={() => handleCycleCategorization(record)}
                                      title="Cycle categorization"
                                      aria-label="Cycle categorization"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="14"
                                        height="14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                      >
                                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              )}
                              {visibleColumns.timestamp && (
                                <td>{formatTime(record.timestamp)}</td>
                              )}
                            </tr>

                            {/* Expanded Nested JSON Row */}
                            {isRowExpanded && (
                              <tr className="expanded-row">
                                <td colSpan={visibleColumnsCount + 1}>
                                  <div className="json-container">
                                    <h4>{HEADINGS.analyseRawCardDataHeader}</h4>
                                    <div className="json-tree-wrapper">
                                      <JsonTreeView data={record.details} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {filtered.length > visibleCount && (
                        <tr ref={sentinelRef} className="lazy-sentinel-row">
                          <td
                            colSpan={visibleColumnsCount + 1}
                            style={{
                              textAlign: "center",
                              padding: "1.25rem",
                              color: "#8a8a8a",
                              fontSize: "0.85rem",
                            }}
                          >
                            {HEADINGS.analyseLoadingMore}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="list-view-container">
                  {filtered.slice(0, visibleCount).map((record) => {
                    const isRowExpanded = !!expandedRows[record.id];
                    return (
                      <div
                        key={record.id}
                        className={`analysis-card ${record.direction} ${isRowExpanded ? "expanded" : ""}`}
                      >
                        <div className="card-top">
                          <div className="card-info">
                            {visibleColumns.snapshot && (
                              <span className="card-snapshot-badge">
                                {record.sessionTitle}
                              </span>
                            )}
                            <div className="card-identity">
                              {visibleColumns.cardId && (
                                <span className="card-pokemon-id">
                                  #{record.cardId.padStart(3, "0")}
                                </span>
                              )}
                              {visibleColumns.name && (
                                <h3 className="card-pokemon-name">
                                  {record.name}
                                </h3>
                              )}
                            </div>
                          </div>
                          {record.details?.imageUrl && (
                            <img
                              src={record.details.imageUrl}
                              alt={record.name}
                              className="card-pokemon-image"
                              loading="lazy"
                            />
                          )}
                        </div>

                        <div className="card-middle">
                          {visibleColumns.label && (
                            <div className="card-categorization">
                              <label>Categorization</label>
                              <div className="categorization-cell-wrapper">
                                <select
                                  value={record.direction}
                                  onChange={(e) =>
                                    handleCategorizationChange(
                                      record,
                                      e.target.value,
                                    )
                                  }
                                  className={`badge-label-select ${record.direction}`}
                                >
                                  {getSessionOptions(record.sessionId).map(
                                    (opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                                <button
                                  className="btn-cycle-categorization"
                                  onClick={() => handleCycleCategorization(record)}
                                  title="Cycle categorization"
                                  aria-label="Cycle categorization"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                          {visibleColumns.timestamp && (
                            <div className="card-timestamp">
                              <label>Time</label>
                              <span>{formatTime(record.timestamp)}</span>
                            </div>
                          )}
                        </div>

                        {!isRowExpanded && (
                          <button
                            className="card-expand-chevron"
                            onClick={() => toggleRowExpanded(record.id)}
                            aria-label="View Details"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        )}

                        {isRowExpanded && (
                          <div className="card-details-expanded">
                            <div className="json-container">
                              <div className="json-header">
                                <h4>{HEADINGS.analyseRawCardDataHeader}</h4>
                                <button
                                  className="btn-close-details"
                                  onClick={() => toggleRowExpanded(record.id)}
                                  aria-label="Close Details"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                              <div className="json-tree-wrapper">
                                <JsonTreeView data={record.details} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filtered.length > visibleCount && (
                    <div ref={sentinelRef} className="lazy-sentinel-div">
                      {HEADINGS.analyseLoadingMore}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sheet for Filters */}
      <MobileSheet
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title={HEADINGS.analyseFiltersTitle}
      >
        <div className="filter-sheet-body">
          <div className="filter-block">
            <h3>{HEADINGS.analyseSelectSnapshotsLabel}</h3>
            {completedSessions.length === 0 ? (
              <p className="no-data-text">{HEADINGS.analyseNoSnapshotsAvailable}</p>
            ) : (
              <div className="checkbox-list">
                {completedSessions.map((session) => (
                  <label key={session.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.includes(session.id)}
                      onChange={() => toggleSession(session.id)}
                    />
                    <div className="checkbox-text">
                      <span className="title">{session.title}</span>
                      <span className="count">
                        ({session.totalCards} cards)
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedSessionIds.length > 0 && availableLabels.length > 0 && (
            <div className="filter-block">
              <h3>{HEADINGS.analyseFilterByLabel}</h3>
              <div className="checkbox-list">
                {availableLabels.map((lbl) => (
                  <label key={lbl} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedLabels.includes(lbl)}
                      onChange={() => toggleLabelFilter(lbl)}
                    />
                    <div className="checkbox-text">
                      <span className="title">{lbl}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="filter-block">
            <h3>Text Search & Nested Path Query</h3>
            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="search">Search Pokémon</label>
              <input
                type="text"
                id="search"
                placeholder="e.g. Bulbasaur, shininess"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="nested">Nested Path Query Builder</label>
              <input
                type="text"
                id="nested"
                placeholder="path = value (e.g. stats.hp = 45)"
                value={nestedQuery}
                onChange={(e) => setNestedQuery(e.target.value)}
              />
              <span className="input-hint">
                Format: <code>path = value</code> (e.g.{" "}
                <code>types = grass</code> or <code>stats.attack = 49</code>)
              </span>
            </div>
          </div>
        </div>
      </MobileSheet>

      {/* Mobile Sheet for Visual Query Builder */}
      <MobileSheet
        isOpen={showQueryBuilder}
        onClose={() => setShowQueryBuilder(false)}
        title={HEADINGS.analyseQueryBuilderTitle}
      >
        <div className="query-builder-sheet-body">
          {savedQueries.length > 0 && (
            <div className="saved-queries-section">
              <label>Load Saved Query</label>
              <div className="saved-queries-list">
                {savedQueries.map((q) => (
                  <div
                    key={q.id}
                    className="saved-query-pill"
                    onClick={() => handleLoadQuery(q.id)}
                  >
                    <span className="query-name">{q.name}</span>
                    <button
                      className="delete-query-btn"
                      onClick={(e) => handleDeleteQuery(q.id, e)}
                      aria-label="Delete saved query"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="builder-blocks-flow">
            {queryBlocks.map((block, index) => (
              <React.Fragment key={block.id}>
                {/* Relation connector if index > 0 */}
                {index > 0 && (
                  <div className="relation-connector">
                    <select
                      value={queryRelations[index - 1] || "INTERSECT"}
                      onChange={(e) =>
                        handleRelationChange(
                          index - 1,
                          e.target.value as QueryRelation,
                        )
                      }
                    >
                      <option value="INTERSECT">INTERSECT (AND)</option>
                      <option value="UNION">UNION (OR)</option>
                      <option value="DIFFERENCE">DIFFERENCE (EXCLUDE)</option>
                    </select>
                  </div>
                )}

                {/* Block Card */}
                <div className="query-block-card">
                  <div className="block-header">
                    <h3>Filter Block #{index + 1}</h3>
                    {queryBlocks.length > 1 && (
                      <button
                        className="remove-block-btn"
                        onClick={() => removeBlock(block.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="block-body">
                    <div className="form-group">
                      <label>Select Snapshot(s)</label>
                      <div className="sessions-multiselect">
                        {completedSessions.map((sess) => (
                          <label
                            key={sess.id}
                            className="checkbox-item-compact"
                          >
                            <input
                              type="checkbox"
                              checked={block.sessionIds.includes(sess.id)}
                              onChange={() =>
                                toggleBlockSession(index, sess.id)
                              }
                            />
                            <span>{sess.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {block.sessionIds.length > 0 && (
                      <div className="form-group">
                        <label>Select Label(s)</label>
                        <div className="labels-multiselect">
                          {getBlockAvailableLabels(block.sessionIds).map(
                            (lbl) => (
                              <label
                                key={lbl}
                                className="checkbox-item-compact"
                              >
                                <input
                                  type="checkbox"
                                  checked={block.labels.includes(lbl)}
                                  onChange={() => toggleBlockLabel(index, lbl)}
                                />
                                <span>{lbl}</span>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <div className="block-summary">
                      <span>
                        Matching cards in this block:{" "}
                        <strong>{blockCounts[block.id] || 0}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}

            <button className="btn-secondary add-block-btn" onClick={addBlock}>
              + {HEADINGS.analyseBtnAddFilterBlock}
            </button>
          </div>

          <div className="builder-actions">
            <button
              className="btn-primary btn-apply-query"
              onClick={applyQueryBuilder}
              disabled={!isQueryValid()}
            >
              {HEADINGS.analyseBtnApplyQuery}
            </button>
            <div className="secondary-actions-row">
              <button
                className="btn-secondary"
                onClick={handleSaveQuery}
                disabled={!isQueryValid()}
              >
                {HEADINGS.analyseBtnSaveQuery}
              </button>
              <button
                className="btn-secondary"
                onClick={copyShareableLink}
                disabled={!isQueryValid()}
              >
                Share Link
              </button>
              {isQueryBuilderActive && (
                <button className="btn-secondary" onClick={resetQueryBuilder}>
                  {HEADINGS.analyseBtnResetFilter}
                </button>
              )}
            </div>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
};

export default Analyse;
