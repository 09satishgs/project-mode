import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../db/db";
import type { SessionMetadata } from "../../db/types";
import { NewSessionModal } from "../../components/NewSessionModal/NewSessionModal";
import { DEX_OPTIONS } from "../../constants/pokedexes";
import "./Dashboard.scss";

interface SessionWithProgress extends SessionMetadata {
  swipedCount: number;
  progress: number;
}

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<SessionWithProgress[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const allSessions = await db.sessions.reverse().sortBy("createdAt");

      const sessionsData = await Promise.all(
        allSessions.map(async (sess) => {
          const swipedCount = await db.swipeActions
            .where("sessionId")
            .equals(sess.id)
            .count();
          const progress =
            sess.totalCards > 0 ? (swipedCount / sess.totalCards) * 100 : 0;

          // Dynamically check if completed
          const currentStatus =
            swipedCount >= sess.totalCards ? "completed" : "in-progress";
          if (currentStatus !== sess.status) {
            await db.sessions.update(sess.id, { status: currentStatus });
            sess.status = currentStatus;
          }

          return {
            ...sess,
            swipedCount,
            progress: Math.min(progress, 100),
          };
        }),
      );

      setSessions(sessionsData);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = (id: string) => {
    setIsModalOpen(false);
    navigate(`/snapshot/${id}`);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this snapshot and all swipe history?",
      )
    ) {
      return;
    }

    try {
      await db.transaction("rw", [db.sessions, db.swipeActions], async () => {
        await db.sessions.delete(id);
        await db.swipeActions.where("sessionId").equals(id).delete();
      });
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleUploadJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== "object") {
        throw new Error("Invalid file content. Must be a JSON object.");
      }
      if (!data.session || typeof data.session !== "object") {
        throw new Error("Missing session metadata in JSON.");
      }
      if (!data.session.title || !data.session.dexType) {
        throw new Error("Session title or dex type is missing.");
      }
      if (!data.actions || !Array.isArray(data.actions)) {
        throw new Error("Missing actions list in JSON.");
      }

      function generateUUID() {
        if (window.crypto && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          },
        );
      }
      const newSessionId = generateUUID();
      const originalTitle = data.session.title;

      const swipedCount = data.actions.length;
      const totalCards = data.session.totalCards || swipedCount;
      const status = swipedCount >= totalCards ? "completed" : "in-progress";

      await db.transaction(
        "rw",
        [db.sessions, db.swipeActions, db.cardDetails],
        async () => {
          await db.sessions.add({
            id: newSessionId,
            title: `${originalTitle} (Imported)`,
            dexType: data.session.dexType,
            swipeLeftLabel: data.session.swipeLeftLabel || "Caught",
            swipeRightLabel: data.session.swipeRightLabel || "Missing",
            doubleClickLabel: data.session.doubleClickLabel,
            swipeUpLabel: data.session.swipeUpLabel,
            swipeDownLabel: data.session.swipeDownLabel,
            createdAt: data.session.createdAt || Date.now(),
            status,
            totalCards,
          });

          for (const act of data.actions) {
            if (!act.cardId || !act.direction) continue;

            await db.swipeActions.add({
              sessionId: newSessionId,
              cardId: act.cardId,
              direction: act.direction,
              timestamp: act.timestamp || Date.now(),
            });

            if (act.cardDetails) {
              await db.cardDetails.put({
                id: `${newSessionId}_${act.cardId}`,
                sessionId: newSessionId,
                cardId: act.cardId,
                details: act.cardDetails,
              });
            }
          }
        },
      );

      alert(`Snapshot "${originalTitle}" imported successfully!`);
      fetchSessions();
    } catch (err: any) {
      console.error("Failed to upload snapshot:", err);
      alert(`Import failed: ${err.message || err}`);
    }
  };

  const getDexDisplayName = (id: string) => {
    return DEX_OPTIONS.find((opt) => opt.id === id)?.name || id;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const inProgressSessions = sessions.filter((s) => s.status === "in-progress");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div className="dashboard-view fade-in">
      <header className="dashboard-header">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h1>M.O.D.E.</h1>
        </div>
        <p className="subtitle">Mobile Optimized Dex Entry</p>
      </header>

      <main className="dashboard-content">
        <section className="sessions-section">
          <h2>In Progress</h2>
          {loading ? (
            <div className="loader-container">
              <span className="spinner"></span> Loading sessions...
            </div>
          ) : inProgressSessions.length === 0 ? (
            <div className="empty-state">
              <p>No in-progress snapshots.</p>
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
                      title="Delete snapshot"
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
            <h2>Completed</h2>
            <button
              className="upload-icon-btn"
              onClick={() =>
                document.getElementById("upload-snapshot-file")?.click()
              }
              title="Upload snapshot JSON"
              aria-label="Upload snapshot JSON"
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
              <p>No completed snapshots yet.</p>
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
                      title="Delete snapshot"
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
          Analyse
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
          New
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
