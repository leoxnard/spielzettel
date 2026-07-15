import { SITE_URL } from "~/lib/seo";

const PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/impressum", changefreq: "yearly", priority: "0.3" },
];

export function loader() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
