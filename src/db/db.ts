import Dexie, { type Table } from "dexie";
import type { SessionMetadata, SwipeAction, CardDetailsRecord } from "./types";

export class ModeDatabase extends Dexie {
  sessions!: Table<SessionMetadata, string>;
  swipeActions!: Table<SwipeAction, number>;
  cardDetails!: Table<CardDetailsRecord, string>;

  constructor() {
    super("ModeDatabase");
    this.version(3).stores({
      sessions: "id, title, dexType, createdAt, status",
      swipeActions: "++id, sessionId, cardId, [sessionId+cardId]",
      cardDetails: "id, sessionId, cardId",
    });
  }
}

export const db = new ModeDatabase();
