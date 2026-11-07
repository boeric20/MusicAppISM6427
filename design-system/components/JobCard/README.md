One generation job in the library: title, meta, a status badge, progress while working, and its finished tracks.

A second layer of glass inside the library panel: `glass`, `blur-glass`, `glass-border`, `shadow-glass`, `radius-lg`, `space-4` padding. Head row: `title-3` title with `caption` meta beneath, Badge on the right, `space-3` gap. A Progress bar shows only while the phase is working; `job-status` in `caption` explains the current step or the failure. Finished tracks stack as TrackCards with `space-3` gaps. The foot holds one link button, Remove.

The consumer provides the job label (default "Untitled"), meta line, phase, status text and the tracks. Stack jobs with `space-4` gaps, newest first.
