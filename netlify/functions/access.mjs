import { json, checkAccess } from "../lib/http.mjs";

/**
 * GET /api/access -> { required, ok }
 * Lets the front end know whether an access code is configured and whether
 * the one it holds is valid, without spending any Suno credits.
 */
export default async (req) => {
  const required = Boolean(process.env.APP_ACCESS_CODE);
  const denied = required ? checkAccess(req) : null;
  return json({ required, ok: !denied });
};

export const config = { path: "/api/access" };
