import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon/Icon";
import {
  getStoredAuthSession,
  clearAuthSession,
  findSyncFile,
  downloadSyncFile,
  uploadSyncFile,
} from "../../utils/gdrive";
import { exportDatabase, importDatabase } from "../../utils/helpers";
import { HEADINGS } from "../../constants/headings";
import { db } from "../../db/db";
import "./Synk.scss";

type SyncStatus =
  | "checking"
  | "no_backup"
  | "in_sync"
  | "local_newer"
  | "cloud_newer"
  | "error";

export const Synk: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("checking");
  const [cloudFile, setCloudFile] = useState<{
    id: string;
    modifiedTime: string;
  } | null>(null);
  const [localSyncTime, setLocalSyncTime] = useState<number | null>(null);
  const [localModifiedTime, setLocalModifiedTime] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionInProgress, setActionInProgress] = useState<
    "push" | "pull" | null
  >(null);

  const formatDateTime = (timestamp: number | null | undefined): string => {
    if (!timestamp || timestamp === 0) return "Never";
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const checkSyncStatus = useCallback(async () => {
    const session = getStoredAuthSession();
    if (!session) {
      navigate("/");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      // 1. Get local modified time from IndexedDB
      const sessions = await db.sessions.toArray();
      const swipeActions = await db.swipeActions.toArray();
      const maxSessionTime = sessions.reduce(
        (max, s) => Math.max(max, s.createdAt),
        0,
      );
      const maxActionTime = swipeActions.reduce(
        (max, a) => Math.max(max, a.timestamp),
        0,
      );
      const localMod = Math.max(maxSessionTime, maxActionTime);
      setLocalModifiedTime(localMod);

      // 2. Get last local sync time from localStorage
      const storedSync = localStorage.getItem("mode_last_sync_local");
      const lastSync = storedSync ? Number(storedSync) : 0;
      setLocalSyncTime(lastSync > 0 ? lastSync : null);

      // 3. Get remote file status
      const fileMeta = await findSyncFile(session.accessToken);
      setCloudFile(fileMeta);

      if (!fileMeta) {
        setSyncStatus("no_backup");
      } else {
        const cloudMod = new Date(fileMeta.modifiedTime).getTime();

        // Check if remote or local modified times differ from sync log
        const cloudIsNewer = cloudMod > lastSync + 5000; // 5s clock skew buffer
        const localIsNewer = localMod > lastSync + 5000;

        if (cloudIsNewer && localIsNewer) {
          // Both changed since last sync, resolve conflict based on actual modification times
          if (cloudMod > localMod) {
            setSyncStatus("cloud_newer");
          } else {
            setSyncStatus("local_newer");
          }
        } else if (cloudIsNewer) {
          setSyncStatus("cloud_newer");
        } else if (localIsNewer) {
          setSyncStatus("local_newer");
        } else {
          // If lastSync is 0 (first time syncing on this device, but backup exists)
          if (lastSync === 0) {
            if (cloudMod > localMod) {
              setSyncStatus("cloud_newer");
            } else if (localMod > cloudMod) {
              setSyncStatus("local_newer");
            } else {
              setSyncStatus("in_sync");
            }
          } else {
            setSyncStatus("in_sync");
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to query cloud status:", err);
      // Handle OAuth session expiry/invalid token
      if (err.message && err.message.includes("401")) {
        alert("Your Google Drive session has expired. Please sign in again.");
        clearAuthSession();
        navigate("/");
      } else {
        setSyncStatus("error");
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  const handlePush = async () => {
    const session = getStoredAuthSession();
    if (!session) {
      navigate("/");
      return;
    }

    // Warn if cloud file is newer
    if (syncStatus === "cloud_newer") {
      const confirmPush = window.confirm(HEADINGS.synkPushWarning);
      if (!confirmPush) return;
    }

    try {
      setActionInProgress("push");
      const dbPayload = await exportDatabase();
      await uploadSyncFile(session.accessToken, dbPayload, cloudFile?.id);

      // Fetch file meta to retrieve the actual API-generated modifiedTime
      const fileMeta = await findSyncFile(session.accessToken);
      if (fileMeta) {
        const cloudMod = new Date(fileMeta.modifiedTime).getTime();
        localStorage.setItem("mode_last_sync_local", cloudMod.toString());
      } else {
        localStorage.setItem("mode_last_sync_local", Date.now().toString());
      }

      alert(HEADINGS.synkSuccessPush);
      await checkSyncStatus();
    } catch (err: any) {
      console.error("Backup failed:", err);
      alert(`Upload failed: ${err.message || err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePull = async () => {
    const session = getStoredAuthSession();
    if (!session || !cloudFile) return;

    // Warn if local modifications are newer than last sync
    const lastSync = localSyncTime || 0;
    const localIsNewer = localModifiedTime > lastSync + 5000;
    if (localIsNewer) {
      const confirmPull = window.confirm(HEADINGS.synkPullWarning);
      if (!confirmPull) return;
    }

    try {
      setActionInProgress("pull");
      const payload = await downloadSyncFile(session.accessToken, cloudFile.id);
      await importDatabase(payload);

      const cloudMod = new Date(cloudFile.modifiedTime).getTime();
      localStorage.setItem("mode_last_sync_local", cloudMod.toString());

      alert(HEADINGS.synkSuccessPull);
      await checkSyncStatus();
    } catch (err: any) {
      console.error("Restore failed:", err);
      alert(`Download failed: ${err.message || err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDisconnect = () => {
    if (
      window.confirm(
        "Are you sure you want to disconnect your Google Drive sync connection?",
      )
    ) {
      clearAuthSession();
      navigate("/");
    }
  };

  return (
    <div className="synk-view fade-in">
      <header className="synk-header">
        <button
          className="back-btn"
          onClick={() => navigate("/")}
          title={HEADINGS.synkBtnBack}
          aria-label={HEADINGS.synkBtnBack}
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <h1>{HEADINGS.synkTitle}</h1>
        <p className="subtitle">{HEADINGS.synkSubtitle}</p>
      </header>

      <main className="synk-content">
        <section className="status-card">
          <h2>Cloud Connection & Status</h2>

          {loading ? (
            <div className="status-loader">
              <span className="spinner"></span>
              <span>{HEADINGS.synkCheckingStatus}</span>
            </div>
          ) : (
            <div className="status-details">
              <div className="status-row">
                <span className="label">Sync State</span>
                <span className={`badge badge-${syncStatus}`}>
                  {syncStatus === "no_backup" && HEADINGS.synkNoBackupFound}
                  {syncStatus === "in_sync" && HEADINGS.synkStatusUpToDate}
                  {syncStatus === "local_newer" &&
                    HEADINGS.synkStatusLocalNewer}
                  {syncStatus === "cloud_newer" &&
                    HEADINGS.synkStatusCloudNewer}
                  {syncStatus === "error" && "Sync Error"}
                </span>
              </div>

              {syncStatus === "error" && (
                <div className="error-alert">
                  <Icon name="alert" size={16} strokeWidth={2} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="detail-item">
                <span className="label">Last Local Modification</span>
                <span className="value">
                  {formatDateTime(localModifiedTime)}
                </span>
              </div>

              <div className="detail-item">
                <span className="label">Last Sync Complete</span>
                <span className="value">{formatDateTime(localSyncTime)}</span>
              </div>

              <div className="detail-item">
                <span className="label">Cloud Backup Modified</span>
                <span className="value">
                  {cloudFile
                    ? formatDateTime(new Date(cloudFile.modifiedTime).getTime())
                    : "Never"}
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="sync-actions-section">
          <button
            className="btn-primary push-btn"
            onClick={handlePush}
            disabled={loading || actionInProgress !== null}
          >
            {actionInProgress === "push" ? (
              <>
                <span className="spinner"></span> Backing up...
              </>
            ) : (
              <>
                <Icon name="upload" size={18} />
                {HEADINGS.synkBtnPush}
              </>
            )}
          </button>

          <button
            className="btn-secondary pull-btn"
            onClick={handlePull}
            disabled={loading || !cloudFile || actionInProgress !== null}
          >
            {actionInProgress === "pull" ? (
              <>
                <span className="spinner"></span> Downloading...
              </>
            ) : (
              <>
                <Icon name="export" size={18} />
                {HEADINGS.synkBtnPull}
              </>
            )}
          </button>
        </section>
      </main>

      <footer className="synk-footer">
        <button className="disconnect-btn" onClick={handleDisconnect}>
          {HEADINGS.synkLogOut}
        </button>
      </footer>
    </div>
  );
};

export default Synk;
