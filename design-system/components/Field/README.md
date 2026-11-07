A labelled form control: text input, textarea, select or range, with an optional hint and character count.

Label in `label`, the word *optional* in `muted` after it. Controls are `glass-inset` with `control-border`, `radius-sm`, `10px space-3` padding and `body` text; placeholders are `muted`. Hint in `caption` and `muted`, count in `numeric`. Label to control is 6px, field to field `space-4`. Range inputs use `accent-color: accent`; their current value sits in the label as an `output`.

Focus: border `accent` plus `shadow-focus`. There is no error state on the control itself; validation messages go in the Alert above the submit button.

The consumer provides the label, the control, `maxlength` where the API caps input (prompt 3000, style 1000, lyrics 5000, title 80, lyric idea 200) and keeps the count updated. Use `grid-2` to pair short fields side by side; it collapses under 480px.
