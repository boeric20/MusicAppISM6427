Four button weights: primary, small primary, ghost and link, plus the square icon button.

- **Primary** is the one `accent` fill on screen, full width at the bottom of the composer. Text `body-strong` in `accent-ink`; an optional `btn-note` in `caption` at 75% opacity states the cost ("2 variations"). `radius-md`, `shadow-control`. Hover `accent-hover`, press scale 0.985, disabled 55% opacity with the label swapped to a progress verb ("Starting…").
- **Primary small** is the same button at `9px space-4` padding for dialog footers.
- **Ghost** is `glass-inset` with `control-border`, for Cancel and Close. Never two primaries in one footer.
- **Link** is `label` in `accent` with no box, for secondary actions inside content: Clear, Remove, Download MP3, Extend, Lyrics, Use these lyrics. Underline on hover.
- **Icon** is 34px, `radius-sm`, `glass-inset`, for the theme toggle. Give it an `aria-label`.

The consumer provides the label, type and an `aria-label` for icon-only buttons. Focus is the shared `accent` border plus `shadow-focus`.
