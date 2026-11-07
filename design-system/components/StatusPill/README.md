A pill-shaped button that shows the Suno credit balance and refreshes it on click.

The dot is the only colour: `ok` by default, `warn` with the `low` class under 20 credits, `danger` with `err` when the balance could not be fetched. The text always says what the dot means, so colour is never the sole signal. Text is `label`; the number is `numeric`.

`glass-inset` fill, `control-border`, `radius-pill`, `space-2` gap. Hover and focus move the border to `accent`.

The consumer provides the label text and the state class. Use the pill only for this balance; other statuses belong in a Badge.
