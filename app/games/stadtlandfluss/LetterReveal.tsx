import { createPortal } from "react-dom";

import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";

interface LetterRevealProps {
  letter: string;
  spinning: boolean;
}

/**
 * Full-screen "drum roll" shown while a new round's letter is drawn.
 * Portaled to <body> for the same reason as Modal: a transform on an
 * ancestor must never become the containing block for this overlay.
 */
export function LetterReveal({ letter, spinning }: LetterRevealProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/75 backdrop-blur-sm animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
        {spinning ? t.slf.drawingLetter : t.slf.letter}
      </p>
      <span
        key={spinning ? "spin" : letter}
        className={cx(
          "flex size-40 items-center justify-center rounded-[2.5rem] bg-accent font-display text-8xl font-bold text-accent-ink shadow-2xl sm:size-48 sm:text-9xl",
          !spinning && "animate-pop-in",
        )}
      >
        {letter}
      </span>
    </div>,
    document.body,
  );
}
