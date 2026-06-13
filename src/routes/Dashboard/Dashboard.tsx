import React from "react";
import { NewSessionModal } from "../../components/NewSessionModal/NewSessionModal";
import { HEADINGS } from "../../constants/headings";
import { getDexDisplayName, formatDate } from "../../utils/helpers";
import { useDashboard } from "./useDashboard";
import "./Dashboard.scss";

export const Dashboard: React.FC = () => {
  const {
    isModalOpen,
    setIsModalOpen,
    loading,
    inProgressSessions,
    completedSessions,
    handleCreateSession,
    handleDeleteSession,
    handleUploadJSON,
    navigate,
  } = useDashboard();

  return (
    <div className="dashboard-view fade-in">
      <header className="dashboard-header">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h1>{HEADINGS.dashboardTitle}</h1>
        </div>
        <p className="subtitle">{HEADINGS.dashboardSubtitle}</p>
      </header>

      <main className="dashboard-content">
        <section className="sessions-section">
          <h2>{HEADINGS.sectionInProgress}</h2>
          {loading ? (
            <div className="loader-container">
              <span className="spinner"></span> {HEADINGS.loadingSessions}
            </div>
          ) : inProgressSessions.length === 0 ? (
            <div className="empty-state">
              <p>{HEADINGS.emptyInProgress}</p>
            </div>
          ) : (
            <div className="sessions-grid">
              {inProgressSessions.map((session) => (
                <div
                  key={session.id}
                  className="session-card"
                  onClick={() => navigate(`/snapshot/${session.id}`)}
                >
                  <div className="card-header">
                    <h3>{session.title}</h3>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      title={HEADINGS.tooltipDelete}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div className="card-meta">
                    <span className="dex-type">
                      {getDexDisplayName(session.dexType)}
                    </span>
                    <span className="date">
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                  <div className="card-progress">
                    <div className="progress-text">
                      <span>
                        {session.swipedCount} / {session.totalCards} cards
                      </span>
                      <span>{Math.round(session.progress)}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${session.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sessions-section">
          <div className="section-header-row">
            <h2>{HEADINGS.sectionCompleted}</h2>
            <button
              className="upload-icon-btn"
              onClick={() =>
                document.getElementById("upload-snapshot-file")?.click()
              }
              title={HEADINGS.tooltipUpload}
              aria-label={HEADINGS.tooltipUpload}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <input
              type="file"
              id="upload-snapshot-file"
              accept=".json"
              onChange={handleUploadJSON}
              style={{ display: "none" }}
            />
          </div>
          {loading ? null : completedSessions.length === 0 ? (
            <div className="empty-state">
              <p>{HEADINGS.emptyCompleted}</p>
            </div>
          ) : (
            <div className="sessions-grid">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="session-card completed"
                  onClick={() => navigate(`/snapshot/${session.id}`)}
                >
                  <div className="card-header">
                    <h3>{session.title}</h3>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      title={HEADINGS.tooltipDelete}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div className="card-meta">
                    <span className="dex-type">
                      {getDexDisplayName(session.dexType)}
                    </span>
                    <span className="date">
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                  <div className="card-progress">
                    <div className="progress-text">
                      <span>{session.totalCards} cards swiped</span>
                      <span className="badge-complete">Done</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="dashboard-actions">
        <button
          className="btn-secondary analyse-btn"
          onClick={() => navigate("/analyse")}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ marginRight: "6px" }}
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {HEADINGS.btnAnalyse}
        </button>
        <button
          className="btn-primary start-new-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ marginRight: "6px" }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {HEADINGS.btnNew}
        </button>
      </div>

      {isModalOpen && (
        <NewSessionModal
          onClose={() => setIsModalOpen(false)}
          onSessionCreated={handleCreateSession}
        />
      )}
    </div>
  );
};

export default Dashboard;
