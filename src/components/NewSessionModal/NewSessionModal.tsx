import React, { useState } from "react";
import { db } from "../../db/db";
import { PokemonAdapter } from "../../adapters/pokemonAdapter";
import { DEX_OPTIONS } from "../../constants/pokedexes";
import "./NewSessionModal.scss";

interface NewSessionModalProps {
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  onClose,
  onSessionCreated,
}) => {
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
      setError("Please enter a session title.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch card count using the adapter
      const adapter = new PokemonAdapter();
      const cards = await adapter.fetchCards(dexType);

      if (!cards || cards.length === 0) {
        throw new Error("No cards found for this Dex option.");
      }
      function generateUUID() {
        // 1. Try the native, secure way first
        if (window.crypto && crypto.randomUUID) {
          return crypto.randomUUID();
        }

        // 2. Fallback for insecure contexts (for testing over HTTP)
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          },
        );
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
        err?.message ||
          "Failed to fetch Dex data. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Snapshot</h2>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Snapshot Title</label>
            <input
              type="text"
              id="title"
              placeholder="e.g., Kanto Shiny Hunt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={50}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="dexType">Pokedex Regional Dex</label>
            <select
              id="dexType"
              value={dexType}
              onChange={(e) => setDexType(e.target.value)}
              disabled={loading}
            >
              {DEX_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.count} Pokémon)
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="swipeLeftLabel" className="label-with-color">
                Swipe Left <span className="color-block green" />
              </label>
              <input
                type="text"
                id="swipeLeftLabel"
                placeholder="Caught"
                value={swipeLeftLabel}
                onChange={(e) => setSwipeLeftLabel(e.target.value)}
                disabled={loading}
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label htmlFor="swipeRightLabel" className="label-with-color">
                Swipe Right <span className="color-block red" />
              </label>
              <input
                type="text"
                id="swipeRightLabel"
                placeholder="Missing"
                value={swipeRightLabel}
                onChange={(e) => setSwipeRightLabel(e.target.value)}
                disabled={loading}
                maxLength={20}
              />
            </div>
          </div>

          <div className="form-group gesture-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableGestures}
                onChange={(e) => setEnableGestures(e.target.checked)}
                disabled={loading}
              />
              <span>Enable Custom Gestures</span>
            </label>
          </div>

          {enableGestures && (
            <div className="custom-gestures-group fade-in">
              <div className="form-group">
                <label htmlFor="doubleClickLabel">Double Click Label</label>
                <input
                  type="text"
                  id="doubleClickLabel"
                  placeholder="e.g., Favorite (Optional)"
                  value={doubleClickLabel}
                  onChange={(e) => setDoubleClickLabel(e.target.value)}
                  disabled={loading}
                  maxLength={20}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="swipeUpLabel">Swipe Up Label</label>
                  <input
                    type="text"
                    id="swipeUpLabel"
                    placeholder="e.g., To Evolve (Optional)"
                    value={swipeUpLabel}
                    onChange={(e) => setSwipeUpLabel(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="swipeDownLabel">Swipe Down Label</label>
                  <input
                    type="text"
                    id="swipeDownLabel"
                    placeholder="e.g., Trash (Optional)"
                    value={swipeDownLabel}
                    onChange={(e) => setSwipeDownLabel(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Fetching Dex...
                </>
              ) : (
                "Create Snapshot"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
