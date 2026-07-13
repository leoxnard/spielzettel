# Design-Richtlinien

Referenz: spielzettel.com-Ästhetik — warmes Papier, Tinte, ein Würfel-Akzent.
Alle Regeln hier sind bindend; wer sie ändert, ändert zuerst diese Datei.

## Tokens

Alle Farben liegen als CSS-Variablen in [app/app.css](app/app.css) (`:root` hell,
`.dark` dunkel) und werden über `@theme inline` zu Tailwind-Utilities
(`bg-background`, `text-ink`, …). **Nie Roh-Farben in Komponenten verwenden** —
immer die semantischen Tokens:

| Token           | Bedeutung                                        |
| --------------- | ------------------------------------------------ |
| `background`    | Seitenhintergrund (warmes Creme / Teal-Anthrazit)|
| `surface`       | Karten, Tabellen, Modals                         |
| `ink`           | Primärtext                                       |
| `muted`         | Sekundärtext, Hinweise                           |
| `primary`       | Dunkles Teal-Grün: Aktionen, Links, Fokus        |
| `primary-soft`  | Teal-Tönung: Chips, Hover, Auswahl-Zustände      |
| `accent`        | Bernstein/Ocker: Würfelspiele, „Block starten"   |
| `accent-soft`   | Bernstein-Tönung                                 |
| `field`         | Input-Hintergründe, Tabellen-Zwischenzeilen      |
| `border`        | Hairlines, Kartenränder                          |
| `danger`        | Löschen/Fehler                                   |

Neue Spiele bekommen ihre Identität über `iconClass` in der GameDefinition
(z. B. Kniffel: `bg-accent text-accent-ink`) — keine neuen globalen Farben pro
Spiel, außer die Palette wächst bewusst um ein Token.

## Typografie

- **Display:** Fraunces (500–700) — Headlines, Spielnamen, Summen, Zahlen in
  Auswahl-Buttons. Immer `font-display` + `tracking-tight` bei Größen ≥ 2xl.
- **UI/Body:** Inter — alles andere. `font-sans` ist Default.
- **Codes:** `font-mono` + `tracking-[0.2em]` (Spiel-Codes).
- Sektions-Labels (OBERER TEIL, KATEGORIE, ZWISCHENSUMME): `text-[11px]
  font-semibold uppercase tracking-wider` — das ist die „gedruckter
  Block"-Signatur der Tabellen.

## Form & Abstände

- Karten: `rounded-3xl`, Border `border-border/60`, weicher Doppel-Schatten
  (siehe `Card`). Inputs/Buttons: `rounded-xl`, Pills: `rounded-full`.
- Seitenbreite: `max-w-3xl` zentriert, `px-4`.
- Touch-Ziele: mindestens 44 px (`h-11`+).

## Licht/Dunkel

- Class-Strategie: `.dark` auf `<html>`, gesetzt vor dem Paint durch
  `THEME_SCRIPT` ([app/lib/theme.ts](app/lib/theme.ts)); Präferenz in
  `localStorage.theme`, Fallback System.
- Beide Modi teilen dieselben Token-Namen — Komponenten kennen keinen Modus.

## Motion

- Einträge: `animate-fade-in-up` (Seiten, Karten, gestaffelt via
  `animationDelay`). Modals: Bottom-Sheet `animate-sheet-in` (mobil),
  `animate-pop-in` (Desktop). Live-Punkt: `animate-live-pulse`.
- Alles wird durch die globale `prefers-reduced-motion`-Regel deaktiviert.
- Keine Scroll-Trigger, keine Parallax — der Zettel bleibt ruhig.

## Achtung: transform + fixed

Animationen mit `transform` und `fill-mode: both` machen Eltern zum Containing
Block für `position: fixed`. Overlays gehören deshalb **immer** in das
`Modal`-Component (portalt nach `<body>`), nie selbst gebaut.

## Copy

Alle sichtbaren Strings leben in [app/i18n/de.ts](app/i18n/de.ts) — Komponenten
enthalten keine Literale. Ton: direkt, freundlich, deutsch („du"), Verben statt
Marketing. Buttons sagen, was passiert („Block starten", nicht „Los geht's").
