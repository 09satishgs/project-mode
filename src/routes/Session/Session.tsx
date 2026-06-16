import React from "react";
import { Icon } from "../../components/Icon/Icon";
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
                <Icon name="arrow-left" size={20} />
                <span>{session.swipeLeftLabel}</span>
              </button>

              {session.swipeUpLabel && (
                <button
                  className="control-btn up-action"
                  onClick={triggerUpButton}
                  aria-label={session.swipeUpLabel}
                >
                  <Icon name="arrow-up" size={20} />
                  <span>{session.swipeUpLabel}</span>
                </button>
              )}

              {session.doubleClickLabel && (
                <button
                  className="control-btn double-click-action"
                  onClick={triggerDoubleClickButton}
                  aria-label={session.doubleClickLabel}
                >
                  <Icon name="heart" size={20} />
                  <span>{session.doubleClickLabel}</span>
                </button>
              )}

              {session.swipeDownLabel && (
                <button
                  className="control-btn down-action"
                  onClick={triggerDownButton}
                  aria-label={session.swipeDownLabel}
                >
                  <Icon name="arrow-down" size={20} />
                  <span>{session.swipeDownLabel}</span>
                </button>
              )}

              <button
                className="control-btn right-action"
                onClick={triggerRightButton}
                aria-label={session.swipeRightLabel}
              >
                <span>{session.swipeRightLabel}</span>
                <Icon name="arrow-right" size={20} />
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
