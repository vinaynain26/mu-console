import Navbar from "@/components/Navbar";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small teams.",
    features: ["Up to 5 team members", "10 automated workflows", "Email support"],
  },
  {
    name: "Professional",
    description: "For growing organizations.",
    features: ["Up to 25 team members", "Unlimited workflows", "Email support"],
  },
];

const Pricing = () => (
  <div>
    <Navbar />
    <h1>
      Pricing that <em className="text-primary">scales</em> with your
      <em className="text-primary"> ambition</em>.
    </h1>
    <p>Choose a plan that fits your team today.</p>
  </div>
);

export default Pricing;
