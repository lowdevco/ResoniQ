import React, { useRef } from "react";
import { FaLock, FaUnlock } from "react-icons/fa";
import { OPEN, ROOM_MODES } from "../lib/roomModes";

const STYLES = {
  compact: {
    button: "p-3 rounded-lg",
    icon: "text-base mb-1",
    label: "text-[11px] mb-0.5",
    description: "text-[11px]",
  },
  regular: {
    button: "p-4 rounded-xl",
    icon: "text-xl mb-2",
    label: "text-sm mb-1",
    description: "text-xs",
  },
};

function ModePicker({ value, onChange, compact = false, labelledBy }) {
  const style = compact ? STYLES.compact : STYLES.regular;
  const buttons = useRef([]);

  const onKeyDown = (e, index) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + ROOM_MODES.length) % ROOM_MODES.length;
    onChange(ROOM_MODES[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div
      className="flex flex-col gap-2"
      role="radiogroup"
      aria-label={labelledBy ? undefined : "Room mode"}
      aria-labelledby={labelledBy}
    >
      {ROOM_MODES.map((mode, index) => {
        const selected = value === mode.value;
        const Icon = mode.value === OPEN ? FaUnlock : FaLock;
        return (
          <button
            key={mode.value}
            ref={(el) => (buttons.current[index] = el)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(mode.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`flex flex-col ${style.button} border text-center transition duration-150 items-center justify-center ${
              selected
                ? "bg-brand/10 border-brand"
                : "bg-[#2a2a2a] border-transparent hover:border-white/10"
            }`}
          >
            <Icon aria-hidden className={`${style.icon} ${selected ? "text-brand" : "text-[#b3b3b3]"}`} />
            <span className={`${style.label} font-bold ${selected ? "text-white" : "text-[#b3b3b3]"}`}>
              {mode.label}
            </span>
            <span className={`${style.description} ${selected ? "text-white/80" : "text-[#a7a7a7]"}`}>
              {mode.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ModePicker;
