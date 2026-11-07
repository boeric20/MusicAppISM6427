import { handler, json, readJson, callbackUrl } from "../lib/http.mjs";
import { buildGenerateBody } from "../lib/validate.mjs";
import { generateMusic } from "../lib/suno.mjs";

/** POST /api/generate  -> { taskId, request } */
export default handler(
  async (req) => {
    const input = await readJson(req);
    const body = buildGenerateBody(input, callbackUrl(req));
    const taskId = await generateMusic(body);
    if (!taskId) throw new Error("Suno did not return a taskId.");
    const { callBackUrl, ...echo } = body;
    return json({ taskId, request: echo });
  },
  { methods: ["POST"] }
);

export const config = { path: "/api/generate" };
