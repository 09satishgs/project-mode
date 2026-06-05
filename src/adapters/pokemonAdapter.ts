import { Pokedex } from "pokeapi-js-wrapper";
import type { CardData, IDataAdapter } from "./types";
import { DEX_OPTIONS } from "../constants/pokedexes";

// Helper to capitalize words
export const capitalize = (str: string): string => {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper to extract Pokemon ID from species URL
// e.g., "https://pokeapi.co/api/v2/pokemon-species/1/" -> "1"
export const getPokemonIdFromUrl = (url: string): string => {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1];
};

export class PokemonAdapter implements IDataAdapter {
  private static pokedexInstance: Pokedex | null = null;

  constructor() {
    if (!PokemonAdapter.pokedexInstance) {
      PokemonAdapter.pokedexInstance = new Pokedex({
        protocol: "https",
        hostName: "pokeapi.co",
        versionPath: "/api/v2/",
        cache: true,
        timeout: 1000000, // 5s
        cacheImages: true,
      });
    }
  }

  async fetchCards(sourceId: string): Promise<CardData[]> {
    try {
      const option = DEX_OPTIONS.find((opt) => opt.id === sourceId);
      const apiName = option?.type === "custom" ? "national" : sourceId;

      // Fetch Pokedex from PokeAPI wrapper (leverages IndexedDB cache)
      const response =
        await PokemonAdapter.pokedexInstance!.getPokedexByName(apiName);

      let entries = response.pokemon_entries || [];

      // If it's a custom Debut Dex, filter by ID range
      if (option && option.type === "custom") {
        const min = option.min ?? 1;
        const max = option.max ?? 3000;
        entries = entries.filter((entry: any) => {
          const id = parseInt(
            getPokemonIdFromUrl(entry.pokemon_species.url),
            10,
          );
          return id >= min && id <= max;
        });
      }

      // Transform Pokedex entries to CardData
      return entries.map((entry: any) => {
        const id = getPokemonIdFromUrl(entry.pokemon_species.url);
        const primaryText = capitalize(entry.pokemon_species.name);
        const secondaryText = `National Dex #${id.padStart(3, "0")}`;

        // High quality official artwork sprite
        const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

        return {
          id: id,
          imageUrl,
          primaryText,
          secondaryText,
        };
      });
    } catch (error) {
      console.error("Error fetching cards via PokemonAdapter:", error);
      throw error;
    }
  }
}
