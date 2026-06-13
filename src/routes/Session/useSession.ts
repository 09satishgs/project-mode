import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMotionValue, useTransform } from "framer-motion";
import { db } from "../../db/db";
import type { SessionMetadata } from "../../db/types";
import { PokemonAdapter } from "../../adapters/pokemonAdapter";
import type { CardData } from "../../adapters/types";
import { HEADINGS } from "../../constants/headings";
import { downloadJsonFile, getSwipeLabel } from "../../utils/helpers";

export const useSession = () => {
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

  const loadSessionData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      // 1. Fetch Session Metadata
      const sessionData = await db.sessions.get(id);
      if (!sessionData) {
        setError(HEADINGS.sessionNotFound);
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
      setError(err?.message || HEADINGS.errLoadPokedexFailed);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSessionData();
  }, [id, loadSessionData]);

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
    if (!id || !window.confirm(HEADINGS.confirmRestartSession)) {
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
          // Map swiping direction terminology to labels using our generic helper
          const label = getSwipeLabel(act.direction, session);

          return {
            cardId: act.cardId,
            direction: act.direction,
            label,
            timestamp: act.timestamp,
            cardDetails:
              cardDetailsList.find((c) => c.cardId === act.cardId)?.details ||
              null,
          };
        }),
      };

      const fileName = `${session.title.replace(/\s+/g, "_")}_snapshot.json`;
      downloadJsonFile(exportData, fileName);
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
    if (
      remainingCards.length > 0 &&
      !triggerSwipe &&
      session?.doubleClickLabel
    ) {
      setTriggerSwipe("double-click");
    }
  };

  const handleAutoSwipeRemaining = async (direction: "left" | "right") => {
    if (remainingCards.length === 0 || !id || !session) return;

    const label =
      direction === "left" ? session.swipeLeftLabel : session.swipeRightLabel;
    const confirmMessage = `${HEADINGS.confirmAutoSwipePrefix}${remainingCards.length}${HEADINGS.confirmAutoSwipeMid}${label}${HEADINGS.confirmAutoSwipeSuffix}`;
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
        },
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
      alert(HEADINGS.errAutoSwipeFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  const handleAnalyseRedirect = () => {
    navigate("/analyse");
  };

  const isCompleted = remainingCards.length === 0;
  const visibleCards = remainingCards.slice(0, 3);

  return {
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
  };
};
