import { UploadForm } from "@/components/UploadForm";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("../site.config.js") as {
  title: string;
  eyebrow: string;
  lead: string;
  footer: string;
};

export default function HomePage() {
  return (
    <main className="page">
      <article className="card">
        <header className="header">
          <p className="eyebrow">{site.eyebrow}</p>
          <h1 className="title">{site.title}</h1>
          <p className="lead">{site.lead}</p>
        </header>
        <UploadForm />
      </article>
      <footer className="footer">{site.footer}</footer>
    </main>
  );
}
