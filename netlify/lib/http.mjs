/**
 * Small helpers shared by every function: JSON responses, access gating,
 * body parsing, and the callback URL Suno should notify.
 */
import { SunoError } from "./suno.mjs";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, status);
}

/**
 * Optional shared access code. When APP_ACCESS_CODE is set, the browser must
 * send it in the x-access-code header. This keeps strangers from spending
 * your Suno credits on a public Netlify URL.
 */
export function checkAccess(req) {
  const required = process.env.APP_ACCESS_CODE;
  if (!required) return null;
  const given = req.headers.get("x-access-code") || "";
  if (given !== required) {
    return error("Access code required.", 401, { accessCodeRequired: true });
  }
  return null;
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new SunoError("Request body must be valid JSON.", { status: 400 });
  }
}

/** Where Suno should POST completion events. The app polls, so this is informational. */
export function callbackUrl(req) {
  if (process.env.SUNO_CALLBACK_URL) return process.env.SUNO_CALLBACK_URL;
  const origin = new URL(req.url).origin;
  return `${origin}/api/callback`;
}

/** Wrap a handler so thrown errors become clean JSON responses. */
export function handler(fn, { methods = ["GET"], gated = true } = {}) {
  return async (req, context) => {
    if (!methods.includes(req.method)) {
      return error(`Method ${req.method} not allowed.`, 405);
    }
    if (gated) {
      const denied = checkAccess(req);
      if (denied) return denied;
    }
    try {
      return await fn(req, context);
    } catch (err) {
      if (err instanceof SunoError) {
        return error(err.message, err.status, err.code ? { sunoCode: err.code } : {});
      }
      console.error("Unhandled function error", err);
      return error("Unexpected server error.", 500);
    }
  };
}
