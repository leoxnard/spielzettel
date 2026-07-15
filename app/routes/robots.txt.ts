import { SITE_URL } from "~/lib/seo";

export function loader() {
  const body = `User-agent: *
Allow: /
Disallow: /game/
Disallow: /group/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
