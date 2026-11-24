import Link from "next/link";
import type { ReactNode } from "react";
import { RARITIES, TOPIC_PACKS, type Rarity, type TopicPack } from "@/lib/config";

/**
 * The macro world: giant grass above, soil strata below. Static SVG only, so
 * it costs one paint instead of a main-thread animation budget.
 */
export function MacroWorld() {
  return (
    <div className="macro-world" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <rect width="1600" height="1000" fill="#1A0F08" />
        <path d="M0 0h1600v384c-140-24-262-88-392-162C1070 146 952 78 830 66 660 50 520 142 382 218 252 290 128 346 0 360Z" fill="#24170D" />
        <path d="M0 0h1600v296c-152-16-282-62-408-124C1050 106 930 42 800 40 620 38 480 128 348 196 220 262 112 292 0 296Z" fill="#2B1A0E" />
        <g className="grass-canopy">
          <path d="M92 44C40 176 38 320 74 466 104 588 150 706 194 826c8 24 44 20 48-6 26-166 22-340 10-512C240 186 200 92 144 28c-12-16-40-6-52 16Z" fill="#4A7C2F" />
          <path d="M316 22c-44 142-40 300 8 448 40 122 96 238 150 348 12 24 50 16 48-12-14-174-46-346-98-510C384 158 350 76 326 14c-6-18-8-10-10 8Z" fill="#3F6A28" />
          <path d="M570 8c-28 156-8 320 52 470 44 112 102 218 158 318 12 22 46 14 46-12 0-172-24-346-72-512C706 142 666 60 610 2c-14-20-34-16-40 6Z" fill="#4A7C2F" />
          <path d="M864 16c-10 154 26 314 92 454 52 112 116 214 178 310 14 22 48 10 44-16-28-172-74-340-136-498C988 128 940 52 888 6c-16-14-24-4-24 10Z" fill="#3F6A28" />
          <path d="M1162 32c-2 150 44 302 120 430 58 98 124 188 190 270 16 20 48 6 40-20-52-168-118-330-194-482C1254 116 1204 52 1168 18c-12-12-6-2-6 14Z" fill="#4A7C2F" />
          <path d="M1432 20c8 146 56 288 132 408 48 78 96 150 144 218 18 26 50 10 38-20-62-156-136-306-220-448C1484 108 1464 60 1440 12c-8-16-8-8-8 8Z" fill="#3F6A28" />
          <path d="M0 522c84-58 150-142 188-244 8-20 2-46-14-58-84 102-150 216-200 338Z" fill="#3F6A28" opacity=".7" />
        </g>
        <g fill="none" stroke="#7A9B3E" strokeWidth="3" opacity=".5">
          <path d="M250 0c-22 110-4 214 50 300" />
          <path d="M732 0c14 116 58 220 126 304" />
          <path d="M1324 0c-6 112 30 218 96 302" />
        </g>
        <g className="dew-drops">
          <circle cx="210" cy="318" r="12" fill="#7EC8E3" opacity=".85" />
          <circle cx="204" cy="311" r="3" fill="#F2E8D5" opacity=".7" />
          <circle cx="470" cy="242" r="8" fill="#7EC8E3" opacity=".7" />
          <circle cx="1052" cy="336" r="14" fill="#7EC8E3" opacity=".8" />
          <circle cx="1044" cy="328" r="4" fill="#F2E8D5" opacity=".75" />
          <circle cx="1378" cy="258" r="9" fill="#7EC8E3" opacity=".65" />
        </g>
        <g stroke="#3A2717" fill="none" strokeWidth="2" opacity=".7">
          <path d="M0 468c190 18 380 14 560-14 180-28 360-24 550 8 170 28 330 32 490 18" />
          <path d="M0 604c164-18 322-12 470 12 196 32 392 32 590 2 182-28 358-26 540 4" />
          <path d="M0 760c206 20 412 22 618 2 206-20 412-20 618 2 122 12 244 16 364 10" />
        </g>
        <g stroke="#5A3B22" fill="none" strokeWidth="5" strokeLinecap="round" opacity=".55">
          <path d="M120 1000c10-112 74-180 160-218 74-32 120-78 142-146" />
          <path d="M120 1000c-4-74 24-124 76-160" />
          <path d="M1390 1000c-16-126-86-204-180-244-58-24-100-58-130-112" />
          <path d="M1390 1000c8-74-18-128-66-166" />
          <path d="M760 1000c2-86-34-150-98-196-36-26-58-58-66-100" />
        </g>
        <g fill="#3A2717" opacity=".75">
          <ellipse cx="340" cy="872" rx="38" ry="20" />
          <ellipse cx="370" cy="860" rx="22" ry="14" />
          <ellipse cx="1120" cy="900" rx="52" ry="26" />
          <ellipse cx="1160" cy="882" rx="24" ry="16" />
          <ellipse cx="620" cy="936" rx="26" ry="14" />
          <ellipse cx="1490" cy="792" rx="30" ry="18" />
        </g>
        <g stroke="#A8E063" fill="none" strokeWidth="2" opacity=".35" strokeLinecap="round">
          <path d="M818 1000c-8-80 12-154 52-214M840 900c-20-18-36-40-44-68M836 946c16-14 28-32 34-54" />
          <path d="M190 1000c2-60 26-104 66-132M220 950c-18-8-34-20-46-38" />
        </g>
      </svg>
    </div>
  );
}

