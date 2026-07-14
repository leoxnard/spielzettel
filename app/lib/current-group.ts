import { useSyncExternalStore } from "react";

/**
 * The group you're currently "in" — there's no personal account, the group is
 * the whole identity. Enter a name (+ optional secret) and you're in it;
 * "logout" just clears this. Stored locally, per device.
 */
export interface CurrentGroup {
  id: string;
  code: string;
  name: string;
}

const STORAGE_KEY = "spielzettel:group";

let cache: CurrentGroup | null | undefined;
let listeners: Array<() => void> = [];

function read(): CurrentGroup | null {
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as CurrentGroup) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function notify() {
  cache = undefined;
  for (const l of listeners) l();
}

/** Synchronous read of the stored group (null on the server / when unset). */
export function getCurrentGroup(): CurrentGroup | null {
  if (typeof localStorage === "undefined") return null;
  return read();
}

export function setCurrentGroup(group: CurrentGroup) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
  notify();
}

export function clearCurrentGroup() {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Server snapshot is null — the current group only exists client-side. */
export function useCurrentGroup(): CurrentGroup | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
