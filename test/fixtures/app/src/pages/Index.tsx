import Navbar from "@/components/Navbar";

const features = [
  { n: "01", title: "Automated Workflows", desc: "Streamline complex processes with intelligent automation." },
  { n: "02", title: "Robust Security", desc: "State-of-the-art encryption keeps your data compliant." },
];

const Index = () => {
  return (
    <div>
      <Navbar />
      <h1 className="hero">
        Welcome to SecureFlow.
        <br /> Engineered for Precision.
      </h1>
      <p>{"Empower your operations with an intelligent platform."}</p>
      <p>{`Template copy without holes`}</p>
      <img src="/x.png" alt="SecureFlow dashboard preview" />
      <a href="#contact">Request Demo</a>
      <a href="#features">Request Demo</a>
      {features.map((f) => (
        <article key={f.n}><h3>{f.title}</h3><p>{f.desc}</p></article>
      ))}
    </div>
  );
};

export default Index;
