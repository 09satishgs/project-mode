import React from "react";
import { Icon } from "../../components/Icon/Icon";
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
    isSyncLoggedIn,
    handleSyncClick,
  } = useDashboard();

  return (
    <div className="dashboard-view fade-in">
      {/* Floating Sync Action Button */}
      <button
        className={`floating-sync-btn ${isSyncLoggedIn ? "logged-in" : "logged-out"}`}
        onClick={handleSyncClick}
        title="Database Synchronization"
        aria-label="Database Synchronization"
      >
        <Icon name="sync" size={18} />
        {!isSyncLoggedIn && <span className="exclamation-badge">!</span>}
      </button>

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
                      <Icon name="trash" size={16} strokeWidth={2} />
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
              <Icon name="upload" size={16} />
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
                      <Icon name="trash" size={16} strokeWidth={2} />
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
          <Icon name="analyse" size={18} style={{ marginRight: "6px" }} />
          {HEADINGS.btnAnalyse}
        </button>
        <button
          className="btn-primary start-new-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Icon name="plus" size={18} style={{ marginRight: "6px" }} />
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
