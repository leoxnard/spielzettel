import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Analytics } from "@vercel/analytics/react";

import type { Route } from "./+types/root";
import "./app.css";
import { Footer } from "~/components/layout/Footer";
import { Header } from "~/components/layout/Header";
import { t } from "~/i18n/de";
import { THEME_SCRIPT } from "~/lib/theme";
import { warmUpDatabase } from "~/lib/warmup";

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#177e63"/><rect x="7" y="4.5" width="10" height="15" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  );

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: FAVICON, type: "image/svg+xml" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Fraunces:opsz,wght@9..144,500..700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#177e63" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="flex min-h-svh flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}

export default function App() {
  // Warm the (possibly paused) database while the user is still on a
  // Supabase-free page, so the first real call isn't a cold start.
  useEffect(() => {
    warmUpDatabase();
  }, []);
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  let stack: string | undefined;
  if (import.meta.env.DEV && error instanceof Error) {
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-5xl font-semibold">
        {notFound ? "404" : t.error.title}
      </h1>
      <p className="text-muted">
        {notFound ? t.error.notFound : t.error.generic}
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90"
      >
        {t.error.backHome}
      </Link>
      {stack && (
        <pre className="mt-6 w-full overflow-x-auto rounded-xl bg-surface p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
