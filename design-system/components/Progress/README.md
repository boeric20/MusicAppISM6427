Progress indicators: a thin determinate bar, an indeterminate bar, and a 14px spinner for inline status lines.

Bar: 4px tall, `hairline` track, `accent` fill, `radius-pill`, width animating on `duration-slow`. The `indeterminate` class slides a 40% segment on a 1.6s loop. Spinner: 2px `control-border` ring with an `accent` top edge, 0.8s rotation, placed before `caption` text in a `status-line`.

The consumer sets the bar width from the Suno status sequence (PENDING, TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS) or uses `indeterminate` while polling without a phase. Always pair the spinner with words. Under reduced motion both stop and the bar shows a half-opacity full track.
