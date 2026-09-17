import { Outlet, createRootRoute } from "@tanstack/react-router";
import Nav from "@/components/Nav";

export const Route = createRootRoute({
  head: () => ({ meta: [{ name: "twitter:card", content: "summary_large_image" }, { title: "Masters Union - Home" }] }),
  component: () => (
    <>
      <Nav />
      <Outlet />
    </>
  ),
});
