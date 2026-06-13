import React from "react";
import { motion } from "framer-motion";
import type { CardData } from "../../adapters/types";
import { useSwipeCard } from "./useSwipeCard";
import "./SwipeCard.scss";

interface SwipeCardProps {
  card: CardData;
  index: number; // Position in the stack (0 = top, 1 = middle, 2 = bottom)
  swipeLeftLabel: string;
  swipeRightLabel: string;
  doubleClickLabel?: string;
  swipeUpLabel?: string;
  swipeDownLabel?: string;
  onSwipe: (
    direction: "left" | "right" | "double-click" | "up" | "down",
  ) => void;
  incomingFrom?: "left" | "right" | "up" | "down" | null;
  triggerSwipe?: "left" | "right" | "double-click" | "up" | "down" | null;
  x?: any; // Optional parent-driven motion value
  y?: any; // Optional parent-driven motion value
}

export const SwipeCard: React.FC<SwipeCardProps> = (props) => {
  const { card, index, swipeLeftLabel, swipeRightLabel, swipeUpLabel, swipeDownLabel } = props;
  const {
    imageLoaded,
    setImageLoaded,
    controls,
    activeX,
    activeY,
    rotate,
    leftLabelOpacity,
    rightLabelOpacity,
    upLabelOpacity,
    downLabelOpacity,
    isActive,
    hasVerticalGestures,
    handleDragEnd,
    handleDoubleClick,
    stackVariants,
  } = useSwipeCard(props);

  return (
    <motion.div
      className={`swipe-card ${isActive ? "active" : "inactive"}`}
      style={{
        pointerEvents: isActive ? "auto" : "none",
        zIndex: isActive ? 10 : 3 - index,
        ...(isActive ? { x: activeX, y: activeY, rotate } : {}),
      }}
      animate={
        isActive
          ? controls
          : stackVariants[index as keyof typeof stackVariants] || {
              opacity: 0,
              scale: 0.8,
              y: 30,
            }
      }
      drag={isActive ? (hasVerticalGestures ? true : "x") : false}
      dragConstraints={{ left: -350, right: 350, top: -450, bottom: 450 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      onDoubleClick={handleDoubleClick}
      aria-grabbed={isActive}
    >
      {/* Swipe Overlay Indicators */}
      {isActive && (
        <>
          <motion.div
            className="swipe-indicator left-indicator"
            style={{ opacity: leftLabelOpacity }}
          >
            {swipeLeftLabel}
          </motion.div>
          <motion.div
            className="swipe-indicator right-indicator"
            style={{ opacity: rightLabelOpacity }}
          >
            {swipeRightLabel}
          </motion.div>
          {swipeUpLabel && (
            <motion.div
              className="swipe-indicator up-indicator"
              style={{ opacity: upLabelOpacity }}
            >
              {swipeUpLabel}
            </motion.div>
          )}
          {swipeDownLabel && (
            <motion.div
              className="swipe-indicator down-indicator"
              style={{ opacity: downLabelOpacity }}
            >
              {swipeDownLabel}
            </motion.div>
          )}
        </>
      )}

      {/* Card Content */}
      <div className="card-inner">
        <div className="sprite-container">
          {!imageLoaded && <div className="sprite-skeleton"></div>}
          <img
            src={card.imageUrl}
            alt={card.primaryText}
            onLoad={() => setImageLoaded(true)}
            style={{ display: imageLoaded ? "block" : "none" }}
            draggable="false"
          />
        </div>

        <div className="card-info">
          <h2>{card.primaryText}</h2>
          <p>{card.secondaryText}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
