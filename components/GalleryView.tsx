"use client";

import { useCallback, useEffect, useState } from "react";

type GalleryFile = {
  name: string;
  size: number;
  mtime: string;
  kind: "image" | "video";
};

type ViewState = "loading" | "login" | "gallery";

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fileUrl(name: string): string {
  return `/api/gallery/file/${encodeURIComponent(name)}`;
}

export function GalleryView() {
  const [view, setView] = useState<ViewState>("loading");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GalleryFile | null>(null);

  const loadFiles = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/gallery/list", { credentials: "include" });
    if (res.status === 401) {
      setView("login");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoadError(
        (data as { message?: string }).message ??
          "Impossibile caricare l'elenco foto."
      );
      return;
    }
    const data = (await res.json()) as { files: GalleryFile[] };
    setFiles(data.files ?? []);
    setView("gallery");
  }, []);

  useEffect(() => {
    fetch("/api/gallery/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) {
          return loadFiles();
        }
        setView("login");
      })
      .catch(() => setView("login"));
  }, [loadFiles]);

  const onLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/gallery/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setLoginError("Utente o password non validi.");
      return;
    }
    setPassword("");
    await loadFiles();
  };

  const onLogout = async () => {
    await fetch("/api/gallery/logout", {
      method: "POST",
      credentials: "include",
    });
    setFiles([]);
    setLightbox(null);
    setView("login");
  };

  if (view === "loading") {
    return (
      <p className="gallery-status" role="status">
        Caricamento…
      </p>
    );
  }

  if (view === "login") {
    return (
      <form className="gallery-login" onSubmit={onLogin}>
        <h1 className="gallery-title">Album caricati</h1>
        <p className="gallery-lead">Accesso riservato</p>
        <label className="field-label" htmlFor="gallery-user">
          Utente
        </label>
        <input
          id="gallery-user"
          className="text-input"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label className="field-label" htmlFor="gallery-pass">
          Password
        </label>
        <input
          id="gallery-pass"
          className="text-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {loginError ? (
          <p className="status-error" role="alert">
            {loginError}
          </p>
        ) : null}
        <button type="submit" className="btn-primary">
          Accedi
        </button>
      </form>
    );
  }

  return (
    <div className="gallery-panel">
      <header className="gallery-header">
        <div>
          <h1 className="gallery-title">Album caricati</h1>
          <p className="gallery-meta">
            {files.length === 0
              ? "Nessun file ancora."
              : `${files.length} file`}
          </p>
        </div>
        <button type="button" className="btn-text gallery-logout" onClick={onLogout}>
          Esci
        </button>
      </header>

      {loadError ? (
        <p className="status-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {files.length === 0 && !loadError ? (
        <p className="gallery-empty">La cartella upload è vuota.</p>
      ) : (
        <ul className="gallery-grid">
          {files.map((file) => (
            <li key={file.name}>
              <button
                type="button"
                className="gallery-thumb"
                onClick={() => setLightbox(file)}
              >
                {file.kind === "video" ? (
                  <video
                    src={fileUrl(file.name)}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(file.name)} alt="" loading="lazy" />
                )}
                <span className="gallery-thumb-label">
                  {formatDate(file.mtime)} · {formatSize(file.size)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn-text gallery-refresh" onClick={loadFiles}>
        Aggiorna elenco
      </button>

      {lightbox ? (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <div
            className="gallery-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="Chiudi"
            >
              ×
            </button>
            {lightbox.kind === "video" ? (
              <video
                src={fileUrl(lightbox.name)}
                controls
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(lightbox.name)} alt={lightbox.name} />
            )}
            <p className="gallery-lightbox-caption">
              {lightbox.name} · {formatSize(lightbox.size)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
