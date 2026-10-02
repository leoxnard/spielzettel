import type { GameRow, GameStatus, Json, Player } from "./types";

/**
 * A pending write, applied locally on top of the last server row until the
 * server confirms it. Each kind mirrors one write path in game-api.ts and
 * replicates its Postgres semantics, so the optimistic value is exactly what
 * the server will return — no flash of a different value on confirmation.
 */
export type GameOp =
  | { kind: "set"; path: string[]; value: Json | null }
  | { kind: "merge"; path: string[]; value: Record<string, Json | null> }
  | {
      kind: "player";
      playerId: string;
      patch: Partial<Pick<Player, "name" | "color">>;
    }
  | { kind: "update"; patch: GamePatch };

export type GamePatch = Partial<{
  title: string | null;
  players: Player[];
  status: GameStatus;
  state: Record<string, Json>;
}>;

type Container = { [key: string]: Json } | Json[];

function isContainer(value: Json | undefined): value is Container {
  return typeof value === "object" && value !== null;
}

function getAt(root: Json, path: string[]): Json | undefined {
  let node: Json | undefined = root;
  for (const key of path) {
    if (!isContainer(node)) return undefined;
    node = Array.isArray(node) ? node[Number(key)] : node[key];
  }
  return node;
}

function withChild(node: Container, key: string, child: Json | undefined): Container {
  if (Array.isArray(node)) {
    const index = Number(key);
    if (!Number.isInteger(index)) return node;
    const next = [...node];
    if (child === undefined) next.splice(index, 1);
    else if (index >= next.length) next.push(child);
    else next[index] = child;
    return next;
  }
  const next = { ...node };
  if (child === undefined) delete next[key];
  else next[key] = child;
  return next;
}

/**
 * Immutable `jsonb_set(target, path, value, true)` / `target #- path`
 * (value undefined). Like Postgres, only the last key is created: a missing
 * parent leaves the target unchanged.
 */
export function setIn(root: Json, path: string[], value: Json | undefined): Json {
  if (path.length === 0) return root;
  const [key, ...rest] = path;
  if (!isContainer(root)) return root;
  if (rest.length === 0) return withChild(root, key, value);
  const child = Array.isArray(root) ? root[Number(key)] : root[key];
  if (!isContainer(child)) return root;
  return withChild(root, key, setIn(child, rest, value));
}

export function applyOp(row: GameRow, op: GameOp): GameRow {
  switch (op.kind) {
    case "set":
      return {
        ...row,
        state: setIn(row.state, op.path, op.value ?? undefined) as GameRow["state"],
      };
    case "merge": {
      const current = getAt(row.state, op.path);
      const base =
        isContainer(current) && !Array.isArray(current) ? current : {};
      return {
        ...row,
        state: setIn(row.state, op.path, { ...base, ...op.value }) as GameRow["state"],
      };
    }
    case "player":
      return {
        ...row,
        players: row.players.map((p) =>
          p.id === op.playerId ? { ...p, ...op.patch } : p,
        ),
      };
    case "update":
      return { ...row, ...op.patch };
  }
}

export function applyOps(row: GameRow, ops: readonly GameOp[]): GameRow {
  return ops.reduce(applyOp, row);
}

const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/** Microseconds since epoch; Date alone would drop the sub-ms digits. */
function micros(ts: string): number {
  const m = TIMESTAMP.exec(ts);
  if (!m) return Date.parse(ts) * 1000;
  let offset = m[4] ?? "Z";
  if (/^[+-]\d{2}$/.test(offset)) offset += ":00";
  const ms = Date.parse(`${m[1]}T${m[2]}${offset}`);
  const fraction = Number(((m[3] ?? "") + "000000").slice(0, 6));
  return ms * 1000 + fraction;
}

/**
 * Orders `updated_at` values from PostgREST and Realtime, which may format
 * the same instant differently ("T" vs " ", "+00" vs "+00:00").
 */
export function compareTimestamps(a: string, b: string): number {
  return micros(a) - micros(b);
}
