import {
  getBearerAuthorizationValue,
  getMissingUploadKeyMessage,
  getUploadApiKey,
  hasUploadApiKey,
} from "@/lib/backend-auth";
import { UPLOAD_FILE_FIELD } from "@/lib/upload-field";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasUploadApiKey()) {
    return Response.json({ error: getMissingUploadKeyMessage() }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return Response.json(
      { error: "NEXT_PUBLIC_API_BASE_URL non configurata." },
      { status: 500 }
    );
  }

  const authorization = getBearerAuthorizationValue();
  if (!authorization) {
    return Response.json({ error: "UPLOAD_API_KEY non valida." }, { status: 500 });
  }

  try {
    const incoming = await request.formData();
    const outgoing = new FormData();

    for (const file of incoming.getAll(UPLOAD_FILE_FIELD)) {
      if (file instanceof File) {
        outgoing.append(UPLOAD_FILE_FIELD, file, file.name);
      }
    }

    for (const [key, value] of incoming.entries()) {
      if (key === UPLOAD_FILE_FIELD || value instanceof File) {
        continue;
      }
      outgoing.append(key, String(value));
    }

    const backendResponse = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: {
        Authorization: authorization,
      },
      body: outgoing,
    });

    const contentType = backendResponse.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await backendResponse.json()) as Record<string, unknown>;

      if (backendResponse.status === 401) {
        const uploadKey = getUploadApiKey() ?? "";
        const piToken =
          typeof data.expectedToken === "string"
            ? data.expectedToken
            : "(non ricevuto — nginx senza Authorization o server.js da aggiornare sul Pi)";
        return Response.json(
          {
            error: formatTokenMismatchMessage(uploadKey, piToken),
            uploadApiKey: uploadKey,
            expectedToken: piToken,
          },
          { status: 401 }
        );
      }

      return Response.json(data, { status: backendResponse.status });
    }

    const text = await backendResponse.text();
    return new Response(text || null, {
      status: backendResponse.status,
      headers: contentType ? { "content-type": contentType } : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore proxy upload";
    return Response.json({ error: message }, { status: 502 });
  }
}

function formatTokenMismatchMessage(
  uploadApiKey: string,
  raspberryToken: string
): string {
  return (
    `Token rifiutato (401). UPLOAD_API_KEY che ha valore di: "${uploadApiKey}" ` +
    `deve essere identica a TOKEN sul Raspberry che ha valore di: "${raspberryToken}".`
  );
}
