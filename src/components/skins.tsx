"use client";

/**
 * Bug skins.
 *
 * A skin is pure data: five colours, a pattern and an accessory. The same
 * `<AntSkin>` renders it at 24 px in a roster or 160 px in the picker, so a new
 * skin is one object in this list — no new art, no new component.
 *
 * The member's `avatar` column stores the skin index, so a chosen skin already
 * travels with them into every room without a schema change.
 */

export type SkinPattern = "none" | "stripes" | "spots" | "saddle";
export type SkinAccessory = "none" | "leaf" | "flower" | "cap" | "antenna";

export type Skin = {
  name: string;
  body: string;
  abdomen: string;
  head: string;
  accent: string;
  ground: string;
  pattern: SkinPattern;
  accessory: SkinAccessory;
};

export const SKINS: Skin[] = [
  {
    name: "Forager",
    body: "#4a3220",
    abdomen: "#5b3d27",
    head: "#3d291a",
    accent: "#a8e063",
    ground: "#1d5718",
    pattern: "none",
    accessory: "antenna",
  },
  {
    name: "Leafcutter",
    body: "#7a4a2c",
    abdomen: "#8f5733",
    head: "#653c23",
    accent: "#b6ef7a",
    ground: "#245f1b",
    pattern: "saddle",
    accessory: "leaf",
  },
  {
    name: "Fire Ant",
    body: "#8e2f1f",
    abdomen: "#a83b26",
    head: "#75251a",
    accent: "#ffb27a",
    ground: "#5a2a12",
    pattern: "stripes",
    accessory: "none",
  },
  {
    name: "Sugar Ant",
    body: "#2b2119",
    abdomen: "#3b2d21",
    head: "#221a13",
    accent: "#f2d45c",
    ground: "#3f3a12",
    pattern: "spots",
    accessory: "none",
  },
  {
    name: "Honeypot",
    body: "#b07a26",
    abdomen: "#d39c35",
    head: "#96651d",
    accent: "#ffe08a",
    ground: "#5c4410",
    pattern: "saddle",
    accessory: "flower",
  },
  {
    name: "Carpenter",
    body: "#1f1c19",
    abdomen: "#2d2823",
    head: "#171412",
    accent: "#b6ef7a",
    ground: "#1d3f14",
    pattern: "stripes",
    accessory: "cap",
  },
  {
    name: "Weaver",
    body: "#33502a",
    abdomen: "#416436",
    head: "#284021",
    accent: "#d6ff9a",
    ground: "#1c4a17",
    pattern: "spots",
    accessory: "leaf",
  },
  {
    name: "Cicada",
    body: "#2c3c4d",
    abdomen: "#384c60",
    head: "#223140",
    accent: "#9fd8e8",
    ground: "#173a4a",
    pattern: "none",
    accessory: "antenna",
  },
];

const SKIN_KEY = "colony:skin";

export function normalizeSkin(value: unknown): number {
  const parsed = typeof value === "number" ? Math.floor(value) : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return 0;
  return ((parsed % SKINS.length) + SKINS.length) % SKINS.length;
}

export function readSkin(): number {
  if (typeof window === "undefined") return 0;
  try {
    return normalizeSkin(window.localStorage.getItem(SKIN_KEY));
  } catch {
    return 0;
  }
}

export function rememberSkin(index: number) {
  try {
    window.localStorage.setItem(SKIN_KEY, String(normalizeSkin(index)));
  } catch {
    /* storage can be blocked; the skin still applies this session */
  }
}

