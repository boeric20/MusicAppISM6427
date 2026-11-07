A modal sheet for the three short flows: writing lyrics with AI, extending a track, and entering the access code.

A native `<dialog>` in `glass-strong` with `blur-dialog`, `glass-border`, `shadow-float` and `radius-xl`, 560px wide at most, `space-6` body padding. The backdrop is `scrim` with `blur-scrim`, so the page stays visible but recedes. Title in `title-2` with `space-4` below; fields as in Field; a `dialog-actions` row at the end, right-aligned, ghost then primary small, `space-2` apart.

The consumer provides the title, body and the two buttons. Open with `showModal()` so focus is trapped and Escape closes. One dialog at a time; a dialog never opens another.
