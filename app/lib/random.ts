/** Cryptographically random index in [0, n) — no modulo-bias concerns for small n. */
export function secureRandomIndex(n: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % n;
}
