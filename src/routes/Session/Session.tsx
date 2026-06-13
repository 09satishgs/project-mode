import React from "react";
import { motion } from "framer-motion";
import ProgressBar from "../../components/ProgressBar/ProgressBar";
import SwipeCard from "../../components/SwipeCard/SwipeCard";
import { useSession } from "./useSession";
import { HEADINGS } from "../../constants/headings";
import "./Session.scss";

export const Session: React.FC = () => {
  const {
    session,
    loading,
    error,
    swipedCount,
    canUndo,
    isCompleted,
    visibleCards,
    leftSwipedCards,
    rightSwipedCards,
    lastSwipedDirection,
    triggerSwipe,
    x,
    y,
    leftGlowOpacity,
    rightGlowOpacity,
    topGlowOpacity,
    bottomGlowOpacity,
    handleSwipe,
    handleUndo,
    handleRestart,
    handleExportJSON,
    triggerLeftButton,
    triggerRightButton,
    triggerUpButton,
    triggerDownButton,
    triggerDoubleClickButton,
    handleAutoSwipeRemaining,
    handleBackToDashboard,
    handleAnalyseRedirect,
  } = useSession();

  if (loading) {
    return (
      <div className="session-view loading-view">
        <span className="spinner large"></span>
        <p>{HEADINGS.loadingPokedex}</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-view error-view">
        <div className="error-card">
          <h2>{HEADINGS.accessErrorTitle}</h2>
          <p>{error || HEADINGS.defaultSessionError}</p>
          <button className="btn-primary" onClick={handleBackToDashboard}>
            {HEADINGS.btnBackToDashboard}
          </button>
        </div>
      </div>
    );
  }

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
                {HEADINGS.autoSwipePrefix} {session.swipeLeftLabel}
              </button>
              <button
                className="auto-btn auto-right"
                onClick={() => handleAutoSwipeRemaining("right")}
              >
                {HEADINGS.autoSwipePrefix} {session.swipeRightLabel}
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
            <div
              className={`deck-controls count-${2 + (session.swipeUpLabel ? 1 : 0) + (session.doubleClickLabel ? 1 : 0) + (session.swipeDownLabel ? 1 : 0)}`}
            >
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
              <div className="stamp-badge">{HEADINGS.completedStamp}</div>
              <h2>{HEADINGS.completedTitle}</h2>
              <p>
                {HEADINGS.completedSubtitle.replace(
                  "{total}",
                  session.totalCards.toString(),
                )}
              </p>
            </div>

            <div className="results-tabs">
              <div className="results-column">
                <h3 className="column-header left-title">
                  {session.swipeLeftLabel} ({leftSwipedCards.length})
                </h3>
                <div className="pokemon-list-scroll">
                  {leftSwipedCards.length === 0 ? (
                    <span className="empty-column">
                      {HEADINGS.resultEmptyColumn}
                    </span>
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
                    <span className="empty-column">
                      {HEADINGS.resultEmptyColumn}
                    </span>
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
                {HEADINGS.btnRestartSnapshot}
              </button>
              <button
                className="btn-secondary export-btn"
                onClick={handleExportJSON}
              >
                {HEADINGS.btnExportJson}
              </button>
              <button
                className="btn-primary analyse-btn"
                onClick={handleAnalyseRedirect}
              >
                {HEADINGS.btnAnalyseSnapshots}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Session;
