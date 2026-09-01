import { useEffect } from "react";
import { useLocation } from "react-router";

import {
  trackPageView,
  UMAMI_DOMAINS,
  UMAMI_SRC,
  UMAMI_WEBSITE_ID,
} from "~/lib/analytics";

/**
 * Lädt den Umami-Tracker und meldet Seitenaufrufe selbst.
 *
 * `data-auto-track="false"` ist der entscheidende Teil: Umami würde sonst die
 * History-API selbst mitschneiden und dabei die volle URL senden — inklusive
 * Spiel-Code. Stattdessen zählen wir hier von Hand und schicken nur den durch
 * `scrubUrl` bereinigten Pfad.
 */
export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <script
      defer
      src={UMAMI_SRC}
      data-website-id={UMAMI_WEBSITE_ID}
      data-domains={UMAMI_DOMAINS}
      data-auto-track="false"
    />
  );
}
