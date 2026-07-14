import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("game/:code", "routes/game.tsx"),
  route("group/:code", "routes/group.tsx"),
  route("impressum", "routes/impressum.tsx"),
] satisfies RouteConfig;
