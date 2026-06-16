import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../Icon/Icon";
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
          <Icon name="chevron-left" size={20} />
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
          <Icon name="undo" size={20} />
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

