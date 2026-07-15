import type { MetaDescriptor } from "react-router";

import { t } from "~/i18n/de";

export const SITE_URL = "https://spielzettel.leonardsima.de";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetaOptions = {
  title: string;
  description: string;
  path: string;
  /** Private/dynamic pages (a running game or group) shouldn't be indexed. */
  noindex?: boolean;
};

export function pageMeta({
  title,
  description,
  path,
  noindex,
}: PageMetaOptions): MetaDescriptor[] {
  const url = absoluteUrl(path);
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: t.app.name },
    { property: "og:locale", content: "de_DE" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(noindex
      ? [{ name: "robots", content: "noindex, nofollow" }]
      : []),
  ];
}
