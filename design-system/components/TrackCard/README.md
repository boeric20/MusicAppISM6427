A finished track inside a JobCard: cover art, title, tags, the audio player, three actions and a collapsible lyric sheet.

`glass-inset` fill with `glass-border`, `radius-md`, `space-3` padding, a 96px cover column with `space-4` gap, collapsing to one column under 480px. Cover art is 96px, `radius-sm`, with `accent-soft` behind it while it loads. Title in `title-3`, tags in `caption` and `muted`. The native audio element is full width at 36px. Actions are link buttons with `space-4` gaps: Download MP3, Extend, Lyrics. The lyric sheet is `lyrics` type on `glass-inset`, `radius-sm`, max 220px tall, toggled by the Lyrics button.

The consumer provides the cover URL, title, tag string, audio source, download URL and the lyric text. Keep the action order fixed.
