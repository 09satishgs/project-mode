export interface AuthSession {
  accessToken: string;
  expiresAt: number; // timestamp in milliseconds
}

const SYNC_FILE_NAME = "MODE_sync.json";
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "your-google-oauth-client-id-here.apps.googleusercontent.com";

// Store token session in localStorage for session durability
export const getStoredAuthSession = (): AuthSession | null => {
  const stored = localStorage.getItem("mode_google_auth");
  if (!stored) return null;
  try {
    const session: AuthSession = JSON.parse(stored);
    // If token is expired or expires in less than 2 minutes, treat as invalid
    if (session.expiresAt - Date.now() < 120 * 1000) {
      localStorage.removeItem("mode_google_auth");
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const storeAuthSession = (accessToken: string, expiresInSeconds: number): void => {
  const session: AuthSession = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
  localStorage.setItem("mode_google_auth", JSON.stringify(session));
};

export const clearAuthSession = (): void => {
  localStorage.removeItem("mode_google_auth");
};

// Trigger Google OAuth implicit grant flow popup
export const authenticateGoogle = (
  onSuccess: (token: string) => void,
  onFailure?: (err: any) => void
): void => {
  const google = (window as any).google;
  if (!google || !google.accounts || !google.accounts.oauth2) {
    if (onFailure) {
      onFailure(new Error("Google Identity Client script is not loaded yet."));
    }
    return;
  }

  try {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.appdata",
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          if (onFailure) onFailure(tokenResponse);
          return;
        }
        if (tokenResponse.access_token) {
          // Store token in session (expires_in usually defaults to 3600 seconds)
          const expiresIn = tokenResponse.expires_in
            ? parseInt(tokenResponse.expires_in)
            : 3600;
          storeAuthSession(tokenResponse.access_token, expiresIn);
          onSuccess(tokenResponse.access_token);
        }
      },
    });

    // Request token with popup
    tokenClient.requestAccessToken({ prompt: "consent" });
  } catch (err) {
    if (onFailure) onFailure(err);
  }
};

// Google Drive API: Search for sync file in appDataFolder
export const findSyncFile = async (
  token: string
): Promise<{ id: string; modifiedTime: string } | null> => {
  const query = encodeURIComponent(`name = '${SYNC_FILE_NAME}' and parents in 'appDataFolder'`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,modifiedTime)`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let details = "";
    try {
      const errJson = await res.json();
      details = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      details = res.statusText;
    }
    throw new Error(`Google Drive API Search Failed: ${res.status} ${details}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      modifiedTime: data.files[0].modifiedTime,
    };
  }
  return null;
};

// Google Drive API: Download backup file content
export const downloadSyncFile = async (token: string, fileId: string): Promise<any> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let details = "";
    try {
      const errJson = await res.json();
      details = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      details = res.statusText;
    }
    throw new Error(`Google Drive API Download Failed: ${res.status} ${details}`);
  }

  return await res.json();
};

// Google Drive API: Upload (Create or Update) database JSON to appDataFolder
export const uploadSyncFile = async (
  token: string,
  dbPayload: any,
  fileId?: string
): Promise<string> => {
  const fileContent = JSON.stringify(dbPayload);

  if (fileId) {
    // UPDATE existing file
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: fileContent,
    });

    if (!res.ok) {
      let details = "";
      try {
        const errJson = await res.json();
        details = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        details = res.statusText;
      }
      throw new Error(`Google Drive API Update Failed: ${res.status} ${details}`);
    }

    const data = await res.json();
    return data.id || fileId;
  } else {
    // CREATE new file (Multipart Upload)
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: ["appDataFolder"],
    };

    const boundary = "MODE_SYNC_MULTIPART_BOUNDARY_998877";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--\r\n`;

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      fileContent +
      closeDelimiter;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      let details = "";
      try {
        const errJson = await res.json();
        details = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        details = res.statusText;
      }
      throw new Error(`Google Drive API Creation Failed: ${res.status} ${details}`);
    }

    const data = await res.json();
    return data.id;
  }
};
