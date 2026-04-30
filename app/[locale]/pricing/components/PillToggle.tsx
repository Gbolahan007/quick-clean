// components/PillToggle.tsx
"use client";

type PillToggleProps = {
  options: string[];
  selected: number;
  onChange: (index: number) => void;
  small?: boolean;
};

export function PillToggle({
  options,
  selected,
  onChange,
  small = false,
}: PillToggleProps) {
  return (
    <div className="inline-flex w-full rounded-full border border-[#7c9885]/30 bg-[#f0f5f2] p-1 md:w-auto">
      {options.map((label, i) => {
        const isActive = selected === i;

        return (
          <button
            key={`${label}-${i}`}
            type="button"
            onClick={() => onChange(i)}
            className={[
              "min-w-0 flex-1 rounded-full font-semibold transition-all duration-200 whitespace-normal leading-snug md:flex-none md:whitespace-nowrap",
              small ? "px-3.5 py-1.5 text-[13px]" : "px-5 py-2.5 text-sm",
              isActive
                ? "bg-[#7c9885] text-white shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                : "bg-transparent text-slate-900/60 hover:bg-white/60",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
