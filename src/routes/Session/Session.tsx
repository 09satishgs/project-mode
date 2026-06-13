import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { db } from "../../db/db";
import type { SessionMetadata } from "../../db/types";
import { PokemonAdapter } from "../../adapters/pokemonAdapter";
import type { CardData } from "../../adapters/types";
import ProgressBar from "../../components/ProgressBar/ProgressBar";
import SwipeCard from "../../components/SwipeCard/SwipeCard";
import "./Session.scss";

export const Session: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionMetadata | null>(null);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [remainingCards, setRemainingCards] = useState<CardData[]>([]);
  const [swipedCount, setSwipedCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [lastSwipedDirection, setLastSwipedDirection] = useState<
    "left" | "right" | "double-click" | "up" | "down" | null
  >(null);
  const [triggerSwipe, setTriggerSwipe] = useState<
    "left" | "right" | "double-click" | "up" | "down" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Results state for completed view
  const [leftSwipedCards, setLeftSwipedCards] = useState<CardData[]>([]);
  const [rightSwipedCards, setRightSwipedCards] = useState<CardData[]>([]);

  // Parent-level motion values for coordinating active card position with edge glows
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Map motion coordinates to edge glow opacity
  // Left Edge (Green Accent): Glows when card drags left (negative x)
  const leftGlowOpacity = useTransform(x, [-150, -30, 0], [0.35, 0, 0]);
  // Right Edge (Red Accent): Glows when card drags right (positive x)
  const rightGlowOpacity = useTransform(x, [0, 30, 150], [0, 0, 0.35]);
  // Top Edge (White Accent): Glows when card drags up (negative y)
  const topGlowOpacity = useTransform(y, [-150, -30, 0], [0.35, 0, 0]);
  // Bottom Edge (White Accent): Glows when card drags down (positive y)
  const bottomGlowOpacity = useTransform(y, [0, 30, 150], [0, 0, 0.35]);

  const loadSessionData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      // 1. Fetch Session Metadata
      const sessionData = await db.sessions.get(id);
      if (!sessionData) {
        setError("Session not found.");
        setLoading(false);
        return;
      }
      setSession(sessionData);

      // 2. Load Cards from PokeAPI Adapter (leverage cache)
      const adapter = new PokemonAdapter();
      const cards = await adapter.fetchCards(sessionData.dexType);
      setAllCards(cards);

      // 3. Load Swipe Actions from Dexie
      const actions = await db.swipeActions
        .where("sessionId")
        .equals(id)
        .toArray();
      const swipedIds = new Set(actions.map((a) => a.cardId));

      // 4. Calculate remaining stack
      const remaining = cards.filter((c) => !swipedIds.has(c.id));
      setRemainingCards(remaining);
      setSwipedCount(cards.length - remaining.length);
      setCanUndo(actions.length > 0 && remaining.length > 0);

      // 5. Populate results lists if completed
      if (remaining.length === 0) {
        const leftIds = new Set(
          actions.filter((a) => a.direction === "left").map((a) => a.cardId),
        );
        const rightIds = new Set(
          actions.filter((a) => a.direction === "right").map((a) => a.cardId),
        );
        setLeftSwipedCards(cards.filter((c) => leftIds.has(c.id)));
        setRightSwipedCards(cards.filter((c) => rightIds.has(c.id)));
      }
    } catch (err: any) {
      console.error("Failed to load session:", err);
      setError(
        err?.message ||
          "Failed to load Pokedex. Please check internet connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const handleSwipe = async (
    direction: "left" | "right" | "double-click" | "up" | "down",
  ) => {
    if (remainingCards.length === 0 || !id || !session) return;

    const topCard = remainingCards[0];

    // Clear any temporary triggers
    setLastSwipedDirection(null);
    setTriggerSwipe(null);

    try {
      // Record swipe action AND complete card details JSON in a Dexie transaction
      await db.transaction(
        "rw",
        [db.swipeActions, db.cardDetails, db.sessions],
        async () => {
          await db.swipeActions.add({
            sessionId: id,
            cardId: topCard.id,
            direction,
            timestamp: Date.now(),
          });

          await db.cardDetails.put({
            id: `${id}_${topCard.id}`,
            sessionId: id,
            cardId: topCard.id,
            details: topCard, // Save full JSON of Pokémon
          });
        },
      );

      const nextRemaining = remainingCards.slice(1);
      const newSwipedCount = allCards.length - nextRemaining.length;

      // Update session status if complete
      if (nextRemaining.length === 0) {
        await db.sessions.update(id, { status: "completed" });

        // Load completed lists
        const actions = await db.swipeActions
          .where("sessionId")
          .equals(id)
          .toArray();
        const leftIds = new Set(
          actions.filter((a) => a.direction === "left").map((a) => a.cardId),
        );
        const rightIds = new Set(
          actions.filter((a) => a.direction === "right").map((a) => a.cardId),
        );
        setLeftSwipedCards(allCards.filter((c) => leftIds.has(c.id)));
        setRightSwipedCards(allCards.filter((c) => rightIds.has(c.id)));
      }

      setRemainingCards(nextRemaining);
      setSwipedCount(newSwipedCount);
      setCanUndo(nextRemaining.length > 0);
    } catch (err) {
      console.error("Failed to save swipe action transaction:", err);
    }
  };

  const handleUndo = async () => {
    if (!id || swipedCount === 0 || remainingCards.length === 0) return;

    try {
      // Get the last action
      const actions = await db.swipeActions
        .where("sessionId")
        .equals(id)
        .reverse()
        .sortBy("timestamp");

      const lastAction = actions[0];
      if (!lastAction) return;

      // Delete last action and details from DB inside a transaction
      await db.transaction(
        "rw",
        [db.sessions, db.swipeActions, db.cardDetails],
        async () => {
          await db.swipeActions.delete(lastAction.id!);
          await db.cardDetails.delete(`${id}_${lastAction.cardId}`);

          // Reset session status to in-progress if it was complete
          if (remainingCards.length === 0) {
            await db.sessions.update(id, { status: "in-progress" });
          }
        },
      );

      // Find card details
      const restoredCard = allCards.find((c) => c.id === lastAction.cardId);
      if (!restoredCard) return;

      setLastSwipedDirection(lastAction.direction);
      setRemainingCards((prev) => [restoredCard, ...prev]);
      setSwipedCount((prev) => prev - 1);
      setCanUndo(actions.length > 1);
      setTriggerSwipe(null);
    } catch (err) {
      console.error("Failed to undo last action transaction:", err);
    }
  };

  const handleRestart = async () => {
    if (
      !id ||
      !window.confirm(
        "Wipe all swipe data and saved card JSON for this session and start over?",
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await db.transaction(
        "rw",
        [db.sessions, db.swipeActions, db.cardDetails],
        async () => {
          await db.swipeActions.where("sessionId").equals(id).delete();
          await db.cardDetails.where("sessionId").equals(id).delete();
          await db.sessions.update(id, { status: "in-progress" });
        },
      );
      await loadSessionData();
    } catch (err) {
      console.error("Failed to restart session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    if (!session || !id) return;
    try {
      const actions = await db.swipeActions
        .where("sessionId")
        .equals(id)
        .toArray();
      const cardDetailsList = await db.cardDetails
        .where("sessionId")
        .equals(id)
        .toArray();

      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          dexType: session.dexType,
          totalCards: session.totalCards,
          createdAt: session.createdAt,
          swipeLeftLabel: session.swipeLeftLabel,
          swipeRightLabel: session.swipeRightLabel,
          doubleClickLabel: session.doubleClickLabel,
          swipeUpLabel: session.swipeUpLabel,
          swipeDownLabel: session.swipeDownLabel,
        },
        actions: actions.map((act) => {
          const cardInfo = cardDetailsList.find((c) => c.cardId === act.cardId);

          // Map swiping direction terminology to labels
          let label: string = act.direction;
          if (act.direction === "left") label = session.swipeLeftLabel;
          else if (act.direction === "right") label = session.swipeRightLabel;
          else if (act.direction === "double-click" && session.doubleClickLabel)
            label = session.doubleClickLabel;
          else if (act.direction === "up" && session.swipeUpLabel)
            label = session.swipeUpLabel;
          else if (act.direction === "down" && session.swipeDownLabel)
            label = session.swipeDownLabel;

          return {
            cardId: act.cardId,
            direction: act.direction,
            label,
            timestamp: act.timestamp,
            cardDetails: cardInfo ? cardInfo.details : null,
          };
        }),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session.title.replace(/\s+/g, "_")}_snapshot.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON:", err);
    }
  };

  const triggerLeftButton = () => {
    if (remainingCards.length > 0 && !triggerSwipe) {
      setTriggerSwipe("left");
    }
  };

  const triggerRightButton = () => {
    if (remainingCards.length > 0 && !triggerSwipe) {
      setTriggerSwipe("right");
    }
  };

  const triggerUpButton = () => {
    if (remainingCards.length > 0 && !triggerSwipe && session?.swipeUpLabel) {
      setTriggerSwipe("up");
    }
  };

  const triggerDownButton = () => {
    if (remainingCards.length > 0 && !triggerSwipe && session?.swipeDownLabel) {
      setTriggerSwipe("down");
    }
  };

  const triggerDoubleClickButton = () => {
    if (remainingCards.length > 0 && !triggerSwipe && session?.doubleClickLabel) {
      setTriggerSwipe("double-click");
    }
  };

  const handleAutoSwipeRemaining = async (direction: "left" | "right") => {
    if (remainingCards.length === 0 || !id || !session) return;

    const label = direction === "left" ? session.swipeLeftLabel : session.swipeRightLabel;
    const confirmMessage = `Are you sure you want to categorize all remaining ${remainingCards.length} Pokémon as "${label}"?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);

      await db.transaction(
        "rw",
        [db.swipeActions, db.cardDetails, db.sessions],
        async () => {
          for (const card of remainingCards) {
            await db.swipeActions.add({
              sessionId: id,
              cardId: card.id,
              direction,
              timestamp: Date.now(),
            });

            await db.cardDetails.put({
              id: `${id}_${card.id}`,
              sessionId: id,
              cardId: card.id,
              details: card,
            });
          }

          await db.sessions.update(id, { status: "completed" });
        }
      );

      const actions = await db.swipeActions
        .where("sessionId")
        .equals(id)
        .toArray();
      const leftIds = new Set(
        actions.filter((a) => a.direction === "left").map((a) => a.cardId),
      );
      const rightIds = new Set(
        actions.filter((a) => a.direction === "right").map((a) => a.cardId),
      );

      setLeftSwipedCards(allCards.filter((c) => leftIds.has(c.id)));
      setRightSwipedCards(allCards.filter((c) => rightIds.has(c.id)));
      setRemainingCards([]);
      setSwipedCount(allCards.length);
      setCanUndo(false);
    } catch (err) {
      console.error("Failed to auto swipe remaining:", err);
      alert("Failed to auto-categorize remaining Pokémon.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="session-view loading-view">
        <span className="spinner large"></span>
        <p>Syncing Pokedex entries...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-view error-view">
        <div className="error-card">
          <h2>Access Error</h2>
          <p>{error || "An error occurred loading the snapshot."}</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = remainingCards.length === 0;

  // Render top 3 cards in stack
  const visibleCards = remainingCards.slice(0, 3);

  return (
    <div className="session-view fade-in">
      <ProgressBar
        title={session.title}
        swipedCount={swipedCount}
        totalCards={session.totalCards}
        onUndo={handleUndo}
        canUndo={canUndo}
      />

      {/* Screen-Wide Edge Glow Overlays driven by Active Card Position */}
      {!isCompleted && (
        <>
          <motion.div
            className="edge-glow edge-glow-left"
            style={{ opacity: leftGlowOpacity }}
          />
          <motion.div
            className="edge-glow edge-glow-right"
            style={{ opacity: rightGlowOpacity }}
          />
          <motion.div
            className="edge-glow edge-glow-top"
            style={{ opacity: topGlowOpacity }}
          />
          <motion.div
            className="edge-glow edge-glow-bottom"
            style={{ opacity: bottomGlowOpacity }}
          />
        </>
      )}

      <div className="session-content">
        {!isCompleted ? (
          <>
            {/* Auto Actions Panel */}
            <div className="auto-actions">
              <button
                className="auto-btn auto-left"
                onClick={() => handleAutoSwipeRemaining("left")}
              >
                Auto {session.swipeLeftLabel}
              </button>
              <button
                className="auto-btn auto-right"
                onClick={() => handleAutoSwipeRemaining("right")}
              >
                Auto {session.swipeRightLabel}
              </button>
            </div>

            {/* Card Deck Area */}
            <div className="card-deck-wrapper">
              <div className="card-deck">
                {visibleCards.map((card, idx) => (
                  <SwipeCard
                    key={card.id}
                    card={card}
                    index={idx}
                    swipeLeftLabel={session.swipeLeftLabel}
                    swipeRightLabel={session.swipeRightLabel}
                    doubleClickLabel={session.doubleClickLabel}
                    swipeUpLabel={session.swipeUpLabel}
                    swipeDownLabel={session.swipeDownLabel}
                    onSwipe={handleSwipe}
                    incomingFrom={
                      idx === 0 && lastSwipedDirection !== "double-click"
                        ? lastSwipedDirection
                        : null
                    }
                    triggerSwipe={idx === 0 ? triggerSwipe : null}
                    x={idx === 0 ? x : undefined}
                    y={idx === 0 ? y : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className={`deck-controls count-${2 + (session.swipeUpLabel ? 1 : 0) + (session.doubleClickLabel ? 1 : 0) + (session.swipeDownLabel ? 1 : 0)}`}>
              <button
                className="control-btn left-action"
                onClick={triggerLeftButton}
                aria-label={session.swipeLeftLabel}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 12H5" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>{session.swipeLeftLabel}</span>
              </button>

              {session.swipeUpLabel && (
                <button
                  className="control-btn up-action"
                  onClick={triggerUpButton}
                  aria-label={session.swipeUpLabel}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span>{session.swipeUpLabel}</span>
                </button>
              )}

              {session.doubleClickLabel && (
                <button
                  className="control-btn double-click-action"
                  onClick={triggerDoubleClickButton}
                  aria-label={session.doubleClickLabel}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span>{session.doubleClickLabel}</span>
                </button>
              )}

              {session.swipeDownLabel && (
                <button
                  className="control-btn down-action"
                  onClick={triggerDownButton}
                  aria-label={session.swipeDownLabel}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                  <span>{session.swipeDownLabel}</span>
                </button>
              )}

              <button
                className="control-btn right-action"
                onClick={triggerRightButton}
                aria-label={session.swipeRightLabel}
              >
                <span>{session.swipeRightLabel}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          /* Session Completed Review Tab */
          <div className="session-completed-results fade-in">
            <div className="completed-summary-header">
              <div className="stamp-badge">100% DONE</div>
              <h2>Snapshot Completed!</h2>
              <p>All {session.totalCards} entries have been categorized.</p>
            </div>

            <div className="results-tabs">
              <div className="results-column">
                <h3 className="column-header left-title">
                  {session.swipeLeftLabel} ({leftSwipedCards.length})
                </h3>
                <div className="pokemon-list-scroll">
                  {leftSwipedCards.length === 0 ? (
                    <span className="empty-column">None</span>
                  ) : (
                    leftSwipedCards.map((card) => (
                      <div key={card.id} className="pokemon-list-item">
                        <img
                          src={card.imageUrl}
                          alt=""
                          className="mini-thumb"
                        />
                        <div className="item-meta">
                          <span className="name">{card.primaryText}</span>
                          <span className="number">
                            #{card.id.padStart(3, "0")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="results-column">
                <h3 className="column-header right-title">
                  {session.swipeRightLabel} ({rightSwipedCards.length})
                </h3>
                <div className="pokemon-list-scroll">
                  {rightSwipedCards.length === 0 ? (
                    <span className="empty-column">None</span>
                  ) : (
                    rightSwipedCards.map((card) => (
                      <div key={card.id} className="pokemon-list-item">
                        <img
                          src={card.imageUrl}
                          alt=""
                          className="mini-thumb"
                        />
                        <div className="item-meta">
                          <span className="name">{card.primaryText}</span>
                          <span className="number">
                            #{card.id.padStart(3, "0")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="completed-actions">
              <button
                className="btn-secondary restart-btn"
                onClick={handleRestart}
              >
                Restart Snapshot
              </button>
              <button
                className="btn-secondary export-btn"
                onClick={handleExportJSON}
              >
                Export JSON
              </button>
              <button
                className="btn-primary analyse-btn"
                onClick={() => navigate("/analyse")}
              >
                Analyse Snapshots
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Session;
