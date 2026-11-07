A tab strip for switching between two or three modes of one panel, currently Simple and Custom.

Track: `glass-inset`, `control-border`, `radius-sm`, 3px padding. Segment: `label` text in `muted`, 5px by `space-3` padding, 7px radius. The active segment is `glass-strong` with `text` and `shadow-control`, so it reads as a raised pane of glass.

The consumer provides the segments as buttons with `role="tab"` and `aria-selected`, and toggles the `active` class. Keep it to three segments; more belongs in a select.
