import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../db/db";
import type { SessionMetadata } from "../../db/types";
import { generateUUID } from "../../utils/helpers";
import { HEADINGS } from "../../constants/headings";

export interface SessionWithProgress extends SessionMetadata {
  swipedCount: number;
  progress: number;
}

export const useDashboard = () => {
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
    if (!window.confirm(HEADINGS.confirmDeleteSession)) {
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
        throw new Error(HEADINGS.errUploadInvalidJson);
      }
      if (!data.session || typeof data.session !== "object") {
        throw new Error(HEADINGS.errUploadMissingSession);
      }
      if (!data.session.title || !data.session.dexType) {
        throw new Error(HEADINGS.errUploadMissingTitleDex);
      }
      if (!data.actions || !Array.isArray(data.actions)) {
        throw new Error(HEADINGS.errUploadMissingActions);
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
        }
      );

      alert(`${HEADINGS.msgUploadSuccessPre} "${originalTitle}" ${HEADINGS.msgUploadSuccessPost}`);
      fetchSessions();
    } catch (err: any) {
      console.error("Failed to upload snapshot:", err);
      alert(`${HEADINGS.msgUploadFailed} ${err.message || err}`);
    }
  };

  const inProgressSessions = sessions.filter((s) => s.status === "in-progress");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return {
    sessions,
    isModalOpen,
    setIsModalOpen,
    loading,
    inProgressSessions,
    completedSessions,
    handleCreateSession,
    handleDeleteSession,
    handleUploadJSON,
    navigate,
  };
};
