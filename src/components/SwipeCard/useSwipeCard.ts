import { useState, useEffect } from "react";
import { useMotionValue, useTransform, useAnimation } from "framer-motion";
import type { PanInfo } from "framer-motion";


interface UseSwipeCardProps {
  index: number;
  doubleClickLabel?: string;
  swipeUpLabel?: string;
  swipeDownLabel?: string;
  onSwipe: (
    direction: "left" | "right" | "double-click" | "up" | "down",
  ) => void;
  incomingFrom?: "left" | "right" | "up" | "down" | null;
  triggerSwipe?: "left" | "right" | "double-click" | "up" | "down" | null;
  x?: any;
  y?: any;
}

export const useSwipeCard = ({
  index,
  doubleClickLabel,
  swipeUpLabel,
  swipeDownLabel,
  onSwipe,
  incomingFrom,
  triggerSwipe,
  x,
  y,
}: UseSwipeCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const controls = useAnimation();

  // Local fallback motion values if parent ones aren't provided
  const localX = useMotionValue(0);
  const localY = useMotionValue(0);

  const activeX = x || localX;
  const activeY = y || localY;

  // Map horizontal offset to rotation angle (-15deg at -150px, +15deg at +150px)
  const rotate = useTransform(activeX, [-150, 0, 150], [-15, 0, 15]);

  // Left Label fades in when dragging left (negative x) - Green Accent
  const leftLabelOpacity = useTransform(
    activeX,
    [-100, -20, 0, 100],
    [1, 0, 0, 0],
  );
  // Right Label fades in when dragging right (positive x) - Red Accent
  const rightLabelOpacity = useTransform(
    activeX,
    [-100, 0, 20, 100],
    [0, 0, 0, 1],
  );

  // Optional vertical stamp opacities
  const upLabelOpacity = useTransform(
    activeY,
    [-100, -20, 0, 100],
    [1, 0, 0, 0],
  );
  const downLabelOpacity = useTransform(
    activeY,
    [-100, 0, 20, 100],
    [0, 0, 0, 1],
  );

  const isActive = index === 0;
  const hasVerticalGestures = !!swipeUpLabel || !!swipeDownLabel;

  useEffect(() => {
    if (isActive) {
      if (incomingFrom) {
        // Card restored via Undo: animate entry from off-screen
        const startX =
          incomingFrom === "left" ? -350 : incomingFrom === "right" ? 350 : 0;
        const startY =
          incomingFrom === "up" ? -450 : incomingFrom === "down" ? 450 : 0;
        activeX.set(startX);
        activeY.set(startY);

        controls.start({
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          rotate: 0,
          transition: { type: "spring", stiffness: 220, damping: 24 },
        });
      } else {
        // Normal card activation
        activeX.set(0);
        activeY.set(0);
        controls.set({ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 });
      }
    }
  }, [isActive, incomingFrom, controls, activeX, activeY]);

  // Button triggers animation side-effects
  useEffect(() => {
    if (isActive && triggerSwipe) {
      const runTriggeredSwipe = async () => {
        if (triggerSwipe === "left") {
          await controls.start({
            x: -450,
            opacity: 0,
            rotate: -30,
            transition: { duration: 0.25, ease: "easeOut" },
          });
        } else if (triggerSwipe === "right") {
          await controls.start({
            x: 450,
            opacity: 0,
            rotate: 30,
            transition: { duration: 0.25, ease: "easeOut" },
          });
        } else if (triggerSwipe === "up") {
          await controls.start({
            y: -550,
            opacity: 0,
            transition: { duration: 0.25, ease: "easeOut" },
          });
        } else if (triggerSwipe === "down") {
          await controls.start({
            y: 550,
            opacity: 0,
            transition: { duration: 0.25, ease: "easeOut" },
          });
        } else if (triggerSwipe === "double-click") {
          await controls.start({
            scale: [1, 1.15, 1],
            transition: { duration: 0.3 },
          });
        }
        onSwipe(triggerSwipe);
      };
      runTriggeredSwipe();
    }
  }, [triggerSwipe, isActive, controls, onSwipe]);

  const handleDragEnd = async (_event: any, info: PanInfo) => {
    if (!isActive) return;

    const threshold = 120; // Swipe threshold in pixels
    const velocityThreshold = 400; // Swipe velocity threshold in px/s

    const currentX = activeX.get();
    const currentY = activeY.get();
    const velocityX = info.velocity.x;
    const velocityY = info.velocity.y;

    const absX = Math.abs(currentX);
    const absY = Math.abs(currentY);

    const springBack = () => {
      controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      });
    };

    if (absX > absY) {
      // Horizontal swipe is dominant
      if (currentX < -threshold || velocityX < -velocityThreshold) {
        // Swiped Left (Green)
        await controls.start({
          x: -450,
          opacity: 0,
          rotate: -30,
          transition: { duration: 0.25, ease: "easeOut" },
        });
        onSwipe("left");
      } else if (currentX > threshold || velocityX > velocityThreshold) {
        // Swiped Right (Red)
        await controls.start({
          x: 450,
          opacity: 0,
          rotate: 30,
          transition: { duration: 0.25, ease: "easeOut" },
        });
        onSwipe("right");
      } else {
        springBack();
      }
    } else if (hasVerticalGestures) {
      // Vertical swipe is dominant
      if (currentY < -threshold || velocityY < -velocityThreshold) {
        // Swipe Up
        if (swipeUpLabel) {
          await controls.start({
            y: -550,
            opacity: 0,
            transition: { duration: 0.25, ease: "easeOut" },
          });
          onSwipe("up");
          return;
        }
      } else if (currentY > threshold || velocityY > velocityThreshold) {
        // Swipe Down
        if (swipeDownLabel) {
          await controls.start({
            y: 550,
            opacity: 0,
            transition: { duration: 0.25, ease: "easeOut" },
          });
          onSwipe("down");
          return;
        }
      }
      springBack();
    } else {
      springBack();
    }
  };

  const handleDoubleClick = async () => {
    if (!isActive || !doubleClickLabel) return;
    // Animate heartbeat scaling
    await controls.start({
      scale: [1, 1.15, 1],
      transition: { duration: 0.3, ease: "easeInOut" },
    });
    onSwipe("double-click");
  };

  // Stack styling configuration based on stack index
  const stackVariants = {
    0: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    },
    1: {
      x: 0,
      y: 12,
      scale: 0.94,
      opacity: 0.95,
      boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    },
    2: {
      x: 0,
      y: 24,
      scale: 0.88,
      opacity: 0.4,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    },
  };

  return {
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
  };
};