const ICON_PATHS: Record<TopicPack["icon"], ReactNode> = {
  all: (
    <>
      <circle cx="7" cy="15" r="3" />
      <circle cx="14" cy="8" r="3.4" />
      <circle cx="20" cy="16" r="2.7" />
      <path d="M9.6 13.4 11.5 10.6M16.8 10.1l2 3.8M9.8 16.2l7.6.3" />
    </>
  ),
  globe: (
    <>
      <circle cx="14" cy="14" r="9.5" />
      <path d="M4.5 14h19M14 4.5c3 3.2 3 15.4 0 19M14 4.5c-3 3.2-3 15.4 0 19" />
    </>
  ),
  pin: (
    <>
      <path d="M14 3.5c-4.4 0-8 3.5-8 7.8 0 5.8 8 13.2 8 13.2s8-7.4 8-13.2c0-4.3-3.6-7.8-8-7.8Z" />
      <circle cx="14" cy="11.5" r="2.6" />
    </>
  ),
  flask: (
    <>
      <path d="M10 3h8M11.5 3v6L5 22h18L16.5 9V3" />
      <path d="M8 16h12" />
    </>
  ),
  paw: (
    <>
      <ellipse cx="14" cy="18" rx="5" ry="4.2" />
      <ellipse cx="6.5" cy="12" rx="2.1" ry="2.8" />
      <ellipse cx="11" cy="7.5" rx="2.1" ry="2.8" />
      <ellipse cx="17" cy="7.5" rx="2.1" ry="2.8" />
      <ellipse cx="21.5" cy="12" rx="2.1" ry="2.8" />
    </>
  ),
  bowl: (
    <>
      <path d="M3.5 12h21c0 5.4-4.7 9.5-10.5 9.5S3.5 17.4 3.5 12Z" />
      <path d="M8 9c0-2.2 3-2.2 3-4.5M14 9c0-2.2 3-2.2 3-4.5M20 9c0-2.2 3-2.2 3-4.5" />
    </>
  ),
  medal: (
    <>
      <circle cx="14" cy="17" r="6" />
      <path d="m9 3 4 6M19 3l-4 6M14 14l1.2 2.4 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3Z" />
    </>
  ),
  note: (
    <>
      <path d="M11 21V5l10-2v15" />
      <ellipse cx="7.5" cy="21.5" rx="4" ry="3" />
      <ellipse cx="17.5" cy="18.5" rx="4" ry="3" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="6" width="22" height="16" rx="2" />
      <path d="M3 11h22M8 6v16M20 6v16" />
      <path d="M8 16h12" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 9h14c3 0 5 2.2 5 5.2 0 4-2 6-4.2 6-2 0-3-1.8-4.2-3.2h-3.2C13.2 18.4 12.2 20.2 10.2 20.2 8 20.2 6 18.2 6 14.2 6 11.2 4 9 7 9Z" />
      <path d="M9 12v4M7 14h4M18 13h.1M20.5 15h.1" />
    </>
  ),
  letters: (
    <>
      <path d="M4 20 8.5 6l4.5 14M5.6 15.5h5.8M16 20V9l4 11 4-11v11" />
    </>
  ),
  bolt: (
    <>
      <path d="M15 2 4.5 16H12l-2 10L21 12h-7l1-10Z" />
    </>
  ),
  star: (
    <>
      <path d="m14 2 3.2 6.8 7.3 1-5.3 5.3 1.3 7.4-6.5-3.4-6.5 3.4 1.3-7.4L3.5 9.8l7.3-1Z" />
    </>
  ),
  spark: (
    <>
      <path d="M14 2v8M14 18v8M2 14h8M18 14h8M5.5 5.5l5.6 5.6M16.9 16.9l5.6 5.6M22.5 5.5l-5.6 5.6M11.1 16.9l-5.6 5.6" />
    </>
  ),
};

