"use client";

import { TOPIC_PACKS } from "@/lib/config";
import { PackIcon } from "@/components/ColonyWorld";

export function TopicPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const selected = value.length ? value : ["all"];

  function toggle(id: string) {
    if (selected.includes("all") && id !== "all") {
      onChange([id]);
      return;
    }
    if (id === "all") {
      onChange(["all"]);
      return;
    }
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    onChange(next.length ? next.slice(0, 4) : ["all"]);
  }

  return (
    <div className={`pack-grid${compact ? " is-compact" : ""}`} role="group" aria-label="Topic packs">
      {TOPIC_PACKS.map((pack) => {
        const active = selected.includes(pack.id) || (pack.id !== "all" && selected.includes("all"));
        return (
          <button
            key={pack.id}
            type="button"
            className={`pack-chip${active ? " is-active" : ""}`}
            aria-pressed={selected.includes(pack.id)}
            disabled={disabled}
            onClick={() => toggle(pack.id)}
          >
            <PackIcon icon={pack.icon} size={compact ? 18 : 21} />
            <span>{compact ? pack.short : pack.name}</span>
          </button>
        );
      })}
    </div>
  );
}
