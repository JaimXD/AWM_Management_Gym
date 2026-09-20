import "dotenv/config";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta configurar ${name} en el backend`);
  }

  return value;
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

async function sendScriptEmail(
  data: VerificationEmail,
  purpose: "email-verification" | "password-reset"
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: scriptSecret,
        purpose,
        email: data.email,
        code: data.code,
        expiresAt: data.expiresAt.toISOString(),
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

  const contentType = response.headers.get("content-type") ?? "";

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
        : "GOOGLE_SEND_FAILED",
      response.status
    );
  }
}

// Verificación del correo de un socio.
export function sendVerificationEmail(
  data: VerificationEmail
): Promise<void> {
  return sendScriptEmail(data, "email-verification");
}

// Recuperación de contraseña de una cuenta de acceso.
export function sendPasswordResetEmail(data: {
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  return sendScriptEmail(
    {
      email: data.email,
      code: data.token,
      expiresAt: data.expiresAt,
    },
    "password-reset"
  );
}