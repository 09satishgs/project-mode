import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../../db/db";
import type { SessionMetadata } from "../../db/types";
import JsonTreeView from "../../components/JsonTreeView/JsonTreeView";
import MobileSheet from "../../components/MobileSheet/MobileSheet";
import "./Analyse.scss";

type QueryRelation = 'INTERSECT' | 'UNION' | 'DIFFERENCE';

interface JoinedRecord {
  id: string; // Unique row ID: sessionId_cardId
  sessionId: string;
  sessionTitle: string;
  cardId: string;
  name: string;
  subtitle: string;
  direction: string;
  label: string; // display label (Caught, Missing, etc.)
  timestamp: number;
  details: any; // Nested JSON object
}

// Helper to resolve dot-notated paths in nested objects
const getNestedValue = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
};

// Generic deep recursive search helper
const deepSearch = (obj: any, query: string): boolean => {
  if (!obj) return false;
  if (typeof obj === "string") return obj.toLowerCase().includes(query);
  if (typeof obj === "number" || typeof obj === "boolean")
    return obj.toString().toLowerCase().includes(query);
  if (typeof obj === "object") {
    return Object.values(obj).some((val) => deepSearch(val, query));
  }
  return false;
};

export const Analyse: React.FC = () => {
  const navigate = useNavigate();

  // Completed sessions list for selection filter
  const [completedSessions, setCompletedSessions] = useState<SessionMetadata[]>(
    [],
  );
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [joinedRecords, setJoinedRecords] = useState<JoinedRecord[]>([]);

  // Filtering & Sorting State
  const [searchText, setSearchText] = useState("");
  const [nestedQuery, setNestedQuery] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [sortField, setSortField] = useState<
    "cardId" | "name" | "label" | "timestamp"
  >("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Expanded row tracking (Map of row ID -> boolean)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Visual Query Builder State
  const [searchParams, setSearchParams] = useSearchParams();
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [isQueryBuilderActive, setIsQueryBuilderActive] = useState(false);
  const [queryBlocks, setQueryBlocks] = useState<Array<{ id: string; sessionIds: string[]; labels: string[] }>>([
    { id: 'block-1', sessionIds: [], labels: [] }
  ]);
  const [queryRelations, setQueryRelations] = useState<QueryRelation[]>([]);
  const [blockCounts, setBlockCounts] = useState<Record<string, number>>({});
  const [queryBuilderRecords, setQueryBuilderRecords] = useState<JoinedRecord[]>([]);
  const [savedQueries, setSavedQueries] = useState<Array<{ id: string; name: string; blocks: any[]; relations: any[] }>>([]);

  // Mobile-Optimized Collapsible Filters & Columns States
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    snapshot: true,
    cardId: true,
    name: true,
    label: true,
    timestamp: true,
  });

  // Load completed sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const completed = await db.sessions
          .where("status")
          .equals("completed")
          .toArray();
        setCompletedSessions(completed);

        // Auto-select all by default to give a broad snapshot overview
        if (completed.length > 0) {
          const ids = completed.map((s) => s.id);
          setSelectedSessionIds(ids);
        }
      } catch (err) {
        console.error("Failed to load completed sessions:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

  // Load saved queries on mount
  useEffect(() => {
    const stored = localStorage.getItem("mode_saved_queries");
    if (stored) {
      try {
        setSavedQueries(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse saved queries:", err);
      }
    }
  }, []);

  // Fetch and Join data whenever selected sessions change
  useEffect(() => {
    const joinData = async () => {
      if (selectedSessionIds.length === 0) {
        setJoinedRecords([]);
        setAvailableLabels([]);
        return;
      }

      try {
        setLoading(true);

        // 1. Fetch metadata for selected sessions
        const selectedSessions = await db.sessions
          .where("id")
          .anyOf(selectedSessionIds)
          .toArray();
        const sessionMap = new Map(selectedSessions.map((s) => [s.id, s]));

        // 2. Fetch actions
        const actions = await db.swipeActions
          .where("sessionId")
          .anyOf(selectedSessionIds)
          .toArray();

        // 3. Fetch card details
        const cardDetailsList = await db.cardDetails
          .where("sessionId")
          .anyOf(selectedSessionIds)
          .toArray();
        const cardDetailsMap = new Map(
          cardDetailsList.map((c) => [`${c.sessionId}_${c.cardId}`, c.details]),
        );

        // 4. Perform Three-Table Join
        const records: JoinedRecord[] = [];
        const uniqueLabels = new Set<string>();

        actions.forEach((act) => {
          const sess = sessionMap.get(act.sessionId);
          if (!sess) return;

          // Map direction string to custom labels
          let label: string = act.direction;
          if (act.direction === "left") label = sess.swipeLeftLabel;
          else if (act.direction === "right") label = sess.swipeRightLabel;
          else if (act.direction === "double-click" && sess.doubleClickLabel)
            label = sess.doubleClickLabel;
          else if (act.direction === "up" && sess.swipeUpLabel)
            label = sess.swipeUpLabel;
          else if (act.direction === "down" && sess.swipeDownLabel)
            label = sess.swipeDownLabel;

          uniqueLabels.add(label);

          const cardKey = `${act.sessionId}_${act.cardId}`;
          const details = cardDetailsMap.get(cardKey) || {};

          records.push({
            id: cardKey,
            sessionId: act.sessionId,
            sessionTitle: sess.title,
            cardId: act.cardId,
            name: details.primaryText || `Card #${act.cardId}`,
            subtitle: details.secondaryText || "",
            direction: act.direction,
            label,
            timestamp: act.timestamp,
            details,
          });
        });

        setJoinedRecords(records);
        setAvailableLabels(Array.from(uniqueLabels));
        setSelectedLabels([]); // Reset selected filters on session list changes
      } catch (err) {
        console.error("Failed to join tables:", err);
      } finally {
        setLoading(false);
      }
    };

    joinData();
  }, [selectedSessionIds]);

  const toggleSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleLabelFilter = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Sort and Filter joined records
  const getFilteredRecords = () => {
    const sourceRecords = isQueryBuilderActive ? queryBuilderRecords : joinedRecords;
    return sourceRecords
      .filter((record) => {
        // Session Filter: If query builder is active and we have selectedSessionIds, filter by them
        if (isQueryBuilderActive && selectedSessionIds.length > 0) {
          return selectedSessionIds.includes(record.sessionId);
        }
        return true;
      })
      .filter((record) => {
        // Search Filter (Free text search matches name, subtitle, ID or recursive card json)
        if (searchText.trim()) {
          const query = searchText.toLowerCase();
          const matchesMeta =
            record.name.toLowerCase().includes(query) ||
            record.cardId.toLowerCase().includes(query) ||
            record.subtitle.toLowerCase().includes(query);

          if (!matchesMeta) {
            // Scan deep nested json
            return deepSearch(record.details, query);
          }
          return true;
        }
        return true;
      })
      .filter((record) => {
        // Label Filter
        if (selectedLabels.length > 0) {
          return selectedLabels.includes(record.label);
        }
        return true;
      })
      .filter((record) => {
        // Nested Key Filter: path = value (e.g. types = grass, stats.hp = 45)
        if (nestedQuery.includes("=")) {
          const [pathStr, valStr] = nestedQuery.split("=").map((s) => s.trim());
          if (!pathStr || !valStr) return true;

          const resolvedValue = getNestedValue(record.details, pathStr);
          if (resolvedValue === undefined) return false;

          const target = valStr.toLowerCase();
          if (Array.isArray(resolvedValue)) {
            return resolvedValue.some(
              (item) => item.toString().toLowerCase() === target,
            );
          }
          return resolvedValue.toString().toLowerCase().includes(target);
        }
        return true;
      })
      .sort((a, b) => {
        // Sorting logic
        let comparison = 0;
        if (sortField === "timestamp") {
          comparison = a.timestamp - b.timestamp;
        } else if (sortField === "cardId") {
          comparison =
            parseInt(a.cardId) - parseInt(b.cardId) ||
            a.cardId.localeCompare(b.cardId);
        } else if (sortField === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === "label") {
          comparison = a.label.localeCompare(b.label);
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
  };

  // Set operations for combining query block records
  const combineSets = (
    records1: JoinedRecord[],
    records2: JoinedRecord[],
    relation: QueryRelation
  ): JoinedRecord[] => {
    const set2Ids = new Set(records2.map((r) => r.cardId));

    if (relation === 'INTERSECT') {
      return records1.filter((r) => set2Ids.has(r.cardId));
    } else if (relation === 'DIFFERENCE') {
      return records1.filter((r) => !set2Ids.has(r.cardId));
    } else if (relation === 'UNION') {
      const merged = [...records1];
      const set1Ids = new Set(records1.map((r) => r.cardId));
      records2.forEach((r) => {
        if (!set1Ids.has(r.cardId)) {
          merged.push(r);
        }
      });
      return merged;
    }
    return records1;
  };

  // Calculate matching counts and records for the Visual Query Builder
  const calculateQueryBuilder = async () => {
    try {
      const sessionMap = new Map(completedSessions.map((s) => [s.id, s]));
      const blockRecordsMap: Record<string, JoinedRecord[]> = {};
      const newBlockCounts: Record<string, number> = {};

      for (const block of queryBlocks) {
        if (block.sessionIds.length === 0 || block.labels.length === 0) {
          blockRecordsMap[block.id] = [];
          newBlockCounts[block.id] = 0;
          continue;
        }

        const actions = await db.swipeActions
          .where('sessionId')
          .anyOf(block.sessionIds)
          .toArray();

        const cardDetailsList = await db.cardDetails
          .where('sessionId')
          .anyOf(block.sessionIds)
          .toArray();
        const cardDetailsMap = new Map(
          cardDetailsList.map((c) => [`${c.sessionId}_${c.cardId}`, c.details])
        );

        const blockRecords: JoinedRecord[] = [];

        actions.forEach((act) => {
          const sess = sessionMap.get(act.sessionId);
          if (!sess) return;

          let label: string = act.direction;
          if (act.direction === 'left') label = sess.swipeLeftLabel;
          else if (act.direction === 'right') label = sess.swipeRightLabel;
          else if (act.direction === 'double-click' && sess.doubleClickLabel) label = sess.doubleClickLabel;
          else if (act.direction === 'up' && sess.swipeUpLabel) label = sess.swipeUpLabel;
          else if (act.direction === 'down' && sess.swipeDownLabel) label = sess.swipeDownLabel;

          if (block.labels.includes(label)) {
            const cardKey = `${act.sessionId}_${act.cardId}`;
            const details = cardDetailsMap.get(cardKey) || {};

            blockRecords.push({
              id: cardKey,
              sessionId: act.sessionId,
              sessionTitle: sess.title,
              cardId: act.cardId,
              name: details.primaryText || `Card #${act.cardId}`,
              subtitle: details.secondaryText || "",
              direction: act.direction,
              label,
              timestamp: act.timestamp,
              details,
            });
          }
        });

        blockRecordsMap[block.id] = blockRecords;
        newBlockCounts[block.id] = blockRecords.length;
      }

      setBlockCounts(newBlockCounts);

      if (queryBlocks.length === 0) {
        setQueryBuilderRecords([]);
        return;
      }

      let combined = blockRecordsMap[queryBlocks[0].id] || [];

      for (let i = 1; i < queryBlocks.length; i++) {
        const relation = queryRelations[i - 1] || 'INTERSECT';
        const nextBlockRecords = blockRecordsMap[queryBlocks[i].id] || [];
        combined = combineSets(combined, nextBlockRecords, relation);
      }

      setQueryBuilderRecords(combined);
    } catch (err) {
      console.error('Failed to calculate query builder matches:', err);
    }
  };

  // Re-calculate block counts whenever builder state or completed sessions change
  useEffect(() => {
    if (completedSessions.length > 0) {
      calculateQueryBuilder();
    }
  }, [queryBlocks, queryRelations, completedSessions]);

  // Hydrate query builder from URL parameter
  useEffect(() => {
    const queryB64 = searchParams.get('query');
    if (queryB64) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(queryB64)));
        if (decoded && Array.isArray(decoded.blocks)) {
          setQueryBlocks(decoded.blocks);
          setQueryRelations(decoded.relations || []);
          setIsQueryBuilderActive(true);
          setShowQueryBuilder(true);
        }
      } catch (err) {
        console.error('Failed to parse query from URL:', err);
      }
    }
  }, [searchParams]);

  // Query builder handlers
  const addBlock = () => {
    const newId = `block-${Date.now()}`;
    setQueryBlocks([...queryBlocks, { id: newId, sessionIds: [], labels: [] }]);
    setQueryRelations([...queryRelations, 'INTERSECT']);
  };

  const removeBlock = (id: string) => {
    if (queryBlocks.length <= 1) return;
    const index = queryBlocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const nextBlocks = queryBlocks.filter((b) => b.id !== id);
    const nextRelations = [...queryRelations];
    if (index === 0) {
      nextRelations.shift();
    } else {
      nextRelations.splice(index - 1, 1);
    }

    setQueryBlocks(nextBlocks);
    setQueryRelations(nextRelations);
  };

  const handleRelationChange = (index: number, val: QueryRelation) => {
    const next = [...queryRelations];
    next[index] = val;
    setQueryRelations(next);
  };

  const toggleBlockSession = (blockIndex: number, sessionId: string) => {
    const next = [...queryBlocks];
    const block = next[blockIndex];
    if (block.sessionIds.includes(sessionId)) {
      block.sessionIds = block.sessionIds.filter((id) => id !== sessionId);
    } else {
      block.sessionIds = [...block.sessionIds, sessionId];
    }
    const available = getBlockAvailableLabels(block.sessionIds);
    block.labels = block.labels.filter((l) => available.includes(l));
    setQueryBlocks(next);
  };

  const toggleBlockLabel = (blockIndex: number, label: string) => {
    const next = [...queryBlocks];
    const block = next[blockIndex];
    if (block.labels.includes(label)) {
      block.labels = block.labels.filter((l) => l !== label);
    } else {
      block.labels = [...block.labels, label];
    }
    setQueryBlocks(next);
  };

  const getBlockAvailableLabels = (sessionIds: string[]) => {
    const labels = new Set<string>();
    sessionIds.forEach((id) => {
      const sess = completedSessions.find((s) => s.id === id);
      if (sess) {
        labels.add(sess.swipeLeftLabel);
        labels.add(sess.swipeRightLabel);
        if (sess.doubleClickLabel) labels.add(sess.doubleClickLabel);
        if (sess.swipeUpLabel) labels.add(sess.swipeUpLabel);
        if (sess.swipeDownLabel) labels.add(sess.swipeDownLabel);
      }
    });
    return Array.from(labels);
  };

  const isQueryValid = () => {
    return queryBlocks.every(
      (b) => b.sessionIds.length > 0 && b.labels.length > 0
    );
  };

  const applyQueryBuilder = () => {
    setIsQueryBuilderActive(true);
    setShowQueryBuilder(false); // Close query builder sheet on apply
  };

  const resetQueryBuilder = () => {
    setIsQueryBuilderActive(false);
    setSearchParams({});
  };

  const handleSaveQuery = () => {
    const name = prompt("Enter a name for this custom query:");
    if (!name || !name.trim()) return;

    const newQuery = {
      id: Date.now().toString(),
      name: name.trim(),
      blocks: queryBlocks,
      relations: queryRelations,
    };

    const updated = [...savedQueries, newQuery];
    setSavedQueries(updated);
    localStorage.setItem("mode_saved_queries", JSON.stringify(updated));
  };

  const handleLoadQuery = (id: string) => {
    const found = savedQueries.find((q) => q.id === id);
    if (found) {
      setQueryBlocks(found.blocks);
      setQueryRelations(found.relations);
    }
  };

  const handleDeleteQuery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading
    const updated = savedQueries.filter((q) => q.id !== id);
    setSavedQueries(updated);
    localStorage.setItem("mode_saved_queries", JSON.stringify(updated));
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSessionOptions = (sessionId: string) => {
    const sess = completedSessions.find((s) => s.id === sessionId);
    if (!sess) return [];

    const options = [
      { value: "left", label: sess.swipeLeftLabel },
      { value: "right", label: sess.swipeRightLabel },
    ];

    if (sess.doubleClickLabel) {
      options.push({ value: "double-click", label: sess.doubleClickLabel });
    }
    if (sess.swipeUpLabel) {
      options.push({ value: "up", label: sess.swipeUpLabel });
    }
    if (sess.swipeDownLabel) {
      options.push({ value: "down", label: sess.swipeDownLabel });
    }

    return options;
  };

  const handleCategorizationChange = async (
    record: JoinedRecord,
    newDirection: string,
  ) => {
    try {
      // 1. Update in IndexedDB
      await db.swipeActions
        .where("[sessionId+cardId]")
        .equals([record.sessionId, record.cardId])
        .modify({ direction: newDirection as any });

      // 2. Find display label for the new direction
      const sess = completedSessions.find((s) => s.id === record.sessionId);
      let newLabel = newDirection;
      if (sess) {
        if (newDirection === "left") newLabel = sess.swipeLeftLabel;
        else if (newDirection === "right") newLabel = sess.swipeRightLabel;
        else if (newDirection === "double-click" && sess.doubleClickLabel)
          newLabel = sess.doubleClickLabel;
        else if (newDirection === "up" && sess.swipeUpLabel)
          newLabel = sess.swipeUpLabel;
        else if (newDirection === "down" && sess.swipeDownLabel)
          newLabel = sess.swipeDownLabel;
      }

      // 3. Update local state
      setJoinedRecords((prev) => {
        const next = prev.map((rec) => {
          if (rec.id === record.id) {
            return {
              ...rec,
              direction: newDirection,
              label: newLabel,
            };
          }
          return rec;
        });

        // Recalculate unique labels in state for the filter checkboxes
        const unique = new Set(next.map((r) => r.label));
        setAvailableLabels(Array.from(unique));

        return next;
      });
    } catch (err) {
      console.error("Failed to update categorization:", err);
      alert("Failed to update categorization in the database.");
    }
  };

  const handleExportJSON = (filteredData: JoinedRecord[]) => {
    if (filteredData.length === 0) return;
    try {
      const exportData = filteredData.map((r) => ({
        snapshot: r.sessionTitle,
        cardId: r.cardId,
        name: r.name,
        categorization: r.label,
        timestamp: new Date(r.timestamp).toISOString(),
        rawDetails: r.details,
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MODE_Filtered_Analysis_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export filtered JSON:", err);
    }
  };

  const filtered = getFilteredRecords();

  // Callback ref for lazy loading table rows via IntersectionObserver
  const sentinelRef = useCallback((node: HTMLTableRowElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node && filtered.length > visibleCount) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 50, filtered.length));
          }
        },
        { root: null, rootMargin: "150px", threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, [filtered.length, visibleCount]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Reset visible count when filters, sorting, or custom query configuration changes
  useEffect(() => {
    setVisibleCount(50);
  }, [
    selectedSessionIds,
    searchText,
    nestedQuery,
    selectedLabels,
    sortField,
    sortOrder,
    isQueryBuilderActive,
    queryBlocks,
    queryRelations,
  ]);

  const visibleColumnsCount =
    Object.values(visibleColumns).filter(Boolean).length;

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
        <h1>Analyse Snapshots</h1>
        <div className="spacer"></div>
        <button
          className="btn-secondary toggle-filters-btn"
          style={{ display: "none" }} // Hide the original header toggle button
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
          aria-label={isFiltersOpen ? "Hide Filters" : "Show Filters"}
        >
          <span className="icon">
            {isFiltersOpen ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            )}
          </span>
          <span className="label-text">Hide Filters</span>
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
          aria-label={showQueryBuilder ? "Close Query Builder" : "Show Query Builder"}
        >
          <span className="icon">
            {showQueryBuilder ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            )}
          </span>
          <span className="label-text">Close Query Builder</span>
          {isQueryBuilderActive && !showQueryBuilder && <span className="active-dot" />}
        </button>
      </div>

      {/* Main Analysis Filters & Table Grid */}
      <div className="analyse-container">
        {/* Right Side: Tabular Spreadsheet Display */}
        <main className="table-area">
          {isQueryBuilderActive && (
            <div className="query-active-banner animate-slide-down">
              <span>Custom Query is currently filtering the spreadsheet.</span>
              <button className="btn-secondary btn-small" onClick={resetQueryBuilder}>Reset Filter</button>
            </div>
          )}

          {loading ? (
            <div className="loader-container">
              <span className="spinner"></span> Joining snapshot datasets...
            </div>
          ) : (!isQueryBuilderActive && selectedSessionIds.length === 0) ? (
            <div className="empty-state">
              <p>
                Select at least one completed snapshot from the sidebar filters
                to begin analysis.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No results match the current filters.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <div className="table-controls">
                <span className="results-count">
                  Showing {filtered.length} entries
                </span>

                <div className="table-actions-group">
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
                      Columns
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
                    Export JSON
                  </button>
                </div>
              </div>

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
                          {/* Main Row */}
                          <tr
                            className={`data-row ${isRowExpanded ? "expanded-row-active" : ""}`}
                          >
                            <td
                              style={{
                                textAlign: "center",
                                width: "40px",
                                padding: "0.5rem",
                              }}
                            >
                              <button
                                className="expand-toggle-btn"
                                onClick={() => toggleRowExpanded(record.id)}
                                aria-label={
                                  isRowExpanded
                                    ? "Collapse details"
                                    : "Expand details"
                                }
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
                              <td>
                                <strong>{record.name}</strong>
                              </td>
                            )}
                            {visibleColumns.label && (
                              <td onClick={(e) => e.stopPropagation()}>
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
                              </td>
                            )}
                            {visibleColumns.timestamp && (
                              <td>{formatDate(record.timestamp)}</td>
                            )}
                          </tr>

                          {/* Expanded Nested JSON Row */}
                          {isRowExpanded && (
                            <tr className="expanded-row">
                              <td colSpan={visibleColumnsCount + 1}>
                                <div className="json-container">
                                  <h4>Raw Nested Card Credentials</h4>
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
                          Loading more entries...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sheet for Filters */}
      <MobileSheet
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Filters"
      >
        <div className="filter-sheet-body">
          <div className="filter-block">
            <h3>Select Completed Snapshots</h3>
            {completedSessions.length === 0 ? (
              <p className="no-data-text">No completed snapshots available.</p>
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
              <h3>Filter By Categorization</h3>
              <div className="checkbox-list">
                {availableLabels.map((lbl) => (
                  <label key={lbl} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedLabels.includes(lbl)}
                      onChange={() => toggleLabelFilter(lbl)}
                    />
                    <span>{lbl}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="filter-block">
            <h3>Flexible Filters</h3>
            <div className="input-group">
              <label htmlFor="search">Search Meta & Nested Content</label>
              <input
                type="text"
                id="search"
                placeholder="Search name, ID, stats, types..."
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
        title="Visual Query Builder"
      >
        <div className="query-builder-sheet-body">
          {savedQueries.length > 0 && (
            <div className="saved-queries-section">
              <label>Load Saved Query</label>
              <div className="saved-queries-list">
                {savedQueries.map((q) => (
                  <div key={q.id} className="saved-query-pill" onClick={() => handleLoadQuery(q.id)}>
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
                      value={queryRelations[index - 1] || 'INTERSECT'}
                      onChange={(e) => handleRelationChange(index - 1, e.target.value as QueryRelation)}
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
                      <button className="remove-block-btn" onClick={() => removeBlock(block.id)}>Remove</button>
                    )}
                  </div>
                  
                  <div className="block-body">
                    <div className="form-group">
                      <label>Select Snapshot(s)</label>
                      <div className="sessions-multiselect">
                        {completedSessions.map(sess => (
                          <label key={sess.id} className="checkbox-item-compact">
                            <input
                              type="checkbox"
                              checked={block.sessionIds.includes(sess.id)}
                              onChange={() => toggleBlockSession(index, sess.id)}
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
                          {getBlockAvailableLabels(block.sessionIds).map(lbl => (
                            <label key={lbl} className="checkbox-item-compact">
                              <input
                                type="checkbox"
                                checked={block.labels.includes(lbl)}
                                onChange={() => toggleBlockLabel(index, lbl)}
                              />
                              <span>{lbl}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="block-summary">
                      <span>Matching cards in this block: <strong>{blockCounts[block.id] || 0}</strong></span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}

            <button className="btn-secondary add-block-btn" onClick={addBlock}>
              + Add Filter Block
            </button>
          </div>

          <div className="builder-actions">
            <button
              className="btn-primary btn-apply-query"
              onClick={applyQueryBuilder}
              disabled={!isQueryValid()}
            >
              Apply Query
            </button>
            <div className="secondary-actions-row">
              <button
                className="btn-secondary"
                onClick={handleSaveQuery}
                disabled={!isQueryValid()}
              >
                Save Query
              </button>
              {isQueryBuilderActive && (
                <button className="btn-secondary" onClick={resetQueryBuilder}>
                  Reset Filter
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
