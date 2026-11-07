import { handler, json, readJson, callbackUrl } from "../lib/http.mjs";
import { buildLyricsBody } from "../lib/validate.mjs";
import { generateLyrics } from "../lib/suno.mjs";

/** POST /api/lyrics  -> { taskId } */
export default handler(
  async (req) => {
    const input = await readJson(req);
    const body = buildLyricsBody(input, callbackUrl(req));
    const taskId = await generateLyrics(body);
    if (!taskId) throw new Error("Suno did not return a taskId.");
    return json({ taskId });
  },
  { methods: ["POST"] }
);

export const config = { path: "/api/lyrics" };
