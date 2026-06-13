import React, { useState } from "react";
import { db } from "../../db/db";
import { PokemonAdapter } from "../../adapters/pokemonAdapter";
import { HEADINGS } from "../../constants/headings";
import { generateUUID } from "../../utils/helpers";

interface UseNewSessionModalProps {
  onSessionCreated: (sessionId: string) => void;
}

export const useNewSessionModal = ({
  onSessionCreated,
}: UseNewSessionModalProps) => {
  const [title, setTitle] = useState("");
  const [dexType, setDexType] = useState("national");
  const [swipeLeftLabel, setSwipeLeftLabel] = useState("Caught");
  const [swipeRightLabel, setSwipeRightLabel] = useState("Missing");
  const [enableGestures, setEnableGestures] = useState(false);
  const [doubleClickLabel, setDoubleClickLabel] = useState("");
  const [swipeUpLabel, setSwipeUpLabel] = useState("");
  const [swipeDownLabel, setSwipeDownLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(HEADINGS.errorEmptyTitle);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const adapter = new PokemonAdapter();
      const cards = await adapter.fetchCards(dexType);

      if (!cards || cards.length === 0) {
        throw new Error(HEADINGS.errorNoCards);
      }

      const sessionId = generateUUID();

      await db.sessions.add({
        id: sessionId,
        title: title.trim(),
        dexType,
        swipeLeftLabel: swipeLeftLabel.trim() || "Caught",
        swipeRightLabel: swipeRightLabel.trim() || "Missing",
        doubleClickLabel:
          enableGestures && doubleClickLabel.trim()
            ? doubleClickLabel.trim()
            : undefined,
        swipeUpLabel:
          enableGestures && swipeUpLabel.trim()
            ? swipeUpLabel.trim()
            : undefined,
        swipeDownLabel:
          enableGestures && swipeDownLabel.trim()
            ? swipeDownLabel.trim()
            : undefined,
        createdAt: Date.now(),
        status: "in-progress",
        totalCards: cards.length,
      });

      onSessionCreated(sessionId);
    } catch (err: any) {
      console.error("Failed to create session:", err);
      setError(
        err?.message || HEADINGS.errorFetchFailed
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    title,
    setTitle,
    dexType,
    setDexType,
    swipeLeftLabel,
    setSwipeLeftLabel,
    swipeRightLabel,
    setSwipeRightLabel,
    enableGestures,
    setEnableGestures,
    doubleClickLabel,
    setDoubleClickLabel,
    swipeUpLabel,
    setSwipeUpLabel,
    swipeDownLabel,
    setSwipeDownLabel,
    loading,
    error,
    handleSubmit,
  };
};
