/**
 * In-memory stand-in for api.sunoapi.org used by the tests and the mock dev
 * server. Mirrors the documented response shapes and status progression.
 */
export function createFakeSuno({ credits = 500, stepMs = 0 } = {}) {
  const tasks = new Map();
  const lyricsTasks = new Map();
  let balance = credits;
  const calls = [];

  function okJson(data) {
    return new Response(JSON.stringify({ code: 200, msg: "success", data }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  function errJson(code, msg) {
    return new Response(JSON.stringify({ code, msg, data: null }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  function track(i, param) {
    return {
      id: `audio_${i}_${Math.random().toString(36).slice(2, 8)}`,
      audio_url: `https://cdn.example/track-${i}.mp3`,
      source_audio_url: "",
      stream_audio_url: `https://cdn.example/stream-${i}`,
      source_stream_audio_url: "",
      image_url: `https://cdn.example/cover-${i}.jpeg`,
      source_image_url: "",
      prompt: param.instrumental ? "" : param.lyrics || "[Verse]\nGenerated lyrics line",
      model_name: "chirp-v6",
      title: param.title || "Generated Song",
      tags: param.style || "pop",
      createTime: "2026-01-01 00:00:00",
      duration: 120 + i * 7,
    };
  }

  async function fetchImpl(url, init = {}) {
    const u = new URL(url);
    const auth = init.headers?.Authorization || init.headers?.authorization || "";
    calls.push({ method: init.method || "GET", path: u.pathname + u.search, body: init.body ? JSON.parse(init.body) : null, auth });
    if (auth !== "Bearer test-key") return errJson(401, "unauthorized");

    if (u.pathname === "/api/v1/generate/credit") return okJson(balance);

    if (u.pathname === "/api/v1/generate" || u.pathname === "/api/v1/generate/extend") {
      const body = JSON.parse(init.body);
      if (!body.callBackUrl) return errJson(400, "callBackUrl required");
      if (balance < 10) return errJson(429, "insufficient credits");
      balance -= 10;
      const taskId = `task_${tasks.size + 1}`;
      tasks.set(taskId, { param: body, createdAt: Date.now(), op: u.pathname.endsWith("extend") ? "extend" : "generate" });
      return okJson({ taskId });
    }

    if (u.pathname === "/api/v1/generate/record-info") {
      const t = tasks.get(u.searchParams.get("taskId"));
      if (!t) return errJson(400, "task not found");
      const age = Date.now() - t.createdAt;
      const stage = stepMs === 0 ? 3 : Math.min(3, Math.floor(age / stepMs));
      const status = ["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS", "SUCCESS"][stage];
      const sunoData = stage >= 2 ? [track(1, t.param)] : [];
      if (stage >= 3) sunoData.push(track(2, t.param));
      return okJson({
        taskId: u.searchParams.get("taskId"),
        parentMusicId: "",
        param: JSON.stringify(t.param),
        response: { taskId: u.searchParams.get("taskId"), sunoData },
        status,
        type: "GENERATE",
        operationType: t.op,
        errorCode: null,
        errorMessage: null,
      });
    }

    if (u.pathname === "/api/v1/lyrics") {
      const body = JSON.parse(init.body);
      const taskId = `lyr_${lyricsTasks.size + 1}`;
      lyricsTasks.set(taskId, { prompt: body.prompt, createdAt: Date.now() });
      return okJson({ taskId });
    }

    if (u.pathname === "/api/v1/lyrics/record-info") {
      const t = lyricsTasks.get(u.searchParams.get("taskId"));
      if (!t) return errJson(400, "task not found");
      const done = stepMs === 0 || Date.now() - t.createdAt > stepMs;
      return okJson({
        taskId: u.searchParams.get("taskId"),
        param: JSON.stringify({ prompt: t.prompt }),
        response: done ? {
          taskId: u.searchParams.get("taskId"),
          data: [
            { text: `[Verse]\nAbout: ${t.prompt}\n\n[Chorus]\nSing it loud`, title: "Variation One", status: "complete", errorMessage: "" },
            { text: `[Verse]\nAnother take on ${t.prompt}`, title: "Variation Two", status: "complete", errorMessage: "" },
          ],
        } : null,
        status: done ? "SUCCESS" : "PENDING",
        type: "LYRICS",
        errorCode: null,
        errorMessage: null,
      });
    }

    return errJson(404, "not found");
  }

  return { fetch: fetchImpl, calls, tasks, get balance() { return balance; } };
}
