import { flip7Definition } from "./flip7";
import { kniffelDefinition } from "./kniffel";
import { phase10Definition } from "./phase10";
import { punkteDefinition } from "./punkte";
import { sechsNimmtDefinition } from "./sechsnimmt";
import { slfDefinition } from "./stadtlandfluss";
import { spadesDefinition } from "./spades";
import { wizardDefinition } from "./wizard";
import type { GameDefinition } from "./types";

/**
 * All playable games, in home-page order. To add one: create
 * app/games/<slug>/ implementing GameDefinition, import it here — done.
 * See ARCHITECTURE.md.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAMES: GameDefinition<any, any>[] = [
  punkteDefinition,
  kniffelDefinition,
  wizardDefinition,
  phase10Definition,
  slfDefinition,
  sechsNimmtDefinition,
  spadesDefinition,
  flip7Definition,
];

export function getGame(slug: string) {
  return GAMES.find((g) => g.slug === slug);
}
