// ─── Badge ────────────────────────────────────────────────────────────────────

import { ReactNode } from "react";

type BadgeVariant = "popular" | "recommended";

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

type SectionLabelProps = {
  children: ReactNode;
};
export function Badge({ label, variant }: BadgeProps) {
  const bg = variant === "popular" ? "#0a1628" : "rgba(255,255,255,0.2)";
  const color = variant === "popular" ? "#fff" : "#fff";

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
/**
 * Consistent uppercase eyebrow label used above the apartment grid and
 * plan card grid.
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p
      style={{
        margin: "0 0 14px",
        fontSize: 13,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "rgba(10,22,40,0.5)",
      }}
    >
      {children}
    </p>
  );
}
