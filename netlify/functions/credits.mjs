import { handler, json } from "../lib/http.mjs";
import { getCredits } from "../lib/suno.mjs";

/** GET /api/credits -> { credits } */
export default handler(async () => {
  const credits = await getCredits();
  return json({ credits: typeof credits === "number" ? credits : Number(credits) || 0 });
});

export const config = { path: "/api/credits" };
