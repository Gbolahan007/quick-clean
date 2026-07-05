export const BRAND = {
  dark: "#0a1628",
  green: "#7c9885",
  greenBg: "#f0f8f3",
  greenBorder: "#c8dcd0",
  body: "#f4f6f4",
  text: "#4b5563",
  muted: "#9ca3af",
  white: "#ffffff",
  border: "#e9ede9",
};

// ── Outer wrapper ─────────────────────────────────────────────────────────────
export function emailWrapper(content: string, maxWidth = "560px"): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${BRAND.body};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.body};padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:${maxWidth};background:${BRAND.white};border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(10,22,40,0.07)">
        ${content}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Header ────────────────────────────────────────────────────────────────────
export function emailHeader(subtitle?: string): string {
  return `
  <tr>
    <td style="background:${BRAND.dark};padding:28px 32px">
      <p style="margin:0;font-size:20px;font-weight:800;color:${BRAND.white};letter-spacing:-0.5px">Frosh</p>
      ${subtitle ? `<p style="margin:4px 0 0;font-size:12px;color:${BRAND.green};font-weight:600;text-transform:uppercase;letter-spacing:1px">${subtitle}</p>` : ""}
    </td>
  </tr>`;
}

// ── Status banner ─────────────────────────────────────────────────────────────
export type BannerType = "success" | "warning" | "error" | "info";

const BANNER_STYLES: Record<
  BannerType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "✓" },
  warning: { bg: "#fefce8", border: "#fde68a", text: "#92400e", icon: "⚠" },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", icon: "✗" },
  info: { bg: "#f0f8f3", border: "#c8dcd0", text: "#0a1628", icon: "ℹ" },
};

export function emailBanner(
  message: string,
  type: BannerType = "info",
): string {
  const s = BANNER_STYLES[type];
  return `
  <tr>
    <td style="background:${s.bg};border-bottom:2px solid ${s.border};padding:12px 32px">
      <p style="margin:0;font-size:13px;font-weight:700;color:${s.text}">${s.icon} ${message}</p>
    </td>
  </tr>`;
}

// ── Reference badge ───────────────────────────────────────────────────────────
export function refBadge(bookingId: string): string {
  const ref = bookingId.slice(0, 8).toUpperCase();
  return `
  <div style="background:${BRAND.greenBg};border:1px solid ${BRAND.greenBorder};border-radius:10px;padding:12px 16px;margin-bottom:24px;display:inline-block">
    <span style="font-size:11px;font-weight:700;color:${BRAND.green};text-transform:uppercase;letter-spacing:1px">Ref #${ref}</span>
  </div>`;
}

// ── Detail row ────────────────────────────────────────────────────────────────
export function detailRow(
  label: string,
  value: string,
  highlight = false,
): string {
  if (!value) return "";
  return `
  <tr>
    <td style="padding:8px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;width:160px">${label}</td>
    <td style="padding:8px 0;color:${highlight ? BRAND.dark : "#374151"};font-size:13px;font-weight:${highlight ? "700" : "500"};vertical-align:top">${value}</td>
  </tr>`;
}

// ── Section title + rows ──────────────────────────────────────────────────────
export function detailSection(title: string, rows: string): string {
  return `
  <div style="margin-bottom:8px">
    ${title ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${BRAND.green};text-transform:uppercase;letter-spacing:1px">${title}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0">
      ${rows}
    </table>
  </div>`;
}

