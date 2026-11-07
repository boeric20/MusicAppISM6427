import { handler, json, error } from "../lib/http.mjs";
import { getLyricsTask } from "../lib/suno.mjs";

const FAILED = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_LYRICS_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

/** GET /api/lyrics/status?taskId=...  -> { taskId, status, phase, variations, error } */
export default handler(async (req) => {
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return error("taskId query parameter is required.");

  const data = await getLyricsTask(taskId);
  const status = data?.status || "PENDING";
  const variations = (data?.response?.data || [])
    .filter((v) => v && v.status !== "failed" && v.text)
    .map((v) => ({ title: v.title || "", text: v.text }));

  let phase = "working";
  if (status === "SUCCESS") phase = "done";
  else if (FAILED.has(status)) phase = "failed";

  return json({
    taskId,
    status,
    phase,
    variations,
    error: phase === "failed" ? data?.errorMessage || status : null,
  });
});

export const config = { path: "/api/lyrics/status" };
