import { handler, json, readJson, callbackUrl } from "../lib/http.mjs";
import { buildExtendBody } from "../lib/validate.mjs";
import { extendMusic } from "../lib/suno.mjs";

/** POST /api/extend  -> { taskId, request } */
export default handler(
  async (req) => {
    const input = await readJson(req);
    const body = buildExtendBody(input, callbackUrl(req));
    const taskId = await extendMusic(body);
    if (!taskId) throw new Error("Suno did not return a taskId.");
    const { callBackUrl, ...echo } = body;
    return json({ taskId, request: echo });
  },
  { methods: ["POST"] }
);

export const config = { path: "/api/extend" };
