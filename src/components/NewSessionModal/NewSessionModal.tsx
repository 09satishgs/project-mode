import React from "react";
import { DEX_OPTIONS } from "../../constants/pokedexes";
import { HEADINGS } from "../../constants/headings";
import { useNewSessionModal } from "./useNewSessionModal";
import "./NewSessionModal.scss";

interface NewSessionModalProps {
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  onClose,
  onSessionCreated,
}) => {
  const {
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
  } = useNewSessionModal({ onSessionCreated });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{HEADINGS.modalTitle}</h2>
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
            <label htmlFor="title">{HEADINGS.titleLabel}</label>
            <input
              type="text"
              id="title"
              placeholder={HEADINGS.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={50}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="dexType">{HEADINGS.dexLabel}</label>
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
                {HEADINGS.swipeLeftLabel} <span className="color-block green" />
              </label>
              <input
                type="text"
                id="swipeLeftLabel"
                placeholder={HEADINGS.swipeLeftPlaceholder}
                value={swipeLeftLabel}
                onChange={(e) => setSwipeLeftLabel(e.target.value)}
                disabled={loading}
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label htmlFor="swipeRightLabel" className="label-with-color">
                {HEADINGS.swipeRightLabel} <span className="color-block red" />
              </label>
              <input
                type="text"
                id="swipeRightLabel"
                placeholder={HEADINGS.swipeRightPlaceholder}
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
              <span>{HEADINGS.enableGesturesLabel}</span>
            </label>
          </div>

          {enableGestures && (
            <div className="custom-gestures-group fade-in">
              <div className="form-group">
                <label htmlFor="doubleClickLabel">{HEADINGS.doubleClickLabel}</label>
                <input
                  type="text"
                  id="doubleClickLabel"
                  placeholder={HEADINGS.doubleClickPlaceholder}
                  value={doubleClickLabel}
                  onChange={(e) => setDoubleClickLabel(e.target.value)}
                  disabled={loading}
                  maxLength={20}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="swipeUpLabel">{HEADINGS.swipeUpLabel}</label>
                  <input
                    type="text"
                    id="swipeUpLabel"
                    placeholder={HEADINGS.swipeUpPlaceholder}
                    value={swipeUpLabel}
                    onChange={(e) => setSwipeUpLabel(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="swipeDownLabel">{HEADINGS.swipeDownLabel}</label>
                  <input
                    type="text"
                    id="swipeDownLabel"
                    placeholder={HEADINGS.swipeDownPlaceholder}
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
              {HEADINGS.cancelBtn}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {HEADINGS.fetchingText}
                </>
              ) : (
                HEADINGS.createBtn
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
