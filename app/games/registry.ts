import { kniffelDefinition } from "./kniffel";
import { phase10Definition } from "./phase10";
import { punkteDefinition } from "./punkte";
import { slfDefinition } from "./stadtlandfluss";
import { spadesDefinition } from "./spades";
import { wizardDefinition } from "./wizard";
import type { GameDefinition } from "./types";

/**
 * All playable games, in home-page order. To add one: create
 * app/games/<slug>/ implementing GameDefinition, import it here — done.
 * See ARCHITECTURE.md.
 *
 * Games that are just "points per round + a limit" (Rommé, Uno, Skyjo,
 * Hearts, Canasta, 6 nimmt!, Flip 7, Cabo, Yaniv, …) are NOT separate
 * modules — they're presets inside `punkte/index.tsx`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAMES: GameDefinition<any, any>[] = [
  punkteDefinition,
  kniffelDefinition,
  wizardDefinition,
  phase10Definition,
  slfDefinition,
  spadesDefinition,
];

export function getGame(slug: string) {
  return GAMES.find((g) => g.slug === slug);
}