// ── Amount display ────────────────────────────────────────────────────────────
export function formatAmount(cents: number, currency = "eur"): string {
  const symbol =
    currency.toLowerCase() === "eur" ? "€" : currency.toUpperCase();
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function emailFooter(extra?: string): string {
  return `
  <tr>
    <td style="background:#f8faf9;border-top:1px solid ${BRAND.border};padding:16px 32px">
      <p style="margin:0;font-size:11px;color:${BRAND.muted};line-height:1.6">
        Frosh · Tampere, Finland · <a href="mailto:hello@frosh.fi" style="color:${BRAND.muted}">hello@frosh.fi</a>
        ${extra ? `<br/>${extra}` : ""}
      </p>
    </td>
  </tr>`;
}

// ── CTA button ────────────────────────────────────────────────────────────────
export function ctaButton(
  label: string,
  href: string,
  secondary = false,
): string {
  const bg = secondary ? "#f8faf9" : BRAND.dark;
  const color = secondary ? "#374151" : BRAND.white;
  const border = secondary ? `border:1px solid #d1d5db;` : "";
  return `<a href="${href}" style="display:inline-block;background:${bg};${border}color:${color};font-size:13px;font-weight:700;padding:12px 22px;border-radius:10px;text-decoration:none">${label}</a>`;
}

// ── Discount block — customer emails ──────────────────────────────────────────
// Renders a green callout when a first-booking or voucher discount was applied.
// Returns empty string when no discount — safe to call unconditionally.

export function discountBlock(params: {
  discountSource?: "first_booking" | "voucher" | null;
  discountAmountCents?: number | null;
  originalAmountCents?: number | null;
  locale?: "en" | "fi";
}): string {
  const {
    discountSource,
    discountAmountCents,
    originalAmountCents,
    locale = "en",
  } = params;
  if (!discountSource || !discountAmountCents || !originalAmountCents)
    return "";

  const saving = formatAmount(discountAmountCents);
  const original = formatAmount(originalAmountCents);

  if (discountSource === "first_booking") {
    const heading =
      locale === "fi"
        ? "🎉 Ensimmäisen varauksen alennus — 25% off"
        : "🎉 First booking discount — 25% off";
    const body =
      locale === "fi"
        ? `Sait 25% alennuksen ensimmäisestä varauksestasi Froshilla. Säästit <strong>${saving}</strong> (alkuperäinen hinta ${original}).`
        : `You received 25% off your first booking with us. You saved <strong>${saving}</strong> (original price ${original}).`;

    return `
    <tr><td style="padding:0 32px 20px">
      <div style="background:#f0f8f3;border:2px solid #7c9885;border-radius:12px;padding:16px 20px">
        <p style="margin:0 0 5px;font-size:14px;font-weight:800;color:#3d6b47">${heading}</p>
        <p style="margin:0;font-size:13px;color:#3d6b47;line-height:1.6">${body}</p>
      </div>
    </td></tr>`;
  }

  // Voucher
  const heading =
    locale === "fi" ? "🏷 Alennuskoodi käytetty" : "🏷 Voucher applied";
  const body =
    locale === "fi"
      ? `Alennuskoodisi on käytetty onnistuneesti. Säästit <strong>${saving}</strong> (alkuperäinen hinta ${original}).`
      : `Your voucher code was applied successfully. You saved <strong>${saving}</strong> (original price ${original}).`;

  return `
  <tr><td style="padding:0 32px 20px">
    <div style="background:#f0f8f3;border:1px solid #d4e8d9;border-radius:12px;padding:16px 20px">
      <p style="margin:0 0 5px;font-size:14px;font-weight:700;color:#3d6b47">${heading}</p>
      <p style="margin:0;font-size:13px;color:#3d6b47;line-height:1.6">${body}</p>
    </div>
  </td></tr>`;
}

// ── Admin discount block ──────────────────────────────────────────────────────
// Compact version for admin emails — English only, shows full price breakdown.

export function adminDiscountBlock(params: {
  isFirstBooking?: boolean;
  discountSource?: "first_booking" | "voucher" | null;
  discountAmountCents?: number | null;
  originalAmountCents?: number | null;
  chargedCents: number;
}): string {
  const {
    isFirstBooking,
    discountSource,
    discountAmountCents,
    originalAmountCents,
    chargedCents,
  } = params;
  if (!discountSource || !discountAmountCents || !originalAmountCents)
    return "";

  const saving = formatAmount(discountAmountCents);
  const original = formatAmount(originalAmountCents);
  const charged = formatAmount(chargedCents);

  if (isFirstBooking || discountSource === "first_booking") {
    return `
    <tr><td style="padding:0 28px 16px">
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 16px">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#c2410c">🎉 First booking — 25% discount applied</p>
        <p style="margin:0;font-size:12px;color:#c2410c;line-height:1.6">
          Original: <strong>${original}</strong> &nbsp;·&nbsp;
          Saving: <strong>${saving}</strong> &nbsp;·&nbsp;
          Charged: <strong>${charged}</strong>
        </p>
      </div>
    </td></tr>`;
  }

  return `
  <tr><td style="padding:0 28px 16px">
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px 16px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0369a1">🏷 Voucher discount applied</p>
      <p style="margin:0;font-size:12px;color:#0369a1;line-height:1.6">
        Original: <strong>${original}</strong> &nbsp;·&nbsp;
        Saving: <strong>${saving}</strong> &nbsp;·&nbsp;
        Charged: <strong>${charged}</strong>
      </p>
    </div>
  </td></tr>`;
}
