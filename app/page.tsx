import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="page">
      <article className="card">
        <header className="header">
          <p className="eyebrow">Matrimonio</p>
          <h1 className="title">Le tue foto, per noi</h1>
          <p className="lead">
            Seleziona una o più immagini dalla galleria e inviale in pochi
            secondi. Grazie per aver condiviso questo momento con noi.
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
