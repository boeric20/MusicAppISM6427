Studio Suno turns a sentence into a song. The interface is a single screen: a composer panel on the left, a library of generated tracks on the right, and three small dialogs. This system restyles that screen as layered glass in the manner of Apple's recent platform UI: translucent panels over a softly tinted ground, light catch-lines instead of hard borders, large continuous corners, one indigo accent, and system type.

## Principles

- **Glass is the surface, not the decoration.** Everything that holds content sits on `glass`, `glass-strong` or `glass-inset`. Nothing else is translucent: text, icons, badges and buttons are opaque so they stay legible whatever moves behind them.
- **One accent.** `accent` is the only saturated UI colour. Status hues (`ok`, `warn`, `danger`) appear only where they carry meaning and always with a word beside them.
- **Depth comes from blur and a catch-light, not from thick shadows or gradients.** Panels get `shadow-glass`; only dialogs get `shadow-float`. No gradient appears anywhere except the blurred ambient tints behind the page.
- **Calm, factual copy.** The product never cheers. It states what will happen and what it costs.

## Content

Write in sentence case, including headings and buttons: "Make a track", "Your tracks", "Write lyrics with AI", "Generate lyrics". Address the user as "you" and refer to the model by name: "Suno writes the lyrics and structure for you." No exclamation marks, no emoji.

State limits and consequences plainly, as the current app does:

> Generation takes about one to three minutes. Files stay on Suno's servers for roughly two weeks, so download anything you want to keep.

Mark optional fields with the word *optional* in `muted` after the label, never with an asterisk on required ones. Hints go under the field in `caption`; character counts in `numeric` to the right of the hint. Error text names what failed and what to do: "Describe the song first." Status badges are one word: Generating, Ready, Failed.

## Colour

Two themes, `light` first. The dark theme lightens `accent`, so `accent-ink` flips to near-black there: never hard-code white on the accent.

- **Ground.** `bg` fills the page. Paint three blurred radial tints over it (`bg-tint-violet` top left, `bg-tint-teal` bottom right, `bg-tint-rose` small, centre right) at `blur-ambient`. The tints exist only to be seen through glass; never use them as fills.
- **Glass.** `glass` for panels, job cards and the top bar with `blur-glass`. `glass-strong` for dialogs with `blur-dialog`, and as the solid fallback wherever `backdrop-filter` is unsupported or the user prefers reduced transparency. `glass-inset` for inputs, track cards and lyric options nested inside a panel; it needs no blur of its own.
- **Edges.** Every glass surface takes a 1px `glass-border`. Dividers inside glass use `hairline`. Controls (inputs, selects, ghost buttons, switch track, pill) use `control-border`, which holds 3:1 against glass in both themes.
- **Text.** `text` for primary copy, `muted` for secondary. Both are specified against `glass`, `glass-strong` and `glass-inset` over the tinted ground and hold at least 4.5:1 in both themes. Do not put `muted` on `accent-soft`, `ok-soft` or `danger-soft`.
- **Status.** `ok` on `ok-soft` (Ready), `accent` on `accent-soft` (Generating), `danger` on `danger-soft` (Failed, errors). `warn` is for the low-credits dot and warning text only; it has no soft fill because the app never shows a warning box. Each status colour also differs in lightness from the others, and each always pairs with its word.

## Type

The system uses the platform face: `sans` resolves to SF Pro Text on Apple devices, Segoe UI on Windows and the system sans elsewhere. No font files ship. `display` is the same stack with SF Pro Display preferred for sizes 18px and up. `mono` is for lyrics and numbers.

- `title-1` for the composer heading, `title-2` for the library heading and dialog titles, `title-3` for job, track and lyric titles.
- `body` is 15px. Inputs inherit it. `body-strong` for switch labels, buttons and segments.
- `label` (13px, 600) for field labels, link buttons and the status pill. `caption` (12px) in `muted` for hints and meta. `badge` is uppercase with 0.06em tracking; use it nowhere but badges.
- `lyrics` for anything the user wrote as lyrics, preserving line breaks. `numeric` with tabular figures for counts, slider values and the credit balance.

Headings carry negative tracking (`-0.015em` to `-0.005em`). Body text does not.

## Spacing and layout

An 4px scale, `space-1` to `space-12`. The page is a two-column grid, 460px composer and a fluid library, `space-5` gap and gutter, 1240px max, collapsing to one column under 880px with `space-4` gutters. Panels pad `space-6`, job cards `space-4`, inputs `10px space-3`, track cards `space-3`. Field-to-field rhythm is `space-4`; label-to-input is 6px, the one off-scale value, kept from the source.

## Radii

Corners grow with the surface: `radius-sm` (10px) for inputs, icon buttons and cover art, `radius-md` (14px) for buttons, track cards and alerts, `radius-lg` (22px) for panels and job cards, `radius-xl` (28px) for dialogs, `radius-pill` for pills, badges, switch and progress. A nested surface always has a smaller radius than its parent.

## Shadows and blur

`shadow-glass` on every panel: a 1px inner catch-light at the top edge plus a soft, low-opacity drop. `shadow-float` on dialogs only. `shadow-control` on the active segment, the switch thumb and the primary button. Focus is a 1px `accent` border plus `shadow-focus`, on every interactive element, triggered by `:focus-visible`.

Blur values are `backdrop-filter` strings: `blur-glass` for panels, `blur-dialog` for dialogs, `blur-scrim` for the dialog backdrop (over `scrim`), `blur-ambient` for the ground tints. Always wrap with `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)`, swapping to `glass-strong` without blur.

## Motion

`duration-fast` for hover fills and the press scale (buttons scale to 0.985, never translate). `duration-base` for focus rings, borders and the switch thumb. `duration-slow` for progress width. All on `ease-standard`. The indeterminate progress bar is the only looping animation. Under `prefers-reduced-motion` every duration is zero and the bar becomes a static half-opacity fill.

## States

- Hover: primary buttons go `accent-hover`; ghost buttons, pills and icon buttons change border to `accent`; link buttons underline with 3px offset.
- Active: scale 0.985.
- Disabled: 55% opacity, `cursor: progress` while a job starts (the label changes to "Starting…").
- Error: the `.error` alert in `danger` on `danger-soft`, role alert, hidden until it has text.

## Iconography

The app uses one mark, `assets/Logos/studio-suno-mark.svg`, a white note on a `#6d5dfc` disc, carried over from the site's favicon; it does not retint with the theme. Show it at 28px in the top bar with `radius-sm`, and as the favicon. The only other glyph is the theme toggle, currently the text character ◐. Prefer a 18px single-colour inline SVG in `text` for new icons, SF Symbols-like in weight (1.75px strokes, round caps). No emoji in the interface.
