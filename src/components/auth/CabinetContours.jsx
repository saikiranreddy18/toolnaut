// The cabinet silhouette, drawn as layered SVG contours.
//
// Ported path-for-path from the approved sign-in build. This is the shape that
// makes the panel read as a machined arcade cabinet rather than a rounded div,
// and it cannot be done with CSS borders: the outline steps DOWN at the top
// left, cuts a diagonal at the bottom right, and carries a vertical separator
// between the cabinet and the sign-in panel.
//
// Five stacked strokes, drawn outside-in, are what give the edge its depth:
//   black 18   the outer rim
//   grey  11   a machined inset just inside it
//   pink  12   the signature band
//   pale   3   a highlight on the pink
//   plus the separator and the left rail, each black-then-pink
//
// preserveAspectRatio="none" on purpose — the frame stretches to whatever box
// the modal ends up at, so the contours always meet its corners. Stroke widths
// distort slightly with it, which at these proportions is invisible and is the
// price of not hard-coding a fixed modal size.

export default function CabinetContours() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1360 810"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M75 20 H650 L678 46 H1282 L1328 82 V722 L1288 792 H95 L44 756 V93 Z"
        fill="none" stroke="#050506" strokeWidth="18" strokeLinejoin="round"
      />
      <path
        d="M76 37 H642 L670 61 H1272 L1309 91 V712 L1274 774 H104 L62 744 V105 Z"
        fill="none" stroke="#4a4a50" strokeWidth="11" strokeLinejoin="round"
      />
      <path
        d="M87 55 H628 L658 79 H1261 L1294 106 V700 L1261 759 H1090 L1067 780 H113 L79 762 V116 Z"
        fill="none" stroke="var(--hot-pink)" strokeWidth="12" strokeLinejoin="round"
      />
      <path
        d="M96 66 H619 L650 90 H1253 L1282 114 V693 L1252 748 H1097"
        fill="none" stroke="#ff7caf" strokeWidth="3" strokeLinejoin="round"
      />

      {/* the divider between the machine and the sign-in panel */}
      <path d="M741 66 V780" fill="none" stroke="#050506" strokeWidth="27" />
      <path d="M741 66 V780" fill="none" stroke="var(--hot-pink)" strokeWidth="9" />

      {/* the rail down the left flank */}
      <path d="M112 70 V760" fill="none" stroke="#050506" strokeWidth="20" />
      <path d="M112 70 V760" fill="none" stroke="var(--hot-pink)" strokeWidth="7" />
    </svg>
  )
}
