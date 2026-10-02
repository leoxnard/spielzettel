import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("game/:code", "routes/game.tsx"),
  route("group/:code", "routes/group.tsx"),
  route("katalog", "routes/catalog.tsx"),
  route("katalog/:slug", "routes/catalog-game.tsx"),
  route("impressum", "routes/impressum.tsx"),
  route("robots.txt", "routes/robots.txt.ts"),
  route("sitemap.xml", "routes/sitemap.xml.ts"),
] satisfies RouteConfig;
