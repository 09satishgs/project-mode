import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../../db/db";
import type { SessionMetadata } from "../../db/types";
import {
  getNestedValue,
  deepSearch,
  downloadJsonFile,
} from "../../utils/helpers";
import { HEADINGS } from "../../constants/headings";

export type QueryRelation = "INTERSECT" | "UNION" | "DIFFERENCE";

export interface JoinedRecord {
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

export const useAnalyse = () => {
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
  const [viewMode, setViewMode] = useState<"table" | "list">("table");

  const [loading, setLoading] = useState(true);

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Visual Query Builder State
  const [searchParams, setSearchParams] = useSearchParams();
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [isQueryBuilderActive, setIsQueryBuilderActive] = useState(false);
  const [queryBlocks, setQueryBlocks] = useState<
    Array<{ id: string; sessionIds: string[]; labels: string[] }>
  >([{ id: "block-1", sessionIds: [], labels: [] }]);
  const [queryRelations, setQueryRelations] = useState<QueryRelation[]>([]);
  const [blockCounts, setBlockCounts] = useState<Record<string, number>>({});
  const [queryBuilderRecords, setQueryBuilderRecords] = useState<
    JoinedRecord[]
  >([]);
  const [savedQueries, setSavedQueries] = useState<
    Array<{ id: string; name: string; blocks: any[]; relations: any[] }>
  >([]);

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
    const sourceRecords = isQueryBuilderActive
      ? queryBuilderRecords
      : joinedRecords;
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
    relation: QueryRelation,
  ): JoinedRecord[] => {
    const set2Ids = new Set(records2.map((r) => r.cardId));

    if (relation === "INTERSECT") {
      return records1.filter((r) => set2Ids.has(r.cardId));
    } else if (relation === "DIFFERENCE") {
      return records1.filter((r) => !set2Ids.has(r.cardId));
    } else if (relation === "UNION") {
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
  const calculateQueryBuilder = useCallback(async () => {
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
          .where("sessionId")
          .anyOf(block.sessionIds)
          .toArray();

        const cardDetailsList = await db.cardDetails
          .where("sessionId")
          .anyOf(block.sessionIds)
          .toArray();
        const cardDetailsMap = new Map(
          cardDetailsList.map((c) => [`${c.sessionId}_${c.cardId}`, c.details]),
        );

        const blockRecords: JoinedRecord[] = [];

        actions.forEach((act) => {
          const sess = sessionMap.get(act.sessionId);
          if (!sess) return;

          let label: string = act.direction;
          if (act.direction === "left") label = sess.swipeLeftLabel;
          else if (act.direction === "right") label = sess.swipeRightLabel;
          else if (act.direction === "double-click" && sess.doubleClickLabel)
            label = sess.doubleClickLabel;
          else if (act.direction === "up" && sess.swipeUpLabel)
            label = sess.swipeUpLabel;
          else if (act.direction === "down" && sess.swipeDownLabel)
            label = sess.swipeDownLabel;

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
        const relation = queryRelations[i - 1] || "INTERSECT";
        const nextBlockRecords = blockRecordsMap[queryBlocks[i].id] || [];
        combined = combineSets(combined, nextBlockRecords, relation);
      }

      setQueryBuilderRecords(combined);
    } catch (err) {
      console.error("Failed to calculate query builder matches:", err);
    }
  }, [completedSessions, queryBlocks, queryRelations]);

  // Re-calculate block counts whenever builder state or completed sessions change
  useEffect(() => {
    if (completedSessions.length > 0) {
      calculateQueryBuilder();
    }
  }, [calculateQueryBuilder, completedSessions]);

  // Hydrate query builder from URL parameter
  useEffect(() => {
    const queryB64 = searchParams.get("query");
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
        console.error("Failed to parse query from URL:", err);
      }
    }
  }, [searchParams]);

  // Query builder handlers
  const addBlock = () => {
    const newId = `block-${Date.now()}`;
    setQueryBlocks([...queryBlocks, { id: newId, sessionIds: [], labels: [] }]);
    setQueryRelations([...queryRelations, "INTERSECT"]);
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
      (b) => b.sessionIds.length > 0 && b.labels.length > 0,
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
    const name = prompt(HEADINGS.analysePromptQueryName);
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
      alert(HEADINGS.analyseAlertUpdateCategorizationFailed);
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

      downloadJsonFile(exportData, `MODE_Filtered_Analysis_${Date.now()}.json`);
    } catch (err) {
      console.error("Failed to export filtered JSON:", err);
    }
  };

  const filtered = getFilteredRecords();

  // Callback ref for lazy loading table rows/list cards via IntersectionObserver
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
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
          { root: null, rootMargin: "150px", threshold: 0.1 },
        );
        observerRef.current.observe(node);
      }
    },
    [filtered.length, visibleCount],
  );

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

  // Copy shareable visual query builder URL parameter link
  const copyShareableLink = async () => {
    if (!isQueryValid()) return;
    try {
      const payload = {
        blocks: queryBlocks,
        relations: queryRelations,
      };
      const serialized = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${window.location.origin}${window.location.pathname}?query=${serialized}`;
      await navigator.clipboard.writeText(url);
      alert(HEADINGS.analyseToastCopied);
    } catch (err) {
      console.error("Failed to copy share link:", err);
      alert(`${HEADINGS.analyseToastCopyFailed}${err}`);
    }
  };

  const visibleColumnsCount =
    Object.values(visibleColumns).filter(Boolean).length;

  // Copy unique, comma-separated card IDs currently matching filters in the table
  const copyIDs = async () => {
    if (filtered.length === 0) return;
    try {
      const uniqueIds = Array.from(new Set(filtered.map((r) => r.cardId)))
        .sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        })
        .join(",");
      await navigator.clipboard.writeText(uniqueIds);
      alert(HEADINGS.analyseToastIDsCopied);
    } catch (err) {
      console.error("Failed to copy IDs:", err);
      alert("Failed to copy IDs.");
    }
  };

  return {
    completedSessions,
    selectedSessionIds,
    joinedRecords,
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
  };
};
