import { createFileRoute } from "@tanstack/react-router";
import Eyebrow from "@/components/Eyebrow";

const stats = [
  { label: "Offers per student", value: "3.03×", className: "text-lg" },
  { label: "Median package", value: "₹45L", status: true ? "Round closed" : "Apply now" },
];

export const Route = createFileRoute("/")({
  component: () => (
    <main>
      <Eyebrow text="Placements" />
      <h1>
        Find your <em>Path.</em>
      </h1>
      <p>Empower your operations with an intelligent platform.</p>
      <img src="/x.png" alt="Campus at dusk" />
      {stats.map((s) => <div key={s.label}>{s.label} {s.value}</div>)}
    </main>
  ),
});
