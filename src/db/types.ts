export interface SessionMetadata {
  id: string; // UUID (unique session ID)
  title: string; // Name of the snapshot
  dexType: string; // Selected Dex identifier (e.g., "kanto", "national")
  swipeLeftLabel: string; // Label displayed on left-drag (e.g., "Caught")
  swipeRightLabel: string; // Label displayed on right-drag (e.g., "Missing")
  doubleClickLabel?: string; // Optional custom gesture
  swipeUpLabel?: string; // Optional custom gesture
  swipeDownLabel?: string; // Optional custom gesture
  createdAt: number; // Epoch timestamp
  status: "in-progress" | "completed";
  totalCards: number; // Cache of total cards count in this session
}

export interface SwipeAction {
  id?: number; // Auto-incrementing primary key
  sessionId: string; // Foreign key linking to SessionMetadata
  cardId: string; // ID of the card swiped
  direction: "left" | "right" | "double-click" | "up" | "down";
  timestamp: number; // Epoch timestamp of swipe
}

export interface CardDetailsRecord {
  id: string; // Unique key format: "sessionId_cardId"
  sessionId: string;
  cardId: string;
  details: any; // The complete raw JSON of the card
}
