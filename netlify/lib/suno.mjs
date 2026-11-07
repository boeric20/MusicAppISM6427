/**
 * Thin server-side client for the sunoapi.org REST API.
 * Docs: https://docs.sunoapi.org/
 *
 * The API key never leaves the server. Every browser request goes through a
 * Netlify Function that uses this module to talk to Suno.
 */

const DEFAULT_BASE = "https://api.sunoapi.org";

export const MODELS = ["V6", "V6_WILD", "V6_MINI"];

/** Error codes documented in the Suno OpenAPI spec, mapped to readable text. */
const CODE_MESSAGES = {
  400: "Invalid parameters.",
  401: "Unauthorized. Check the SUNO_API_KEY environment variable.",
  404: "Invalid request method or path.",
  405: "Rate limit exceeded.",
  413: "Prompt or lyrics too long.",
  429: "Insufficient credits on the Suno account.",
  430: "Too many requests. Wait a moment and try again.",
  455: "Suno is under maintenance.",
  500: "Suno server error.",
};

export class SunoError extends Error {
  constructor(message, { status = 502, code } = {}) {
    super(message);
    this.name = "SunoError";
    this.status = status;
    this.code = code;
  }
}

function apiKey() {
  const key = process.env.SUNO_API_KEY;
  if (!key) {
    throw new SunoError("SUNO_API_KEY is not configured on the server.", { status: 500 });
  }
  return key;
}

function baseUrl() {
  return (process.env.SUNO_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new SunoError(`Suno returned a non-JSON response (HTTP ${res.status}).`, {
      status: 502,
    });
  }

  // Suno reports the real result in payload.code; HTTP status is usually 200.
  const code = payload?.code ?? res.status;
  if (code !== 200) {
    const detail = payload?.msg ? ` ${payload.msg}` : "";
    const message = (CODE_MESSAGES[code] || `Suno error ${code}.`) + detail;
    // Map upstream codes to something a browser can act on.
    const status = code === 401 ? 500 : code === 429 ? 402 : code >= 400 && code < 500 ? 400 : 502;
    throw new SunoError(message.trim(), { status, code });
  }
  return payload.data;
}

/** POST /api/v1/generate -> taskId */
export async function generateMusic(body) {
  const data = await request("/api/v1/generate", { method: "POST", body });
  return data?.taskId;
}

/** POST /api/v1/generate/extend -> taskId */
export async function extendMusic(body) {
  const data = await request("/api/v1/generate/extend", { method: "POST", body });
  return data?.taskId;
}

/** GET /api/v1/generate/record-info?taskId= */
export async function getMusicTask(taskId) {
  return request(`/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
}

/** POST /api/v1/lyrics -> taskId */
export async function generateLyrics(body) {
  const data = await request("/api/v1/lyrics", { method: "POST", body });
  return data?.taskId;
}

/** GET /api/v1/lyrics/record-info?taskId= */
export async function getLyricsTask(taskId) {
  return request(`/api/v1/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`);
}

/** GET /api/v1/generate/credit -> integer */
export async function getCredits() {
  return request("/api/v1/generate/credit");
}
