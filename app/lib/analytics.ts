/**
 * Umami, selbst gehostet auf analytics.leonardsima.de. Die Instanz läuft auf
 * derselben Maschine wie die App, es verlässt also nichts unsere Infrastruktur.
 *
 * Website-ID und Host stehen bewusst hier und nicht in einer Env-Variable: die
 * ID ist ohnehin im ausgelieferten HTML sichtbar, und so muss beim Deploy
 * nichts konfiguriert werden. `UMAMI_DOMAINS` sorgt dafür, dass ein lokaler
 * Dev-Server oder eine Vorschau nicht in der Statistik landet.
 *
 * REGEL — niemals personenbezogene Daten in ein Event. Keine Spielernamen,
 * keine Spiel-Codes. Nur Zähler und grobe Kategorien.
 */

export const UMAMI_SRC = "https://analytics.leonardsima.de/script.js";
export const UMAMI_WEBSITE_ID = "ab425a0b-8d66-41d2-93f4-9ad3fa8550e2";
export const UMAMI_DOMAINS = "spielzettel.leonardsima.de";

/**
 * Ersetzt den Spiel- bzw. Gruppen-Code im Pfad durch einen Platzhalter.
 *
 * Der Code ist der einzige Zugangsschutz einer Runde — wer ihn hat, darf
 * mitschreiben. Er darf deshalb nicht in der Statistik auftauchen, auch nicht
 * auf unserem eigenen Server. Gezählt wird, dass eine Spielseite aufgerufen
 * wurde, nicht welche.
 */
export function scrubUrl(url: string): string {
  return url.replace(/^\/(game|group)\/[^/?#]+/, "/$1/[code]");
}

type EventData = Record<string, string | number | boolean>;

type UmamiPayload = { url: string; referrer: string; [key: string]: unknown };

declare global {
  interface Window {
    umami?: {
      track: {
        (event: string, data?: EventData): void;
        (payload: (props: UmamiPayload) => UmamiPayload): void;
      };
    };
  }
}

/**
 * Führt `fn` aus, sobald der Tracker geladen ist. Ist das Script noch
 * unterwegs, wird auf sein `load`-Event gewartet; fehlt es ganz (Blocker,
 * lokale Entwicklung), passiert nichts.
 */
function withUmami(fn: (umami: NonNullable<Window["umami"]>) => void): void {
  if (typeof window === "undefined") return;
  if (window.umami) {
    fn(window.umami);
    return;
  }
  const script = document.querySelector<HTMLScriptElement>(
    `script[data-website-id="${UMAMI_WEBSITE_ID}"]`,
  );
  if (!script) return;
  script.addEventListener(
    "load",
    () => {
      if (window.umami) fn(window.umami);
    },
    { once: true },
  );
}

/** Meldet einen Seitenaufruf mit bereinigter URL. */
export function trackPageView(url: string): void {
  const clean = scrubUrl(url);
  withUmami((umami) => {
    try {
      umami.track((props) => ({ ...props, url: clean }));
    } catch {
      // Messung darf das Spiel nie stören.
    }
  });
}

/** Meldet ein benanntes Event. Ohne Tracker ein No-op. */
export function track(event: string, data?: EventData): void {
  withUmami((umami) => {
    try {
      umami.track(event, data);
    } catch {
      // s. o.
    }
  });
}
