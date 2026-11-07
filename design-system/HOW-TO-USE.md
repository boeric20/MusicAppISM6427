# Studio Suno Glass design system

The source of truth for the site's visual language. The published, browsable version lives in Claude as a Design System artifact; these are the same files.

- `tokens.json`: every colour (light and dark), text style, spacing step, radius, shadow, blur and timing value, with usage notes.
- `README.md`: the brand book: voice, colour, type, glass recipe, motion, states, iconography.
- `migration.md`: how each variable in the old `styles.css` maps to the new tokens.
- `components/bundle.css`: the component stylesheet. `public/styles.css` is this file with the compiled tokens prepended.
- `components/<Name>/`: a live preview and guidelines for each of the 14 UI components.
- `studio-suno-mark.svg`: the one mark, also served as `public/mark.svg`.

To change a token, edit `tokens.json`, regenerate the token block at the top of `public/styles.css`, and keep `bundle.css` using `var(--token)` only.
