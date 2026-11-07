import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createFakeSuno } from "./fake-suno.mjs";

const fake = createFakeSuno();
const realFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = fake.fetch;
  process.env.SUNO_API_KEY = "test-key";
  delete process.env.APP_ACCESS_CODE;
});
after(() => { globalThis.fetch = realFetch; });

const generate = (await import("../netlify/functions/generate.mjs")).default;
const status = (await import("../netlify/functions/status.mjs")).default;
const lyrics = (await import("../netlify/functions/lyrics.mjs")).default;
const lyricsStatus = (await import("../netlify/functions/lyrics-status.mjs")).default;
const credits = (await import("../netlify/functions/credits.mjs")).default;
const extend = (await import("../netlify/functions/extend.mjs")).default;
const access = (await import("../netlify/functions/access.mjs")).default;
const callback = (await import("../netlify/functions/callback.mjs")).default;
const { buildGenerateBody } = await import("../netlify/lib/validate.mjs");

const ORIGIN = "https://studio.example.netlify.app";
const post = (path, body, headers = {}) =>
  new Request(ORIGIN + path, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } });
const get = (path, headers = {}) => new Request(ORIGIN + path, { headers });

test("credits proxies the balance", async () => {
  const res = await credits(get("/api/credits"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { credits: 500 });
});

test("simple mode generate sends only legal fields and the callback URL", async () => {
  const res = await generate(post("/api/generate", {
    customMode: false, instrumental: false, model: "V6",
    prompt: "A chill lo-fi beat", style: "lo-fi", title: "SHOULD BE DROPPED", negativeTags: "drop me", duration: 60,
  }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.match(data.taskId, /^task_/);
  const sent = fake.calls.at(-1).body;
  assert.equal(sent.customMode, false);
  assert.equal(sent.prompt, "A chill lo-fi beat");
  assert.equal(sent.style, "lo-fi");
  assert.equal(sent.callBackUrl, `${ORIGIN}/api/callback`);
  assert.equal(sent.title, undefined);
  assert.equal(sent.negativeTags, undefined);
  assert.equal(sent.duration, undefined);
  assert.equal(data.request.callBackUrl, undefined, "callback URL is not echoed to the browser");
});

test("custom mode generate keeps custom-only fields and rounds numbers", async () => {
  const res = await generate(post("/api/generate", {
    customMode: true, instrumental: false, model: "V6_WILD", title: "Dusk", style: "folk",
    lyrics: "[Verse] hi", negativeTags: "metal", vocalGender: "f", duration: "45.6",
    styleWeight: "0.655", weirdnessConstraint: 0.2, variety: "2",
  }));
  assert.equal(res.status, 200);
  const sent = fake.calls.at(-1).body;
  assert.equal(sent.model, "V6_WILD");
  assert.equal(sent.title, "Dusk");
  assert.equal(sent.lyrics, "[Verse] hi");
  assert.equal(sent.negativeTags, "metal");
  assert.equal(sent.vocalGender, "f");
  assert.equal(sent.duration, 46);
  assert.equal(sent.styleWeight, 0.66);
  assert.equal(sent.weirdnessConstraint, 0.2);
  assert.equal(sent.variety, 2);
});

test("instrumental custom mode drops lyrics and vocal gender", () => {
  const body = buildGenerateBody({ customMode: true, instrumental: true, style: "piano", lyrics: "la la", vocalGender: "m" }, "https://x/cb");
  assert.equal(body.lyrics, undefined);
  assert.equal(body.vocalGender, undefined);
  assert.equal(body.style, "piano");
});

test("validation rejects empty requests with a readable error", async () => {
  let res = await generate(post("/api/generate", { customMode: false, prompt: "   " }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Describe the song/);

  res = await generate(post("/api/generate", { customMode: true, instrumental: false, style: "pop" }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Add lyrics/);

  res = await generate(post("/api/generate", { customMode: true, instrumental: true, style: "pop", model: "V4" }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /model must be one of/);
});

test("status normalises a finished task", async () => {
  const gen = await (await generate(post("/api/generate", { customMode: false, prompt: "x", instrumental: true }))).json();
  const res = await status(get(`/api/status?taskId=${gen.taskId}`));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.phase, "done");
  assert.equal(data.status, "SUCCESS");
  assert.equal(data.tracks.length, 2);
  assert.match(data.tracks[0].audioUrl, /\.mp3$/);
  assert.ok(data.tracks[0].imageUrl);
  assert.equal(data.tracks[0].prompt, "", "instrumental tracks carry no lyrics");
});

test("status without taskId is a 400", async () => {
  const res = await status(get("/api/status"));
  assert.equal(res.status, 400);
});

test("lyrics flow returns variations", async () => {
  const start = await (await lyrics(post("/api/lyrics", { prompt: "leaving home" }))).json();
  assert.match(start.taskId, /^lyr_/);
  const res = await lyricsStatus(get(`/api/lyrics/status?taskId=${start.taskId}`));
  const data = await res.json();
  assert.equal(data.phase, "done");
  assert.equal(data.variations.length, 2);
  assert.match(data.variations[0].text, /leaving home/);
});

test("lyrics prompt over 200 chars is rejected before hitting Suno", async () => {
  const before = fake.calls.length;
  const res = await lyrics(post("/api/lyrics", { prompt: "x".repeat(201) }));
  assert.equal(res.status, 400);
  assert.equal(fake.calls.length, before);
});

test("extend requires audioId and forwards continueAt", async () => {
  let res = await extend(post("/api/extend", { model: "V6" }));
  assert.equal(res.status, 400);
  res = await extend(post("/api/extend", { audioId: "audio_1", taskId: "task_1", continueAt: "60", lyrics: "[Verse 3] more", model: "V6" }));
  assert.equal(res.status, 200);
  const sent = fake.calls.at(-1).body;
  assert.equal(sent.audioId, "audio_1");
  assert.equal(sent.continueAt, 60);
  assert.equal(sent.lyrics, "[Verse 3] more");
});

test("upstream Suno error codes map to clear messages", async () => {
  const saved = process.env.SUNO_API_KEY;
  process.env.SUNO_API_KEY = "wrong";
  const res = await credits(get("/api/credits"));
  process.env.SUNO_API_KEY = saved;
  assert.equal(res.status, 500);
  const data = await res.json();
  assert.match(data.error, /Unauthorized/);
  assert.equal(data.sunoCode, 401);
});

test("missing SUNO_API_KEY is reported, not leaked", async () => {
  const saved = process.env.SUNO_API_KEY;
  delete process.env.SUNO_API_KEY;
  const res = await credits(get("/api/credits"));
  process.env.SUNO_API_KEY = saved;
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /SUNO_API_KEY is not configured/);
});

test("access code gate blocks and admits", async () => {
  process.env.APP_ACCESS_CODE = "sesame";
  try {
    let res = await access(get("/api/access"));
    assert.deepEqual(await res.json(), { required: true, ok: false });

    res = await credits(get("/api/credits"));
    assert.equal(res.status, 401);
    assert.equal((await res.json()).accessCodeRequired, true);

    res = await credits(get("/api/credits", { "x-access-code": "sesame" }));
    assert.equal(res.status, 200);

    res = await access(get("/api/access", { "x-access-code": "sesame" }));
    assert.deepEqual(await res.json(), { required: true, ok: true });
  } finally {
    delete process.env.APP_ACCESS_CODE;
  }
});

test("wrong HTTP method is rejected", async () => {
  const res = await generate(get("/api/generate"));
  assert.equal(res.status, 405);
});

test("callback acknowledges Suno", async () => {
  const res = await callback(post("/api/callback", { code: 200, data: { callbackType: "complete", task_id: "t1", data: [] } }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "received" });
});
