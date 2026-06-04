import { getBackendBaseUrl } from "@/lib/api";
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
    return Response.json(
      {
        error: getMissingUploadKeyMessage(),
        envPresent: {
          UPLOAD_API_KEY: Boolean(process.env.UPLOAD_API_KEY?.trim()),
          TOKEN: Boolean(process.env.TOKEN?.trim()),
        },
        fix: "Aggiungi UPLOAD_API_KEY e TOKEN in .env.local + EnvironmentFile=/home/andrea/fotomatrimonio/.env.local in foto-sito.service, poi npm run build e restart.",
      },
      { status: 500 }
    );
  }

  let baseUrl: string;
  try {
    baseUrl = getBackendBaseUrl();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend URL non configurata.";
    return Response.json({ error: message }, { status: 500 });
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
            : "(non ricevuto — riavvia npm run start:upload)";
        const received =
          typeof data.receivedAuthorization === "string"
            ? data.receivedAuthorization
            : null;
        return Response.json(
          {
            error: formatTokenMismatchMessage(uploadKey, piToken, received),
            uploadApiKey: uploadKey,
            expectedToken: piToken,
            receivedAuthorization: received,
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
  raspberryToken: string,
  receivedAuthorization: string | null
): string {
  let msg =
    `Token rifiutato (401). UPLOAD_API_KEY che ha valore di: "${uploadApiKey}" ` +
    `deve essere identica a TOKEN sul Raspberry che ha valore di: "${raspberryToken}".`;

  if (receivedAuthorization) {
    msg += ` Ricevuto dal server upload: "${receivedAuthorization}".`;
  }

  if (receivedAuthorization === "(mancante)") {
    msg +=
      " L'header Authorization non è arrivato all'upload API: la richiesta NON passa dal proxy Next (controlla nginx — solo proxy_pass :3000, mai :3001 per /api/upload). Apri /api/env-debug";
  }

  if (
    uploadApiKey &&
    raspberryToken &&
    uploadApiKey === raspberryToken &&
    receivedAuthorization !== `Bearer ${uploadApiKey}`
  ) {
    msg +=
      " I valori coincidono ma l'header non è corretto: riavvia foto-sito (npm run build) e verifica EnvironmentFile=.env.local nel service systemd.";
  }

  return msg;
}
