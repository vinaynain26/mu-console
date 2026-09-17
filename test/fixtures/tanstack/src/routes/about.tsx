import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/about")({ component: () => <h2>About us</h2> });
