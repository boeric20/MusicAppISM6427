A one-word job status in the corner of a JobCard.

`badge` type, uppercase, `radius-pill`, `space-1` by 9px padding. Three states: default is Generating in `accent` on `accent-soft`; `done` is Ready in `ok` on `ok-soft`; `failed` is Failed in `danger` on `danger-soft`. The three text colours differ in lightness as well as hue.

The consumer provides the word and the state class. Never use a badge for anything but job phase.
