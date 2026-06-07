import React from "react";
import { useNavigate } from "react-router-dom";
import "./ProgressBar.scss";

interface ProgressBarProps {
  title: string;
  swipedCount: number;
  totalCards: number;
  onUndo: () => void;
  canUndo: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  title,
  swipedCount,
  totalCards,
  onUndo,
  canUndo,
}) => {
  const navigate = useNavigate();
  const percentage = totalCards > 0 ? (swipedCount / totalCards) * 100 : 0;

  return (
    <header className="session-progress-header">
      <div className="header-main">
        <button
          className="back-btn"
          onClick={() => navigate("/")}
          aria-label="Back to dashboard"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="session-info">
          <h1>{title}</h1>
          <span className="progress-counter">
            {swipedCount} / {totalCards} Swiped
          </span>
        </div>

        <button
          className="undo-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo last swipe"
          title="Undo last swipe"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </header>
  );
};

export default ProgressBar;
