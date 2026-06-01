/// <reference types="vite/client" />

declare module "pokeapi-js-wrapper" {
  export interface PokedexOptions {
    protocol?: string;
    hostName?: string;
    versionPath?: string;
    cache?: boolean;
    cacheImages?: boolean;
    timeout?: number;
  }

  export interface PokemonSpecies {
    name: string;
    url: string;
  }

  export interface PokemonEntry {
    entry_number: number;
    pokemon_species: PokemonSpecies;
  }

  export interface PokedexResponse {
    name: string;
    pokemon_entries: PokemonEntry[];
  }

  export class Pokedex {
    constructor(options?: PokedexOptions);
    getPokedexByName(name: string | number): Promise<PokedexResponse>;
  }
}