export function PackIcon({ icon, size = 20 }: { icon: TopicPack["icon"]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}

export function PackRow({ packs, size = 18 }: { packs: string[]; size?: number }) {
  const selected = packs.includes("all")
    ? TOPIC_PACKS.filter((pack) => pack.id === "all")
    : TOPIC_PACKS.filter((pack) => packs.includes(pack.id));
  return (
    <span className="pack-inline">
      {selected.map((pack) => (
        <span key={pack.id} className="pack-inline-item">
          <PackIcon icon={pack.icon} size={size} />
          {pack.short}
        </span>
      ))}
    </span>
  );
}

const CASTE_ICONS: Record<Rarity, ReactNode> = {
  forager: <path d="M14 25C6 20 5 11 8 4c7 4 10 12 6 21ZM8 5c4 0 8 4 9 9" />,
  soldier: (
    <>
      <path d="M6 5c0 7 3 12 8 14M22 5c0 7-3 12-8 14" />
      <path d="M6 5 4 3M22 5l2-2M14 19v5M10 24h8" />
    </>
  ),
  royal: (
    <>
      <path d="M14 3 23 6v8c0 5-4 9-9 11-5-2-9-6-9-11V6Z" />
      <path d="M14 9v7M10.5 12.5h7" />
    </>
  ),
  queen: (
    <>
      <path d="m4 9 5 4 5-8 5 8 5-4-2 12H6Z" />
      <path d="M7 25h14" />
    </>
  ),
  apex: (
    <>
      <circle cx="14" cy="14" r="5" />
      <path d="M14 2v3M14 23v3M2 14h3M23 14h3M5.5 5.5l2 2M20.5 20.5l2 2M22.5 5.5l-2 2M7.5 20.5l-2 2" />
      <circle cx="14" cy="14" r="1.4" fill="currentColor" />
    </>
  ),
};

export function CasteBadge({
  rarity,
  size = 20,
  withLabel = false,
}: {
  rarity: string;
  size?: number;
  withLabel?: boolean;
}) {
  const key = (rarity in RARITIES ? rarity : "forager") as Rarity;
  const meta = RARITIES[key];
  return (
    <span className={`caste caste-${key}${withLabel ? " caste-with-label" : ""}`} title={`${meta.name} · ${meta.value} points`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {CASTE_ICONS[key]}
      </svg>
      {withLabel ? <span>{meta.name}</span> : <span className="sr-only">{meta.name}</span>}
    </span>
  );
}

export function CasteRibbon() {
  return (
    <div className="caste-ribbon" aria-label="Answer castes, from common to secret">
      {(Object.keys(RARITIES) as Rarity[]).map((rarity) => (
        <CasteBadge key={rarity} rarity={rarity} size={18} withLabel />
      ))}
    </div>
  );
}

export function AntAvatar({ name, index, size = 40 }: { name: string; index: number; size?: number }) {
  const initial = [...name.trim()][0]?.toUpperCase() ?? "?";
  return (
    <span
      className="ant-avatar"
      style={{ width: size, height: size, ["--bug-hue" as string]: `${(index * 47) % 360}` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="18" fill="#2B1A0E" stroke="#7A9B3E" strokeWidth="2" />
        <g fill="#E8D5B5" stroke="#1A0F08" strokeWidth="1">
          <ellipse cx="20" cy="27" rx="5.2" ry="6.2" />
          <circle cx="20" cy="19" r="3.1" />
          <circle cx="20" cy="13" r="2.7" />
        </g>
        <g stroke="#E8D5B5" strokeWidth="1.3" strokeLinecap="round">
          <path d="M15 17 10 13M15 20l-5 1M15 25l-4 4M25 17l5-4M25 20l5 1M25 25l4 4M18.5 11 17 7M21.5 11l1.5-4" />
        </g>
        <text x="33" y="11" textAnchor="middle" fontSize="9" fill="#F5A623" fontFamily="var(--mono)">
          {initial}
        </text>
      </svg>
    </span>
  );
}

const LAYERS = [
  { name: "Surface", at: 0 },
  { name: "Topsoil", at: 200 },
  { name: "Subsoil", at: 500 },
  { name: "Deep Tunnel", at: 1000 },
  { name: "Queen's Chamber", at: 2000 },
];

export function SoilGauge({
  score = 0,
  compact = false,
  label = "Your colony depth",
}: {
  score?: number;
  compact?: boolean;
  label?: string;
}) {
  const max = 2500;
  const capped = Math.max(0, Math.min(max, score));
  const percent = Math.min(100, (Math.log10(capped + 1) / Math.log10(max + 1)) * 100);
  const layer =
    [...LAYERS].reverse().find((entry) => score >= entry.at)?.name ?? "Surface";
  return (
    <section className={`soil-gauge${compact ? " is-compact" : ""}`} aria-label={`${label}: ${score} points, ${layer}`}>
      <div className="soil-gauge-head">
        <span className="soil-gauge-label">{compact ? "Depth" : "Colony depth"}</span>
        <span className="soil-gauge-score">{score.toLocaleString()}</span>
      </div>
      <div className="soil-track">
        {LAYERS.map((entry) => (
          <span key={entry.name} className={`soil-layer${score >= entry.at ? " reached" : ""}`}>
            {entry.name}
          </span>
        ))}
        <span className="soil-bug" style={{ top: `${Math.min(94, Math.max(2, percent))}%` }} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <ellipse cx="12" cy="16" rx="3.4" ry="4.4" fill="currentColor" stroke="none" />
            <circle cx="12" cy="10" r="2.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="6.4" r="1.8" fill="currentColor" stroke="none" />
            <path d="M9 9 5.5 6.5M9 11H4.8M9 14l-3.8 2.6M15 9l3.5-2.5M15 11h4.2M15 14l3.8 2.6" />
          </svg>
        </span>
      </div>
      <span className="soil-gauge-layer">{layer}</span>
    </section>
  );
}

export function RoomCode({ code, href }: { code: string; href?: string }) {
  return (
    <div className="room-code-wrap">
      <span className="room-code-label">Room code</span>
      <span className="room-code-big">{code}</span>
      {href ? (
        <Link className="room-code-link" href={href}>
          Invite link
        </Link>
      ) : null}
    </div>
  );
}
