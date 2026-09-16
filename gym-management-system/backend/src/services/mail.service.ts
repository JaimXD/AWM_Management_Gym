import "dotenv/config";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Falta configurar ${name} en el backend`);
  }

  return value.trim();
}

const scriptUrl = requiredEnv("GOOGLE_SCRIPT_URL");
const scriptSecret = requiredEnv("GOOGLE_SCRIPT_SECRET");

interface VerificationEmail {
  email: string;
  code: string;
  expiresAt: Date;
}

interface ScriptResponse {
  ok?: boolean;
  code?: string;
}

function mailError(code: string, responseCode?: number) {
  return Object.assign(
    new Error("No se pudo confirmar el envío mediante Google"),
    {
      code,
      responseCode,
      command: "APPS_SCRIPT",
    }
  );
}

export async function sendVerificationEmail({
  email,
  code,
  expiresAt,
}: VerificationEmail): Promise<void> {
  let response: Response;

  try {
    response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: scriptSecret,
        email,
        code,
        expiresAt: expiresAt.toISOString(),
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw mailError("GOOGLE_CONNECTION_FAILED");
  }

  if (!response.ok) {
    throw mailError("GOOGLE_HTTP_ERROR", response.status);
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw mailError("GOOGLE_INVALID_RESPONSE", response.status);
  }

  let result: ScriptResponse | null;

  try {
    result = (await response.json()) as ScriptResponse | null;
  } catch {
    throw mailError("GOOGLE_INVALID_JSON", response.status);
  }

  if (result?.ok !== true) {
    throw mailError(
      typeof result?.code === "string"
        ? result.code
        : "GOOGLE_SEND_FAILED"
    );
  }
}