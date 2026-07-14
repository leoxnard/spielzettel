import { Link } from "react-router";

import { t } from "~/i18n/de";

export function Footer() {
  return (
    <footer className="px-4 py-8 text-center text-xs text-muted">
      © {new Date().getFullYear()} {t.app.name} · {t.app.tagline}
      {" · "}
      <Link to="/impressum" className="hover:underline">
        {t.impressum.title}
      </Link>
    </footer>
  );
}
