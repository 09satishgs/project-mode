export interface CardData {
  id: string; // Unique identifier, e.g., "pokemon-1"
  imageUrl: string; // Sprite or artwork URL
  primaryText: string; // e.g., "Bulbasaur"
  secondaryText: string; // e.g., "NationalDex #001"
}

export interface IDataAdapter {
  /**
   * Fetches data and transforms it into the generic CardData format.
   * @param sourceId The identifier for the catalog, e.g., "kanto" or "national"
   */
  fetchCards(sourceId: string): Promise<CardData[]>;
}
