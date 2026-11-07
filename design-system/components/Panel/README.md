The glass container for each of the two page regions, composer and library.

`glass`, `blur-glass`, 1px `glass-border`, `shadow-glass`, `radius-lg`, `space-6` padding. The head row is a flex row with the heading on the left (`title-1` for the composer, `title-2` for the library) and one control on the right (a SegmentedControl or a link button), `space-4` below it.

The consumer provides the heading, an `aria-labelledby` link to it, and the body. Panels never nest; nested surfaces are JobCard or `glass-inset` elements. Do not give a panel a second shadow or a coloured border.