export function AntSkin({
  index,
  size,
  name,
}: {
  index: number;
  size: number;
  name?: string;
}) {
  const skin = SKINS[normalizeSkin(index)];
  const initial = name ? ([...name.trim()][0]?.toUpperCase() ?? "") : "";
  const id = `skin-${normalizeSkin(index)}`;

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={`${skin.name} bug`}>
      <defs>
        <radialGradient id={`${id}-ground`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor={skin.ground} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0b2208" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19.2" fill={`url(#${id}-ground)`} stroke={skin.accent} strokeOpacity="0.55" strokeWidth="1.2" />

      {/* legs */}
      <g stroke={skin.body} strokeWidth="1.5" strokeLinecap="round" opacity="0.95">
        <path d="M16.4 17.6 11.6 14M16.2 20.4l-5 .6M16.6 23.2l-4.2 3.4M23.6 17.6 28.4 14M23.8 20.4l5 .6M23.4 23.2l4.2 3.4" />
      </g>

      {/* abdomen */}
      <ellipse cx="20" cy="26.4" rx="6" ry="6.4" fill={skin.abdomen} stroke={skin.head} strokeWidth="1.4" />
      {skin.pattern === "stripes" ? (
        <g stroke={skin.accent} strokeWidth="1.1" opacity="0.85">
          <path d="M15.2 24.6h9.6M14.6 27h10.8M16 29.4h8" />
        </g>
      ) : null}
      {skin.pattern === "spots" ? (
        <g fill={skin.accent} opacity="0.9">
          <circle cx="17.6" cy="24.8" r="1.05" />
          <circle cx="22.4" cy="24.8" r="1.05" />
          <circle cx="20" cy="28.6" r="1.05" />
        </g>
      ) : null}
      {skin.pattern === "saddle" ? (
        <path d="M20 20.2c3.4 0 5.8 2.2 5.8 4.6h-11.6c0-2.4 2.4-4.6 5.8-4.6Z" fill={skin.accent} opacity="0.55" />
      ) : null}
      <ellipse cx="17.8" cy="23.8" rx="1.9" ry="2.6" fill="#ffffff" opacity="0.1" />

      {/* thorax + head */}
      <circle cx="20" cy="17.6" r="3.5" fill={skin.body} stroke={skin.head} strokeWidth="1.2" />
      <circle cx="20" cy="11.6" r="3" fill={skin.head} stroke={skin.head} strokeWidth="1.1" />

      {/* eyes */}
      <g fill={skin.accent}>
        <circle cx="18.7" cy="11.1" r="0.62" />
        <circle cx="21.3" cy="11.1" r="0.62" />
      </g>

      {skin.accessory === "antenna" ? (
        <g stroke={skin.head} strokeWidth="1.15" strokeLinecap="round" fill="none">
          <path d="M18.4 9 16.4 5.6M21.6 9l2-3.4" />
          <circle cx="16.2" cy="5.2" r="0.9" fill={skin.accent} stroke="none" />
          <circle cx="21.8" cy="5.2" r="0.9" fill={skin.accent} stroke="none" />
        </g>
      ) : null}

      {skin.accessory === "leaf" ? (
        <g>
          <path d="M20 8.2c0-2.4 2-4.2 4.6-4.4-.2 2.6-2 4.6-4.6 4.4Z" fill={skin.accent} stroke={skin.head} strokeWidth="0.7" />
          <path d="M20 8.2 24 4.2" stroke={skin.head} strokeWidth="0.7" />
        </g>
      ) : null}

      {skin.accessory === "flower" ? (
        <g fill={skin.accent} stroke={skin.head} strokeWidth="0.45">
          <circle cx="20" cy="5.4" r="1.15" />
          <circle cx="17.9" cy="6.9" r="1.15" />
          <circle cx="22.1" cy="6.9" r="1.15" />
          <circle cx="18.4" cy="8.9" r="1.15" />
          <circle cx="21.6" cy="8.9" r="1.15" />
        </g>
      ) : null}

      {skin.accessory === "cap" ? (
        <path d="M16.4 9.4c.4-2.4 2-3.8 3.6-3.8s3.2 1.4 3.6 3.8Z" fill={skin.accent} stroke={skin.head} strokeWidth="0.7" />
      ) : null}

      {initial ? (
        <>
          <circle cx="32.6" cy="8.4" r="5.4" fill="#0b2208" opacity="0.82" />
          <text
            x="32.6"
            y="11.4"
            textAnchor="middle"
            fontSize="7.2"
            fontFamily="var(--mono, monospace)"
            fontWeight="700"
            fill={skin.accent}
          >
            {initial}
          </text>
        </>
      ) : null}
    </svg>
  );
}
