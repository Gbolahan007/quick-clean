"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { removeAdmin } from "../actions/staffActions";

export function RemoveAdminButton({
  adminId,
  adminName,
}: {
  adminId: string;
  adminName: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (removed) {
    return <span className="text-[11px] text-gray-400">Removed</span>;
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title={`Remove ${adminName}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="text-[12px] text-gray-500 text-right">
        Remove <strong>{adminName}</strong>?
      </p>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await removeAdmin(adminId);
              if (!result.success) {
                setError(result.error);
              } else {
                setRemoved(true);
              }
            });
          }}
          className="px-3 py-1.5 rounded-lg bg-red-500 text-[12px] font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Removing…" : "Remove"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirm(false);
            setError(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
