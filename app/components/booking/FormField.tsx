// components/booking/FormField.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable, accessible form primitives used across all booking steps.
// All components are fully typed and use Tailwind utility classes.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React, { forwardRef } from "react";

// ── Input ─────────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errId = error ? `${fieldId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold text-[#0a1628]"
        >
          {label}
          {props.required && (
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="text-[11px] text-gray-400 -mt-0.5">
            {hint}
          </p>
        )}

        <input
          ref={ref}
          id={fieldId}
          aria-describedby={
            [hintId, errId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={!!error}
          className={[
            "w-full px-4 py-3 rounded-xl border text-sm text-[#0a1628]",
            "placeholder:text-gray-300 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#7c9885]/40 focus:border-[#7c9885]",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            error
              ? "border-red-400 bg-red-50/40"
              : "border-gray-200 bg-white hover:border-gray-300",
            className ?? "",
          ].join(" ")}
          {...props}
        />

        {error && (
          <p
            id={errId}
            role="alert"
            className="text-[12px] text-red-500 flex gap-1 items-center"
          >
            <span aria-hidden>⚠</span> {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

// ── Textarea ──────────────────────────────────────────────────────────────────

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errId = error ? `${fieldId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold text-[#0a1628]"
        >
          {label}
          {props.required && (
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="text-[11px] text-gray-400 -mt-0.5">
            {hint}
          </p>
        )}

        <textarea
          ref={ref}
          id={fieldId}
          aria-describedby={
            [hintId, errId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={!!error}
          rows={4}
          className={[
            "w-full px-4 py-3 rounded-xl border text-sm text-[#0a1628] resize-none",
            "placeholder:text-gray-300 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#7c9885]/40 focus:border-[#7c9885]",
            error
              ? "border-red-400 bg-red-50/40"
              : "border-gray-200 bg-white hover:border-gray-300",
            className ?? "",
          ].join(" ")}
          {...props}
        />

        {error && (
          <p
            id={errId}
            role="alert"
            className="text-[12px] text-red-500 flex gap-1 items-center"
          >
            <span aria-hidden>⚠</span> {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

// ── Select ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, placeholder, id, className, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold text-[#0a1628]"
        >
          {label}
          {props.required && (
            <span className="text-[#7c9885] ml-0.5" aria-hidden>
              *
            </span>
          )}
        </label>

        <select
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          className={[
            "w-full px-4 py-3 rounded-xl border text-sm text-[#0a1628] appearance-none",
            "bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23aaa%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
            "bg-no-repeat bg-[right_12px_center]",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#7c9885]/40 focus:border-[#7c9885]",
            error
              ? "border-red-400 bg-red-50/40"
              : "border-gray-200 hover:border-gray-300",
            className ?? "",
          ].join(" ")}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {error && (
          <p
            role="alert"
            className="text-[12px] text-red-500 flex gap-1 items-center"
          >
            <span aria-hidden>⚠</span> {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";

// ── Toggle checkbox ───────────────────────────────────────────────────────────

export interface CheckToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function CheckToggle({
  label,
  description,
  checked,
  onChange,
  id,
}: CheckToggleProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label
      htmlFor={fieldId}
      className={[
        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer",
        "transition-all duration-150",
        checked
          ? "border-[#7c9885] bg-[#f0f8f3]"
          : "border-gray-200 bg-white hover:border-gray-300",
      ].join(" ")}
    >
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={fieldId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={[
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            checked
              ? "bg-[#7c9885] border-[#7c9885]"
              : "bg-white border-gray-300",
          ].join(" ")}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1">
        <p
          className={[
            "text-[13px] font-semibold m-0",
            checked ? "text-[#3d6b47]" : "text-[#0a1628]",
          ].join(" ")}
        >
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-gray-400 m-0 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

// ── Step action buttons ───────────────────────────────────────────────────────

export interface StepActionsProps {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  isLoading?: boolean;
}

export function StepActions({
  onNext,
  onBack,
  nextLabel = "Continue →",
  backLabel = "← Back",
  nextDisabled = false,
  isLoading = false,
}: StepActionsProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={[
            "px-5 py-3 rounded-xl text-sm font-semibold text-[#0a1628]",
            "border border-gray-200 bg-white hover:bg-gray-50",
            "transition-all duration-150 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-[#7c9885]/40",
          ].join(" ")}
        >
          {backLabel}
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || isLoading}
        className={[
          "px-7 py-3 rounded-xl text-sm font-bold text-white",
          "bg-[#7c9885] hover:bg-[#6a8873] active:bg-[#5c7a65]",
          "shadow-[0_2px_8px_rgba(124,152,133,0.4)]",
          "transition-all duration-150 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#7c9885]/60 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        ].join(" ")}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Submitting…
          </span>
        ) : (
          nextLabel
        )}
      </button>
    </div>
  );
}
