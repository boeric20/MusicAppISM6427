/* Studio Suno front end. Talks only to our own Netlify Functions under /api. */

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "studio-suno.jobs.v1";
const ACCESS_KEY = "studio-suno.access";
const THEME_KEY = "studio-suno.theme";
const POLL_MS = 8000;
const TYPICAL_SECONDS = 150; // used only to animate the progress bar

/* ---------- state ---------- */
let mode = "simple";
let jobs = loadJobs();
const timers = new Map();

/* ---------- storage ---------- */
function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveJobs() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs)); } catch { /* ignore */ }
}
function getAccess() {
  try { return localStorage.getItem(ACCESS_KEY) || ""; } catch { return ""; }
}
function setAccess(code) {
  try { localStorage.setItem(ACCESS_KEY, code); } catch { /* ignore */ }
}

/* ---------- api ---------- */
async function api(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  const code = getAccess();
  if (code) headers["x-access-code"] = code;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status}).`);
    err.status = res.status;
    err.accessCodeRequired = Boolean(data?.accessCodeRequired);
    throw err;
  }
  return data;
}

/* ---------- theme ---------- */
function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  applyTheme(saved);
  $("theme-toggle").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  });
})();

/* ---------- character counters and range outputs ---------- */
document.querySelectorAll(".count").forEach((el) => {
  const input = $(el.dataset.for);
  if (!input) return;
  const update = () => { el.textContent = `${input.value.length} / ${input.maxLength}`; };
  input.addEventListener("input", update);
  update();
});
function bindRange(id, outId) {
  const r = $(id), o = $(outId);
  const update = () => { o.textContent = Number(r.value).toFixed(2); };
  r.addEventListener("input", update);
  update();
}
bindRange("c-styleweight", "c-styleweight-out");
bindRange("c-weird", "c-weird-out");

/* ---------- mode toggle ---------- */
function setMode(next) {
  mode = next;
  const simple = next === "simple";
  $("simple-fields").hidden = !simple;
  $("custom-fields").hidden = simple;
  $("mode-simple").classList.toggle("active", simple);
  $("mode-custom").classList.toggle("active", !simple);
  $("mode-simple").setAttribute("aria-selected", String(simple));
  $("mode-custom").setAttribute("aria-selected", String(!simple));
  showFormError("");
}
$("mode-simple").addEventListener("click", () => setMode("simple"));
$("mode-custom").addEventListener("click", () => setMode("custom"));

/* ---------- credits ---------- */
async function refreshCredits() {
  const pill = $("credits");
  const text = $("credits-text");
  try {
    const { credits } = await api("/api/credits");
    text.textContent = `Credits: ${credits.toLocaleString()}`;
    pill.classList.toggle("low", credits < 20);
    pill.classList.remove("err");
  } catch (err) {
    if (err.accessCodeRequired) return requireAccess();
    text.textContent = "Credits: unavailable";
    pill.classList.add("err");
    pill.title = err.message;
  }
}
$("credits").addEventListener("click", refreshCredits);

/* ---------- access code ---------- */
function requireAccess() {
  const dlg = $("access-dialog");
  if (dlg.open) return;
  $("access-error").hidden = true;
  $("access-input").value = "";
  dlg.showModal();
}
$("access-go").addEventListener("click", async () => {
  const code = $("access-input").value.trim();
  if (!code) return;
  setAccess(code);
  try {
    const { ok } = await api("/api/access");
    if (!ok) throw new Error("That code is not correct.");
    $("access-dialog").close();
    refreshCredits();
    resumePolling();
  } catch (err) {
    setAccess("");
    $("access-error").textContent = err.message;
    $("access-error").hidden = false;
  }
});
$("access-dialog").addEventListener("cancel", (e) => e.preventDefault());

/* ---------- form submit ---------- */
function showFormError(msg) {
  const el = $("form-error");
  el.textContent = msg;
  el.hidden = !msg;
}
function readForm() {
  const instrumental = $("instrumental").checked;
  const model = $("model").value;
  if (mode === "simple") {
    return {
      customMode: false,
      instrumental,
      model,
      prompt: $("s-prompt").value,
      style: $("s-style").value,
    };
  }
  return {
    customMode: true,
    instrumental,
    model,
    title: $("c-title").value,
    style: $("c-style").value,
    lyrics: $("c-lyrics").value,
    negativeTags: $("c-negative").value,
    vocalGender: $("c-gender").value,
    duration: $("c-duration").value,
    styleWeight: $("c-styleweight").value,
    weirdnessConstraint: $("c-weird").value,
    variety: $("c-variety").value,
  };
}
function clientValidate(input) {
  if (!input.customMode) {
    if (!input.prompt.trim() && !input.style.trim()) return "Describe the song, or at least give a style.";
    return "";
  }
  if (!input.style.trim() && !input.lyrics.trim() && !input.negativeTags.trim()) {
    return "Custom mode needs a style, lyrics, or exclusions.";
  }
  if (!input.instrumental && !input.lyrics.trim()) return "Add lyrics, or switch on Instrumental.";
  return "";
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = readForm();
  const problem = clientValidate(input);
  if (problem) return showFormError(problem);
  showFormError("");
  const btn = $("submit");
  btn.disabled = true;
  btn.querySelector(".btn-label").textContent = "Starting…";
  try {
    const { taskId, request } = await api("/api/generate", { method: "POST", body: input });
    addJob({
      taskId,
      kind: "generate",
      createdAt: Date.now(),
      label: request.title || summarize(request.prompt || request.style || request.lyrics),
      meta: describeRequest(request),
      status: "PENDING",
      phase: "working",
      tracks: [],
    });
    refreshCredits();
  } catch (err) {
    if (err.accessCodeRequired) requireAccess();
    else showFormError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector(".btn-label").textContent = "Generate";
  }
});

function summarize(text = "") {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t || "Untitled";
}
function describeRequest(r) {
  const parts = [r.model, r.customMode ? "custom" : "simple", r.instrumental ? "instrumental" : "vocals"];
  if (r.style) parts.push(r.style.length > 40 ? `${r.style.slice(0, 37)}…` : r.style);
  return parts.join(" · ");
}

/* ---------- jobs & polling ---------- */
function addJob(job) {
  jobs.unshift(job);
  saveJobs();
  render();
  startPolling(job.taskId);
}
function updateJob(taskId, patch) {
  const j = jobs.find((x) => x.taskId === taskId);
  if (!j) return;
  Object.assign(j, patch);
  saveJobs();
  render();
}
function removeJob(taskId) {
  stopPolling(taskId);
  jobs = jobs.filter((x) => x.taskId !== taskId);
  saveJobs();
  render();
}
function startPolling(taskId) {
  if (timers.has(taskId)) return;
  const tick = async () => {
    const job = jobs.find((x) => x.taskId === taskId);
    if (!job || job.phase !== "working") return stopPolling(taskId);
    try {
      const data = await api(`/api/status?taskId=${encodeURIComponent(taskId)}`);
      updateJob(taskId, {
        status: data.status,
        phase: data.phase,
        tracks: data.tracks,
        error: data.error,
      });
      if (data.phase !== "working") {
        stopPolling(taskId);
        refreshCredits();
      }
    } catch (err) {
      if (err.accessCodeRequired) { stopPolling(taskId); return requireAccess(); }
      updateJob(taskId, { lastError: err.message });
    }
  };
  tick();
  timers.set(taskId, setInterval(tick, POLL_MS));
}
function stopPolling(taskId) {
  const t = timers.get(taskId);
  if (t) clearInterval(t);
  timers.delete(taskId);
}
function resumePolling() {
  jobs.filter((j) => j.phase === "working").forEach((j) => startPolling(j.taskId));
}

/* ---------- render ---------- */
const STATUS_TEXT = {
  PENDING: "Queued. Suno is warming up.",
  TEXT_SUCCESS: "Lyrics and structure written. Composing audio…",
  FIRST_SUCCESS: "First variation finished. Rendering the second…",
  SUCCESS: "Both variations ready.",
};
function progressFor(job) {
  if (job.phase === "done") return 100;
  if (job.phase === "failed") return 100;
  const elapsed = (Date.now() - job.createdAt) / 1000;
  const base = Math.min(85, (elapsed / TYPICAL_SECONDS) * 85);
  const floor = job.status === "FIRST_SUCCESS" ? 70 : job.status === "TEXT_SUCCESS" ? 30 : 8;
  return Math.max(floor, base);
}
function fmtDuration(s) {
  if (!s && s !== 0) return "";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

function render() {
  const wrap = $("jobs");
  wrap.replaceChildren();
  $("empty").hidden = jobs.length > 0;
  const jobT = $("job-template").content;
  const trackT = $("track-template").content;

  for (const job of jobs) {
    const node = jobT.cloneNode(true);
    const el = node.querySelector(".job");
    el.dataset.task = job.taskId;
    el.querySelector(".job-title").textContent = job.label || "Untitled";
    el.querySelector(".job-meta").textContent =
      `${job.kind === "extend" ? "Extension · " : ""}${job.meta || ""} · ${new Date(job.createdAt).toLocaleString()}`;

    const badge = el.querySelector(".badge");
    badge.textContent = job.phase === "done" ? "Ready" : job.phase === "failed" ? "Failed" : "Generating";
    badge.classList.toggle("done", job.phase === "done");
    badge.classList.toggle("failed", job.phase === "failed");

    const bar = el.querySelector(".bar");
    bar.style.width = `${progressFor(job)}%`;
    el.querySelector(".progress").hidden = job.phase !== "working";

    const statusEl = el.querySelector(".job-status");
    if (job.phase === "failed") {
      statusEl.textContent = `Generation failed: ${job.error || job.status}`;
      statusEl.style.color = "var(--danger)";
    } else if (job.phase === "working") {
      statusEl.textContent = job.lastError
        ? `Still working. Last check failed: ${job.lastError}`
        : STATUS_TEXT[job.status] || `Status: ${job.status}`;
    } else {
      statusEl.hidden = true;
    }

    const tracksEl = el.querySelector(".tracks");
    for (const t of job.tracks || []) {
      if (!t.audioUrl && !t.streamUrl) continue;
      const tn = trackT.cloneNode(true);
      const card = tn.querySelector(".track-card");
      const img = card.querySelector(".cover");
      if (t.imageUrl) img.src = t.imageUrl; else img.remove();
      card.querySelector(".track-title").textContent =
        `${t.title || "Untitled"}${t.duration ? ` · ${fmtDuration(t.duration)}` : ""}`;
      card.querySelector(".track-tags").textContent = t.tags || "";
      const audio = card.querySelector("audio");
      audio.src = t.audioUrl || t.streamUrl;
      const dl = card.querySelector(".download");
      if (t.audioUrl) {
        dl.href = t.audioUrl;
        dl.download = `${(t.title || "track").replace(/[^\w\- ]+/g, "")}.mp3`;
      } else {
        dl.remove();
      }
      card.querySelector(".extend").addEventListener("click", () => openExtend(job, t));
      const lyricsBtn = card.querySelector(".show-lyrics");
      const pre = card.querySelector(".track-lyrics");
      if (t.prompt && t.prompt.trim()) {
        pre.textContent = t.prompt;
        lyricsBtn.addEventListener("click", () => { pre.hidden = !pre.hidden; });
      } else {
        lyricsBtn.remove();
      }
      tracksEl.appendChild(tn);
    }

    el.querySelector(".remove").addEventListener("click", () => removeJob(job.taskId));
    wrap.appendChild(node);
  }
}
$("clear-library").addEventListener("click", () => {
  if (!jobs.length) return;
  if (!confirm("Remove all tracks from this list? Files already downloaded are unaffected.")) return;
  jobs.forEach((j) => stopPolling(j.taskId));
  jobs = [];
  saveJobs();
  render();
});
// Keep progress bars moving between polls.
setInterval(() => {
  if (jobs.some((j) => j.phase === "working")) {
    document.querySelectorAll(".job").forEach((el) => {
      const job = jobs.find((j) => j.taskId === el.dataset.task);
      if (job && job.phase === "working") el.querySelector(".bar").style.width = `${progressFor(job)}%`;
    });
  }
}, 2000);

/* ---------- lyrics assistant ---------- */
let lyricsTimer = null;
$("ai-lyrics").addEventListener("click", () => {
  $("lyrics-results").replaceChildren();
  $("lyrics-status").hidden = true;
  $("lyrics-dialog").showModal();
  $("lyrics-prompt").focus();
});
$("lyrics-dialog").addEventListener("close", () => { if (lyricsTimer) clearInterval(lyricsTimer); lyricsTimer = null; });
$("lyrics-go").addEventListener("click", async () => {
  const prompt = $("lyrics-prompt").value.trim();
  const status = $("lyrics-status");
  const results = $("lyrics-results");
  if (!prompt) { status.textContent = "Describe the song first."; status.hidden = false; return; }
  results.replaceChildren();
  status.innerHTML = '<span class="spinner"></span> Writing lyrics…';
  status.hidden = false;
  $("lyrics-go").disabled = true;
  try {
    const { taskId } = await api("/api/lyrics", { method: "POST", body: { prompt } });
    const poll = async () => {
      try {
        const data = await api(`/api/lyrics/status?taskId=${encodeURIComponent(taskId)}`);
        if (data.phase === "working") return;
        clearInterval(lyricsTimer); lyricsTimer = null;
        $("lyrics-go").disabled = false;
        if (data.phase === "failed") {
          status.textContent = `Lyrics failed: ${data.error || data.status}`;
          return;
        }
        status.hidden = true;
        for (const v of data.variations) {
          const box = document.createElement("div");
          box.className = "lyric-option";
          const h = document.createElement("h4"); h.textContent = v.title || "Untitled";
          const pre = document.createElement("pre"); pre.textContent = v.text;
          const use = document.createElement("button");
          use.type = "button"; use.className = "link-btn"; use.textContent = "Use these lyrics";
          use.addEventListener("click", () => {
            $("c-lyrics").value = v.text;
            $("c-lyrics").dispatchEvent(new Event("input"));
            if (v.title && !$("c-title").value) $("c-title").value = v.title.slice(0, 80);
            $("lyrics-dialog").close();
          });
          box.append(h, pre, use);
          results.appendChild(box);
        }
        if (!data.variations.length) status.textContent = "Suno returned no lyrics. Try a different description.";
      } catch (err) {
        clearInterval(lyricsTimer); lyricsTimer = null;
        $("lyrics-go").disabled = false;
        status.textContent = err.message;
        if (err.accessCodeRequired) requireAccess();
      }
    };
    lyricsTimer = setInterval(poll, 4000);
    poll();
  } catch (err) {
    $("lyrics-go").disabled = false;
    status.textContent = err.message;
    if (err.accessCodeRequired) requireAccess();
  }
});

/* ---------- extend ---------- */
let extendTarget = null;
function openExtend(job, track) {
  extendTarget = { job, track };
  $("extend-source").textContent = `${track.title || "Untitled"}${track.duration ? ` (${fmtDuration(track.duration)})` : ""}`;
  const at = $("extend-at");
  at.max = track.duration ? Math.floor(track.duration) : "";
  at.value = track.duration ? Math.max(1, Math.floor(track.duration) - 10) : "";
  $("extend-lyrics").value = "";
  $("extend-style").value = track.tags || "";
  $("extend-instrumental").checked = !track.prompt;
  $("extend-error").hidden = true;
  $("extend-dialog").showModal();
}
$("extend-go").addEventListener("click", async () => {
  if (!extendTarget) return;
  const { job, track } = extendTarget;
  const body = {
    audioId: track.id,
    taskId: job.taskId,
    model: job.meta?.split(" · ")[0] || $("model").value,
    continueAt: $("extend-at").value,
    lyrics: $("extend-lyrics").value,
    style: $("extend-style").value,
    title: `${track.title || "Track"} (Extended)`.slice(0, 100),
    instrumental: $("extend-instrumental").checked,
  };
  const btn = $("extend-go");
  btn.disabled = true;
  try {
    const { taskId, request } = await api("/api/extend", { method: "POST", body });
    $("extend-dialog").close();
    addJob({
      taskId,
      kind: "extend",
      createdAt: Date.now(),
      label: request.title || `${track.title} (Extended)`,
      meta: describeRequest({ ...request, customMode: true }),
      status: "PENDING",
      phase: "working",
      tracks: [],
    });
    refreshCredits();
  } catch (err) {
    if (err.accessCodeRequired) requireAccess();
    $("extend-error").textContent = err.message;
    $("extend-error").hidden = false;
  } finally {
    btn.disabled = false;
  }
});

/* ---------- boot ---------- */
(async function boot() {
  render();
  try {
    const { required, ok } = await api("/api/access");
    if (required && !ok) { requireAccess(); return; }
  } catch { /* network issue; fall through and let later calls surface it */ }
  refreshCredits();
  resumePolling();
})();
