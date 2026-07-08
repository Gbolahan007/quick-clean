"use client";

import { inviteAdmin } from "@/app/admin/actions/staffActions";
import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

// ── InviteAdminForm ───────────────────────────────────────────────────────────

export function InviteAdminForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await inviteAdmin(email, fullName);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(
          `Invite sent to ${email}. They'll receive an email to set their password.`,
        );
        setEmail("");
        setFullName("");
        setOpen(false);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold text-[#0a1628]">Invite admin</p>
          <p className="text-[12px] text-gray-400">
            Send an email invite. They&apos;ll set their password on first
            login.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1628] text-[12px] font-bold text-white hover:bg-[#1a2a40] transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {success && (
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-[#f0f8f3] border border-[#d4e8d9] px-4 py-3">
            <p className="text-[13px] text-[#3d6b47]">{success}</p>
          </div>
        </div>
      )}

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[#0a1628]">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[#0a1628]">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@frosh.fi"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#7c9885]/30 focus:border-[#7c9885] transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !email || !fullName}
              className="px-5 py-2 rounded-xl bg-[#7c9885] text-[13px] font-bold text-white hover:bg-[#6f8c78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Sending invite…" : "Send invite"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
