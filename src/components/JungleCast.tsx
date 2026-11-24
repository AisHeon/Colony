/**
 * Hand-drawn jungle cast. Everything is line art in `currentColor` + a cream
 * fill so it can sit on the dark arch, on the plate, or in the room theme.
 */

import type { CSSProperties } from "react";

export function AntFigure({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      <g
        fill="#eaf4da"
        stroke="#0d2609"
        strokeWidth="3.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <ellipse cx="74" cy="100" rx="22" ry="28" transform="rotate(16 74 100)" />
        <ellipse cx="56" cy="66" rx="15" ry="17" transform="rotate(14 56 66)" />
        <circle cx="40" cy="32" r="18" />
        {/* antennae */}
        <path d="M31 16C26 6 17 1 6 3" fill="none" />
        <path d="M49 17c2-11 10-17 20-19" fill="none" />
      </g>
      <g fill="#0d2609">
        <circle cx="33" cy="28" r="2.7" />
        <circle cx="47" cy="28" r="2.7" />
      </g>
      <g fill="none" stroke="#0d2609" strokeWidth="3.2" strokeLinecap="round">
        <path d="M44 52 22 43M43 63 18 61M45 74 23 85" />
        <path d="M67 53 90 45M69 64 95 64M67 76 91 88" />
        <path d="M22 43l-7 3M18 61l-7 2M23 85l-6 7M90 45l7 1M95 64l7 2M91 88l6 7" />
      </g>
    </svg>
  );
}

export function CricketFigure({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 118 96" aria-hidden="true" focusable="false">
      <g
        fill="#eaf4da"
        stroke="#0d2609"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <ellipse cx="74" cy="62" rx="25" ry="12" transform="rotate(-7 74 62)" />
        <ellipse cx="45" cy="55" rx="15" ry="12" />
        <circle cx="26" cy="42" r="11.5" />
      </g>
      <circle cx="23" cy="39" r="2.3" fill="#0d2609" />
      <g fill="none" stroke="#0d2609" strokeWidth="3.1" strokeLinecap="round">
        {/* antennae */}
        <path d="M22 32C16 20 8 14 0 12M29 31c0-12 5-21 13-27" />
        {/* big hind leg */}
        <path d="M88 51l14-19 11 27-7 13" />
        {/* front legs */}
        <path d="M50 64l-7 17M63 66l-2 17" />
        {/* wing */}
        <path d="M52 46c13-6 28-6 41 2" />
        <path d="M63 53c9 4 18 6 27 6" />
      </g>
    </svg>
  );
}

const VINE_LEAVES = [
  { top: 3, side: "left", turn: -16, size: 1 },
  { top: 9, side: "right", turn: 12, size: 0.82 },
  { top: 16, side: "left", turn: -10, size: 0.92 },
  { top: 23, side: "right", turn: 18, size: 1.05 },
  { top: 31, side: "left", turn: -20, size: 0.86 },
  { top: 38, side: "right", turn: 9, size: 0.95 },
  { top: 45, side: "left", turn: -13, size: 1.02 },
  { top: 53, side: "right", turn: 16, size: 0.88 },
  { top: 60, side: "left", turn: -18, size: 0.96 },
  { top: 68, side: "right", turn: 11, size: 1.06 },
  { top: 75, side: "left", turn: -9, size: 0.9 },
  { top: 83, side: "right", turn: 19, size: 0.98 },
  { top: 90, side: "left", turn: -15, size: 0.84 },
  { top: 96, side: "right", turn: 8, size: 1 },
];

/**
 * A calm creeper that runs the whole page on the right edge: one stem, a leaf
 * every few percent, a slow sway. Purely decorative.
 */
export function JungleVine() {
  return (
    <div className="jungle-vine" aria-hidden="true">
      <svg
        className="jungle-vine-stem"
        viewBox="0 0 100 1000"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          d="M62 0c-16 96 14 172-6 262-18 84 6 148-12 232-16 76 12 132-6 216-14 66 4 122-10 188-8 40 2 74 8 102"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {VINE_LEAVES.map((leaf, index) => (
        <span
          key={leaf.top}
          className={`jungle-vine-leaf is-${leaf.side}`}
          style={
            {
              top: `${leaf.top}%`,
              "--turn": `${leaf.turn}deg`,
              "--size": leaf.size,
              "--leaf-delay": `${index * 0.35}s`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 46 26" focusable="false">
            <path
              d="M1 13C9 1 30-3 45 5 37 21 14 27 1 13Z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M4 13c10 3 22 0 34-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              opacity="0.55"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** A palm frond silhouette. Drop it in `.jungle-canopy` and it unrolls on reveal. */
export function PalmFrond({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 160" fill="currentColor" aria-hidden="true">
      <path d="M4 2c10 44 34 84 70 110 14 10 30 18 46 22-14-12-26-28-34-46-12-26-16-56-12-86-8 4-16 10-22 18-10 12-16 26-18 40 18-4 36 0 52 12 18 13 30 32 36 54 4-30 0-62-12-90C96 8 52-6 4 2Z" />
    </svg>
  );
}

/** Low bush silhouette used at the bottom corners of a revealed section. */
export function JungleBush({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 260 140" fill="currentColor" aria-hidden="true">
      <path d="M10 140c0-30 10-54 30-70 14-12 32-18 50-18 6-14 18-24 34-26 18-2 34 6 44 20 16 2 30 12 38 26 10 16 14 34 12 52H10Z" />
      <path d="M118 46c-4-14-2-26 6-36 6 12 8 24 4 38Z" opacity="0.7" />
      <path d="M52 66c-6-12-6-24 0-34 8 10 12 22 10 36Z" opacity="0.7" />
    </svg>
  );
}
