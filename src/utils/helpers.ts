import { DEX_OPTIONS } from "../constants/pokedexes";

export const getDexDisplayName = (id: string): string => {
  return DEX_OPTIONS.find((opt) => opt.id === id)?.name || id;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const generateUUID = (): string => {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const downloadJsonFile = (data: any, fileName: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const getSwipeLabel = (
  direction: string,
  session: {
    swipeLeftLabel: string;
    swipeRightLabel: string;
    doubleClickLabel?: string;
    swipeUpLabel?: string;
    swipeDownLabel?: string;
  },
): string => {
  if (direction === "left") return session.swipeLeftLabel;
  if (direction === "right") return session.swipeRightLabel;
  if (direction === "double-click" && session.doubleClickLabel)
    return session.doubleClickLabel;
  if (direction === "up" && session.swipeUpLabel) return session.swipeUpLabel;
  if (direction === "down" && session.swipeDownLabel)
    return session.swipeDownLabel;
  return direction;
};

// Helper to resolve dot-notated paths in nested objects
export const getNestedValue = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
};

// Generic deep recursive search helper
export const deepSearch = (obj: any, query: string): boolean => {
  if (!obj) return false;
  if (typeof obj === "string") return obj.toLowerCase().includes(query);
  if (typeof obj === "number" || typeof obj === "boolean")
    return obj.toString().toLowerCase().includes(query);
  if (typeof obj === "object") {
    return Object.values(obj).some((val) => deepSearch(val, query));
  }
  return false;
};

// Helper to format time specifically for spreadsheet rows (HH:MM:SS)
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};
