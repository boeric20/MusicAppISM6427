# Studio Suno

A small web app for generating original music from a text description, built on the
[sunoapi.org](https://docs.sunoapi.org/) API and deployed on Netlify.

## What it does

- **Simple mode**: describe a song in plain language. Suno writes the lyrics and structure.
- **Custom mode**: supply your own title, style, lyrics, exclusions, vocal gender, duration,
  style strength, weirdness, and variety.
- **Lyrics assistant**: generate two lyric variations from a short idea and drop one into the form.
- **Extend**: continue any finished track from a chosen timestamp.
- **Library**: every job is saved in the browser, polled until finished, and shown with cover art,
  an audio player, a download link, and the lyrics.
- **Credits**: the current Suno balance is shown in the header.
- **Optional access code**: protect the public URL so only people with the code can spend credits.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Front end | Static HTML, CSS, and vanilla JavaScript in `public/` | No build step, so Netlify deploys it as-is |
| Back end | Netlify Functions (Node, ESM) in `netlify/functions/` | Keeps the Suno API key on the server |
| Suno client | `netlify/lib/suno.mjs` | One place that knows the Suno endpoints and error codes |
| Tests | Node's built-in test runner with an in-memory fake Suno | Runs with `npm test`, spends no credits |

The browser never talks to Suno directly. It calls these routes, which the functions serve:

| Route | Method | Suno endpoint |
| --- | --- | --- |
| `/api/generate` | POST | `POST /api/v1/generate` |
| `/api/extend` | POST | `POST /api/v1/generate/extend` |
| `/api/status?taskId=` | GET | `GET /api/v1/generate/record-info` |
| `/api/lyrics` | POST | `POST /api/v1/lyrics` |
| `/api/lyrics/status?taskId=` | GET | `GET /api/v1/lyrics/record-info` |
| `/api/credits` | GET | `GET /api/v1/generate/credit` |
| `/api/access` | GET | none, checks the access code |
| `/api/callback` | POST | receives Suno's completion events and logs them |

The app polls `/api/status` every eight seconds rather than relying on the callback, because a
static site has no durable place to park callback results. The callback URL is still sent because
Suno requires it, and the events appear in the Netlify function logs.

## Deploy on Netlify

1. Push this repository to GitHub and import it in Netlify (Add new project, Import an existing project).
2. Netlify reads `netlify.toml`, so the build settings are already correct: no build command,
   publish directory `public`, functions directory `netlify/functions`.
3. Under **Site configuration, Environment variables**, add:

   | Variable | Required | Value |
   | --- | --- | --- |
   | `SUNO_API_KEY` | Yes | Your key from <https://sunoapi.org/api-key> |
   | `APP_ACCESS_CODE` | Recommended | Any passphrase. Visitors must enter it before generating. |
   | `SUNO_CALLBACK_URL` | No | Override for the callback URL. Defaults to `https://<your-site>/api/callback`. |
   | `SUNO_API_BASE` | No | Override for the API host. Defaults to `https://api.sunoapi.org`. |

4. Trigger a deploy. Open the site, confirm the credit badge shows a number, and generate a track.

Without `APP_ACCESS_CODE`, anyone who finds the URL can spend your credits.

## Local development

Run the UI against a fake Suno that costs nothing:

```bash
node scripts/dev-mock.mjs
```

Then open <http://localhost:8888>. Tasks move through the real status sequence
(PENDING, TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS) a few seconds apart.

Run against the real API with the Netlify CLI:

```bash
npm install -g netlify-cli
cp .env.example .env    # then fill in SUNO_API_KEY
netlify dev
```

Run the tests:

```bash
npm test
```

## Notes from the Suno docs that shaped the design

- `customMode`, `instrumental`, `model`, and `callBackUrl` are always required. The functions add the
  callback URL server-side and strip fields that are illegal for the chosen mode.
- Current models are `V6`, `V6_WILD`, and `V6_MINI`. Older models are deprecated and are not offered.
- Simple mode needs a prompt, style, or lyrics. Custom mode needs a style, lyrics, or exclusions, and
  non-instrumental custom tracks need lyrics.
- Lyrics prompts are capped at 200 characters. Titles at 80. Style at 1000. Lyrics at 5000.
- Each generation returns two variations and consumes credits. Insufficient credits come back as
  Suno code 429, which the app surfaces as a readable message.
- Generated files are kept on Suno's servers for about two weeks. Download anything worth keeping.

## Project layout

```
public/                 Static front end (index.html, styles.css, app.js, mark.svg)
design-system/          Design tokens, brand book and component previews (source of styles.css)
netlify/functions/      One file per API route
netlify/lib/            Suno client, HTTP helpers, request validation
scripts/dev-mock.mjs    Local server with a fake Suno
test/                   Function tests and the fake Suno used by both
netlify.toml            Netlify build and redirect configuration
```
