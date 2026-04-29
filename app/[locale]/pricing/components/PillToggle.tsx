"use client";

type PillToggleProps = {
  options: string[];
  selected: number;
  onChange: (index: number) => void;
  small?: boolean;
};

// ─── PillToggle ───────────────────────────────────────────────────────────────

export function PillToggle({
  options,
  selected,
  onChange,
  small = false,
}: PillToggleProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: 999,
        border: "1.5px solid rgba(124,152,133,0.3)",
        background: "#f0f5f2",
        padding: 4,
      }}
    >
      {options.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          style={{
            padding: small ? "6px 14px" : "9px 20px",
            borderRadius: 999,
            border: "none",
            fontSize: small ? 13 : 14,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.18s",
            background: selected === i ? "#7c9885" : "transparent",
            color: selected === i ? "#fff" : "rgba(10,22,40,0.6)",
            boxShadow: selected === i ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
