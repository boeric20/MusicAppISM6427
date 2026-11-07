/**
 * Request validation that mirrors the rules in the Suno "Generate Music" docs,
 * so users get a clear message before credits are spent.
 */
import { MODELS, SunoError } from "./suno.mjs";

const LIMITS = {
  title: 80,
  style: 1000,
  lyrics: 5000,
  negativeTags: 1000,
  simplePrompt: 3000,
  lyricsPrompt: 200,
};

function bad(msg) {
  throw new SunoError(msg, { status: 400 });
}

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function num01(v, name) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0 || n > 1) bad(`${name} must be between 0 and 1.`);
  return Math.round(n * 100) / 100;
}

function pickModel(v) {
  const m = str(v) || "V6";
  if (!MODELS.includes(m)) bad(`model must be one of ${MODELS.join(", ")}.`);
  return m;
}

/**
 * Build the body for POST /api/v1/generate from the browser's form data.
 * Returns only fields that are legal for the chosen mode.
 */
export function buildGenerateBody(input, callBackUrl) {
  const customMode = Boolean(input.customMode);
  const instrumental = Boolean(input.instrumental);
  const model = pickModel(input.model);
  const body = { customMode, instrumental, model, callBackUrl };

  if (!customMode) {
    const prompt = str(input.prompt);
    const style = str(input.style);
    const lyrics = str(input.lyrics);
    if (prompt.length > LIMITS.simplePrompt) bad(`Description must be ${LIMITS.simplePrompt} characters or fewer.`);
    if (style.length > LIMITS.style) bad(`Style must be ${LIMITS.style} characters or fewer.`);
    if (lyrics.length > LIMITS.lyrics) bad(`Lyrics must be ${LIMITS.lyrics} characters or fewer.`);
    if (!prompt && !style && !lyrics) bad("Describe the song, or give a style or lyrics.");
    if (prompt) body.prompt = prompt;
    if (style) body.style = style;
    if (lyrics && !instrumental) body.lyrics = lyrics;
    return body;
  }

  const title = str(input.title);
  const style = str(input.style);
  const lyrics = str(input.lyrics);
  const negativeTags = str(input.negativeTags);
  if (title.length > LIMITS.title) bad(`Title must be ${LIMITS.title} characters or fewer.`);
  if (style.length > LIMITS.style) bad(`Style must be ${LIMITS.style} characters or fewer.`);
  if (lyrics.length > LIMITS.lyrics) bad(`Lyrics must be ${LIMITS.lyrics} characters or fewer.`);
  if (negativeTags.length > LIMITS.negativeTags) bad(`Exclusions must be ${LIMITS.negativeTags} characters or fewer.`);
  if (!style && !lyrics && !negativeTags) bad("Custom mode needs a style, lyrics, or exclusions.");
  if (!instrumental && !lyrics) bad("Add lyrics, or switch on Instrumental.");

  if (title) body.title = title;
  if (style) body.style = style;
  if (lyrics && !instrumental) body.lyrics = lyrics;
  if (negativeTags) body.negativeTags = negativeTags;

  if (!instrumental && (input.vocalGender === "m" || input.vocalGender === "f")) {
    body.vocalGender = input.vocalGender;
  }

  if (input.duration !== undefined && input.duration !== "" && input.duration !== null) {
    const d = Math.round(Number(input.duration));
    if (Number.isNaN(d) || d < 10 || d > 360) bad("Duration must be between 10 and 360 seconds.");
    body.duration = d;
  }

  const styleWeight = num01(input.styleWeight, "Style strength");
  const weirdness = num01(input.weirdnessConstraint, "Weirdness");
  if (styleWeight !== undefined) body.styleWeight = styleWeight;
  if (weirdness !== undefined) body.weirdnessConstraint = weirdness;

  if (input.variety !== undefined && input.variety !== "" && input.variety !== null) {
    const v = Number(input.variety);
    if (!Number.isInteger(v) || v < 0 || v > 4) bad("Variety must be an integer from 0 to 4.");
    body.variety = v;
  }

  return body;
}

/** Build the body for POST /api/v1/generate/extend. */
export function buildExtendBody(input, callBackUrl) {
  const audioId = str(input.audioId);
  if (!audioId) bad("audioId is required to extend a track.");
  const model = pickModel(input.model);
  const instrumental = Boolean(input.instrumental);
  const body = { audioId, model, instrumental, callBackUrl };

  const taskId = str(input.taskId);
  const title = str(input.title);
  const style = str(input.style);
  const lyrics = str(input.lyrics);
  if (title.length > 100) bad("Title must be 100 characters or fewer.");
  if (style.length > LIMITS.style) bad(`Style must be ${LIMITS.style} characters or fewer.`);
  if (lyrics.length > LIMITS.lyrics) bad(`Lyrics must be ${LIMITS.lyrics} characters or fewer.`);

  if (taskId) body.taskId = taskId;
  if (title) body.title = title;
  if (style) body.style = style;
  if (lyrics && !instrumental) body.lyrics = lyrics;

  if (input.continueAt !== undefined && input.continueAt !== "" && input.continueAt !== null) {
    const c = Number(input.continueAt);
    if (Number.isNaN(c) || c <= 0) bad("continueAt must be greater than 0 seconds.");
    body.continueAt = Math.round(c * 100) / 100;
  }
  if (!instrumental && (input.vocalGender === "m" || input.vocalGender === "f")) {
    body.vocalGender = input.vocalGender;
  }
  return body;
}

/** Build the body for POST /api/v1/lyrics. */
export function buildLyricsBody(input, callBackUrl) {
  const prompt = str(input.prompt);
  if (!prompt) bad("Describe what the lyrics should be about.");
  if (prompt.length > LIMITS.lyricsPrompt) {
    bad(`Lyrics description must be ${LIMITS.lyricsPrompt} characters or fewer.`);
  }
  return { prompt, callBackUrl };
}
