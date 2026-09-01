import { describe, expect, it } from "vitest";

import { scrubUrl } from "./analytics";

// Der Code ist der Zugangsschutz einer Runde. Käme er je in der Statistik an,
// stünde er im Klartext in der Analytics-Datenbank — diese Tests sind die
// Grenze, an der das verhindert wird.
describe("scrubUrl", () => {
  it("entfernt den Spiel-Code", () => {
    expect(scrubUrl("/game/ABC123")).toBe("/game/[code]");
  });

  it("entfernt den Gruppen-Code", () => {
    expect(scrubUrl("/group/XYZ789")).toBe("/group/[code]");
  });

  it("behält den Rest des Pfades", () => {
    expect(scrubUrl("/game/ABC123/runde/2")).toBe("/game/[code]/runde/2");
  });

  it("behält die Query, ohne den Code preiszugeben", () => {
    expect(scrubUrl("/game/ABC123?tab=stats")).toBe("/game/[code]?tab=stats");
  });

  it("lässt Seiten ohne Code unverändert", () => {
    expect(scrubUrl("/")).toBe("/");
    expect(scrubUrl("/impressum")).toBe("/impressum");
  });

  it("greift nur am Pfadanfang, nicht in einem Query-Wert", () => {
    expect(scrubUrl("/impressum?from=/game/ABC123")).toBe(
      "/impressum?from=/game/ABC123",
    );
  });
});
