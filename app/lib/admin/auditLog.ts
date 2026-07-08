import { createClient } from "@supabase/supabase-js";
import type { AdminProfile } from "@/app/lib/supabase/admin";

// ── Audit action constants ────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  ADMIN_LOGIN: "admin.login",
  ADMIN_LOGOUT: "admin.logout",
  BOOKING_CONFIRMED: "booking.confirmed",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_RESCHEDULED: "booking.rescheduled",
  BOOKING_NOTE_ADDED: "booking.note_added",
  BOOKING_STATUS_CHANGED: "booking.status_changed",
  CUSTOMER_EDITED: "customer.edited",
  CUSTOMER_NOTE_ADDED: "customer.note_added",
  PAYMENT_REFUNDED: "payment.refunded",
  PAYMENT_REMINDER_SENT: "payment.reminder_sent",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  SUBSCRIPTION_REACTIVATED: "subscription.reactivated",
  VOUCHER_CREATED: "voucher.created",
  VOUCHER_DEACTIVATED: "voucher.deactivated",
  VOUCHER_UPDATED: "voucher.updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type AuditEntityType =
  | "booking"
  | "customer"
  | "payment"
  | "subscription"
  | "voucher"
  | "admin"
  | "system";

// ── writeAuditLog ─────────────────────────────────────────────────────────────

export interface WriteAuditLogParams {
  admin: AdminProfile;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(
  params: WriteAuditLogParams,
): Promise<void> {
  const {
    admin,
    action,
    entityType,
    entityId,
    beforeSnapshot,
    afterSnapshot,
    metadata,
  } = params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("[audit] Missing Supabase env vars — audit log not written");
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    before_snapshot: beforeSnapshot ?? null,
    after_snapshot: afterSnapshot ?? null,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error(
      `[audit] Failed to write '${action}' for admin ${admin.id}:`,
      error.message,
    );
  }
}
