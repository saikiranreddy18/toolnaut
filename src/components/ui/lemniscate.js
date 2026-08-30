// The infinity in the wordmark. One definition, three consumers.
//
// It was copy-pasted into Wordmark, AnimatedWordmark and DottedWordmark, which
// is how a brand mark quietly ends up drawn three slightly different ways.
//
// THE SHAPE
// The previous path was two loops that MET at the centre:
//   M100 60 C100 12 22 12 22 60 C22 108 100 108 100 60 C100 12 178 ...
// Every segment started and ended at (100,60) without ever passing through it,
// so stroked it read as two circles touching at a point — not an infinity.
//
// This one CROSSES. Each segment passes through the centre and continues to the
// opposite side, so the two strands overlap and form an X in the middle, which
// is what makes the glyph read as a ribbon rather than a figure-of-eight of
// circles:
//   (20,60) --over--> (100,60) --under--> (180,60)
//   (180,60) --over--> (100,60) --under--> (20,60)
//
// Native box is 200x120 with the crossing at (100,60).
export const LEMNISCATE =
  'M20 60 C20 20 60 20 100 60 C140 100 180 100 180 60 C180 20 140 20 100 60 C60 100 20 100 20 60 Z'

export const LEM_W = 200
export const LEM_H = 120

// Measured from the path above with getTotalLength(): 433.5, rounded up.
// Used by the draw-on animation, where a value SHORTER than the true length
// leaves a visible gap at the join, and a longer one stalls — the dash offset
// spends the difference drawing nothing before the stroke appears. The old
// hard-coded 660 was for the previous path and would have idled through 35% of
// the reveal on this one.
export const LEM_LENGTH = 440
