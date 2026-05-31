// app/lib/email/templates/adminNotification.ts
// Internal booking notification sent to hello@quickclean.fi on every new booking.
// Always in English regardless of customer locale.

import type { BookingEmailData } from "../types";

function row(label: string, value: string, highlight = false): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:7px 0;color:#6b7280;font-size:12px;white-space:nowrap;vertical-align:top;width:160px">${label}</td>
      <td style="padding:7px 0;font-size:12px;font-weight:${highlight ? "700" : "500"};color:${highlight ? "#0a1628" : "#374151"};vertical-align:top">${value}</td>
    </tr>`;
}

function section(title: string, content: string): string {
  return `
    <tr>
      <td style="padding:20px 0 0">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#7c9885;text-transform:uppercase;letter-spacing:1px">${title}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0">
          ${content}
        </table>
      </td>
    </tr>`;
}

export function buildAdminNotificationEmail(data: BookingEmailData): {
  subject: string;
  html: string;
} {
  const ref = data.bookingId.slice(0, 8).toUpperCase();
  const subject = `New booking #${ref} — ${data.serviceType} · ${data.cleaningDate}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f0;padding:24px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(10,22,40,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#0a1628;padding:20px 28px;border-bottom:3px solid #7c9885">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;font-weight:800;color:#7c9885;text-transform:uppercase;letter-spacing:1px">QuickClean — Admin</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#ffffff">New Booking</p>
                </td>
                <td align="right">
                  <div style="background:#7c9885;border-radius:8px;padding:8px 14px;display:inline-block">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px">Ref #${ref}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert strip -->
        <tr>
          <td style="background:#fefce8;border-bottom:1px solid #fde68a;padding:10px 28px">
            <p style="margin:0;font-size:12px;color:#92400e;font-weight:600">
              ⚡ Action required — assign a cleaner and confirm the booking in the dashboard.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 28px 0">
            <table width="100%" cellpadding="0" cellspacing="0">

              ${section(
                "Booking",
                `
                ${row("Booking ID", data.bookingId, true)}
                ${row("Service", data.serviceType, true)}
                ${row("Plan", data.planLabel)}
                ${row("Date", data.cleaningDate, true)}
                ${row("Time", data.cleaningTime, true)}
                ${row("Duration", data.estimatedDuration)}
                ${row("Total price", `${data.totalPrice} (incl. VAT 25.5%)`)}
                ${row("Payment", data.paymentMethod)}
                ${row("Subscription", data.subscriptionPlan)}
                ${data.nextCleaningDate ? row("Next cleaning", data.nextCleaningDate) : ""}
              `,
              )}

              ${section(
                "Customer",
                `
                ${row("Name", `${data.customerFirstName} ${data.customerLastName}`, true)}
                ${row("Email", `<a href="mailto:${data.customerEmail}" style="color:#7c9885">${data.customerEmail}</a>`)}
                ${row("Phone", data.customerPhone ?? "—")}
                ${row("Locale", data.locale.toUpperCase())}
              `,
              )}

              ${section(
                "Service address",
                `
                ${row("Address", data.address, true)}
              `,
              )}

              ${
                data.specialInstructions
                  ? section(
                      "Customer instructions",
                      `
                <tr>
                  <td colspan="2" style="padding:8px 0">
                    <div style="background:#f9fafb;border-left:3px solid #7c9885;padding:10px 14px;border-radius:0 6px 6px 0">
                      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;font-style:italic">${data.specialInstructions}</p>
                    </div>
                  </td>
                </tr>
              `,
                    )
                  : ""
              }

              ${section(
                "Assigned cleaner",
                `
                ${row("Cleaner", data.cleanerName ?? "⚠️ Not yet assigned — please assign in dashboard")}
              `,
              )}

            </table>
          </td>
        </tr>

        <!-- Quick actions -->
        <tr>
          <td style="padding:24px 28px">
            <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Quick actions</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px">
                  <a href="https://quickclean.fi/admin/bookings/${data.bookingId}"
                     style="display:inline-block;background:#0a1628;color:#ffffff;font-size:12px;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none">
                    View in dashboard →
                  </a>
                </td>
                <td>
                  <a href="mailto:${data.customerEmail}"
                     style="display:inline-block;background:#f8faf9;border:1px solid #d1d5db;color:#374151;font-size:12px;font-weight:600;padding:10px 18px;border-radius:8px;text-decoration:none">
                    Email customer
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Meta footer -->
        <tr>
          <td style="background:#f8faf9;border-top:1px solid #e9ede9;padding:14px 28px">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
              Booking created: ${data.createdAt}
              · Customer locale: ${data.locale.toUpperCase()}
              · Booking ID: ${data.bookingId}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  return { subject, html };
}
