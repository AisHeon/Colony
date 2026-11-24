"use client";

import { useEffect } from "react";
import { RARITIES, type Rarity } from "@/lib/config";
import { CasteBadge } from "@/components/ColonyWorld";

export type RareMoment = {
  id: number;
  rarity: Rarity;
  name: string;
  points: number;
  shared: boolean;
};

const PARTICLE_COUNT: Record<Rarity, number> = {
  forager: 0,
  soldier: 10,
  royal: 18,
  queen: 30,
  apex: 42,
};

const TITLES: Record<Rarity, string> = {
  forager: "FORAGER",
  soldier: "SOLDIER",
  royal: "ROYAL GUARD",
  queen: "QUEEN",
  apex: "APEX",
};

export function RareAnswerEffect({ moment, onDone }: { moment: RareMoment; onDone: () => void }) {
  const rarity = moment.rarity;

  useEffect(() => {
    const timeout = window.setTimeout(onDone, rarity === "apex" ? 2600 : rarity === "queen" ? 2200 : 1600);
    return () => window.clearTimeout(timeout);
  }, [moment.id, onDone, rarity]);

  if (rarity === "forager") return null;

  const count = PARTICLE_COUNT[rarity];
  const particles = Array.from({ length: count }, (_, index) => {
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + (index % 3) * 0.3;
    const distance = 90 + ((index * 37) % 160);
    return {
      id: index,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 24,
      delay: (index % 7) * 28,
      size: 4 + ((index * 13) % 8),
      icon: index % 9 === 0,
    };
  });

  return (
    <div
      className={`rare-layer rare-${rarity}`}
      role="status"
      aria-live="assertive"
      aria-label={`${RARITIES[rarity].name}: ${moment.name}, ${moment.points} points`}
    >
      <div className="rare-wash" aria-hidden="true" />
      <div className="rare-stage" aria-hidden="true">
        <div className="rare-stamp">
          <CasteBadge rarity={rarity} size={rarity === "apex" ? 62 : 54} />
          <span className="rare-title">{TITLES[rarity]}</span>
          <span className="rare-answer">{moment.name}</span>
          <span className="rare-points">
            +{moment.points.toLocaleString()}
            {moment.shared ? " · shared" : ""}
          </span>
        </div>
        {particles.map((particle) => (
          <span
            key={particle.id}
            className={`rare-particle${particle.icon ? " is-icon" : ""}`}
            style={{
              ["--dx" as string]: `${particle.x}px`,
              ["--dy" as string]: `${particle.y}px`,
              ["--delay" as string]: `${particle.delay}ms`,
              ["--size" as string]: `${particle.size}px`,
            }}
          >
            {particle.icon ? <CasteBadge rarity={rarity} size={18} /> : null}
          </span>
        ))}
        {rarity === "apex" ? <span className="rare-apex-ring" /> : null}
      </div>
    </div>
  );
}
