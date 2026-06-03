import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="page">
      <article className="card">
        <header className="header">
          <p className="eyebrow">Condividi le tue foto</p>
          <h1 className="title">Matrimonio Andrea e Francesca</h1>
          <p className="lead">
            Seleziona una o più immagini dalla galleria e inviale in pochi
            secondi. Grazie per essere con noi in questo giorno speciale.
          </p>
        </header>
        <UploadForm />
      </article>
      <footer className="footer">
        Le foto vengono inviate in modo sicuro al nostro album.
      </footer>
    </main>
  );
}
