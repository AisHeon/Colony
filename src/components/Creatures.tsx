import type { ModeId } from "@/lib/config";

/** Original line-art creature marks. Small, monochrome, currentColor. */
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function AntMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <ellipse cx="8.5" cy="15" rx="2.6" ry="3.4" />
      <circle cx="14.5" cy="11.5" r="1.9" />
      <circle cx="18.4" cy="8.6" r="1.7" />
      <path d="M7.2 11.8 4.4 9.2M9.9 11.8l2.3-2.4M6.2 15.4H3.4M10.9 15.4h2.4M7.4 18.2 5 20.4M9.7 18.2l2.3 2.2M16.6 7.1l1.7-2.4M19.6 6.9l2-1.2" />
    </svg>
  );
}

export function BeeMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <ellipse cx="12" cy="13.6" rx="4.2" ry="5.6" />
      <path d="M8.2 11.4h7.6M7.9 14.2h8.2M8.6 17h6.8M11 19.2h2" />
      <path d="M8.9 8.4C6.6 6.2 3.4 6.4 3.2 9.2c-.2 2.4 2.8 3.4 5.2 2.2M15.1 8.4c2.3-2.2 5.5-2 5.7.8.2 2.4-2.8 3.4-5.2 2.2" />
      <path d="M10.4 8.1 9.4 5.6M13.6 8.1l1-2.5" />
    </svg>
  );
}

export function WebMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 3.4v17.2M3.4 12h17.2M6 6l12 12M18 6 6 18" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HopperMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M4.5 16.4c2.6 1.6 6 1.4 8.4-.6 2.3-1.9 3.2-4.6 2.6-7.1" />
      <circle cx="17.4" cy="7.4" r="2.2" />
      <path d="M16 5.7 15 3.2M18.8 5.8l1.6-2.2M15.4 9.4c-1.1.9-2.3 1.2-3.6 1" />
      <path d="M5.2 16.8 3 19.6M8.4 17.8l-1.4 3M11.8 17.4l-.6 3.2M15 15.6l1.8 2.6M17.6 13.2l2.6 1.4" />
    </svg>
  );
}

export function ColonyMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="6.6" cy="13.8" r="2.5" />
      <circle cx="13" cy="8.4" r="2.8" />
      <circle cx="18.2" cy="15" r="2.3" />
      <path d="M9 12.4 10.7 10.6M15.4 10.1l1.6 3.2M8.7 15.2l7 .4" />
      <path d="M6.6 11.3V8.6M13 5.6v1.4M18.2 12.7v-1.6" />
    </svg>
  );
}

export function ModeMark({ mode, size = 22 }: { mode: ModeId; size?: number }) {
  switch (mode) {
    case "anthill":
      return <AntMark size={size} />;
    case "beehive":
      return <BeeMark size={size} />;
    case "spider":
      return <WebMark size={size} />;
    case "hopper":
      return <HopperMark size={size} />;
    default:
      return <ColonyMark size={size} />;
  }
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="wordmark">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#2F6B4F" />
        <g
          fill="none"
          stroke="#F7F7F2"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="19" rx="3.2" ry="4.2" />
          <circle cx="20.5" cy="13.5" r="2.6" />
          <path d="M10.4 14.6 7 11.4M13.6 14.6 17 11.4M9 19.6H5.8M15 19.6h3.2M10.8 23.2 8 25.6M13.2 23.2l2.8 2.4" />
        </g>
      </svg>
      <span>Colony</span>
    </span>
  );
}
