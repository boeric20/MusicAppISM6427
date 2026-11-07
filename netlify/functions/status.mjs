import { handler, json, error } from "../lib/http.mjs";
import { getMusicTask } from "../lib/suno.mjs";

const DONE = new Set(["SUCCESS"]);
const FAILED = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

/** Normalise a Suno track object for the browser. */
function track(t) {
  return {
    id: t.id,
    title: t.title || "Untitled",
    tags: t.tags || "",
    prompt: t.prompt || "",
    duration: typeof t.duration === "number" ? t.duration : Number(t.duration) || null,
    audioUrl: t.audio_url || t.source_audio_url || "",
    streamUrl: t.stream_audio_url || t.source_stream_audio_url || "",
    imageUrl: t.image_url || t.source_image_url || "",
    model: t.model_name || "",
    createdAt: t.createTime || "",
  };
}

/** GET /api/status?taskId=...  -> { taskId, status, phase, tracks, error } */
export default handler(async (req) => {
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return error("taskId query parameter is required.");

  const data = await getMusicTask(taskId);
  const status = data?.status || "PENDING";
  const tracks = (data?.response?.sunoData || []).map(track);

  let phase = "working";
  if (DONE.has(status)) phase = "done";
  else if (FAILED.has(status)) phase = "failed";

  return json({
    taskId,
    status,
    phase,
    operation: data?.operationType || "generate",
    tracks,
    error: phase === "failed" ? data?.errorMessage || status : null,
  });
});

export const config = { path: "/api/status" };
