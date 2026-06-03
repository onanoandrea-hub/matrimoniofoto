"use client";

import { useCallback, useRef, useState } from "react";
import {
  uploadPhotos,
  type UploadStatus,
} from "@/lib/upload-client";

function filesFromInput(input: HTMLInputElement | null): File[] {
  if (!input?.files?.length) {
    return [];
  }
  return Array.from(input.files);
}

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const onFilesChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = filesFromInput(event.target);
      setFiles(selected);
      setStatus("idle");
      setFeedback(null);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setFiles([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setStatus("idle");
    setFeedback(null);
    setUploadProgress(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const filesToUpload = filesFromInput(inputRef.current);
      if (filesToUpload.length === 0) {
        setStatus("error");
        setFeedback("Seleziona almeno una foto.");
        return;
      }

      setStatus("uploading");
      setFeedback(null);
      setUploadProgress(
        filesToUpload.length > 1
          ? `Invio foto 1 di ${filesToUpload.length}…`
          : null
      );

      try {
        const result = await uploadPhotos({
          files: filesToUpload,
          guestName,
          message,
          onProgress: (current, total) => {
            setUploadProgress(
              total > 1 ? `Invio foto ${current} di ${total}…` : null
            );
          },
        });
        setUploadProgress(null);
        if (result.ok) {
          setStatus("success");
          setFeedback(result.message);
          clearSelection();
          setGuestName("");
          setMessage("");
        } else {
          setStatus("error");
          setFeedback(result.message);
        }
      } catch {
        setUploadProgress(null);
        setStatus("error");
        setFeedback(
          "Errore di rete. Controlla la connessione e riprova."
        );
      }
    },
    [guestName, message, clearSelection]
  );

  const isUploading = status === "uploading";
  const canSubmit = files.length > 0 && !isUploading;

  return (
    <form className="upload-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="photos" className="field-label">
          Le tue foto
        </label>
        <p className="field-hint">
          Puoi selezionare più immagini dalla galleria del telefono.
        </p>
        <input
          ref={inputRef}
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          className="file-input"
          onChange={onFilesChange}
          disabled={isUploading}
        />
      </div>

      {files.length > 0 && (
        <div className="file-preview" aria-live="polite">
          <p className="file-preview-title">
            {files.length}{" "}
            {files.length === 1 ? "file selezionato" : "file selezionati"}
          </p>
          <ul className="file-list">
            {files.map((file, index) => (
              <li
                key={`${index}-${file.name}-${file.size}-${file.lastModified}`}
              >
                {file.name}
                <span className="file-size">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-text"
            onClick={clearSelection}
            disabled={isUploading}
          >
            Svuota selezione
          </button>
        </div>
      )}

      <div className="field optional">
        <label htmlFor="guestName" className="field-label">
          Nome e cognome <span className="optional-tag">(opzionale)</span>
        </label>
        <input
          id="guestName"
          name="guestName"
          type="text"
          autoComplete="name"
          placeholder="Es. Marco Rossi"
          className="text-input"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          disabled={isUploading}
        />
      </div>

      <div className="field optional">
        <label htmlFor="message" className="field-label">
          Messaggio <span className="optional-tag">(opzionale)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder="Un augurio per gli sposi…"
          className="text-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isUploading}
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={!canSubmit}
        aria-busy={isUploading}
      >
        {isUploading ? "Caricamento in corso…" : "Invia foto"}
      </button>

      <div className="status" role="status" aria-live="polite">
        {isUploading && (
          <p className="status-uploading">
            <span className="spinner" aria-hidden="true" />
            {uploadProgress ??
              "Stiamo inviando le tue foto, attendi qualche secondo."}
          </p>
        )}
        {status === "success" && feedback && (
          <p className="status-success">{feedback}</p>
        )}
        {status === "error" && feedback && (
          <p className="status-error">{feedback}</p>
        )}
      </div>
    </form>
  );
}
