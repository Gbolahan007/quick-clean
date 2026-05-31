import type { BookingEmailData, EmailLocale } from "../types";

// ── Localised copy ────────────────────────────────────────────────────────────

const copy: Record<
  EmailLocale,
  {
    subject: (date: string) => string;
    greeting: (name: string) => string;
    intro: string;
    detailsTitle: string;
    fields: {
      service: string;
      date: string;
      time: string;
      duration: string;
      address: string;
      cleaner: string;
      price: string;
      payment: string;
      plan: string;
      nextCleaning: string;
      instructions: string;
    };
    expectTitle: string;
    expect: [string, string, string];
    helpText: string;
    helpEmail: string;
    sign: string;
    vatNote: string;
    tbc: string;
  }
> = {
  en: {
    subject: (date) => `Your cleaning is booked — ${date}`,
    greeting: (name) => `Hi ${name},`,
    intro: "You're all set. Here are your booking details:",
    detailsTitle: "Booking details",
    fields: {
      service: "Service",
      date: "Date",
      time: "Time",
      duration: "Duration",
      address: "Address",
      cleaner: "Your cleaner",
      price: "Price",
      payment: "Payment",
      plan: "Your plan",
      nextCleaning: "Next cleaning",
      instructions: "Your instructions",
    },
    expectTitle: "What to expect",
    expect: [
      "We will arrive at the scheduled time. Please make sure we can access your home.",
      "We bring our own supplies — professional, eco-friendly products and equipment.",
      "Same cleaner, every time. We will learn your home and your preferences over time.",
    ],
    helpText:
      "Need to reschedule or have a question? Just reply to this email or reach us at",
    helpEmail: "hello@quickclean.fi",
    sign: "Enjoy your clean home. — The QuickClean team",
    vatNote: "incl. VAT 25.5%",
    tbc: "To be confirmed",
  },
  fi: {
    subject: (date) => `Siivouksesi on varattu — ${date}`,
    greeting: (name) => `Hei ${name},`,
    intro: "Kaikki on valmista. Tässä varauksesi tiedot:",
    detailsTitle: "Varauksen tiedot",
    fields: {
      service: "Palvelu",
      date: "Päivämäärä",
      time: "Aika",
      duration: "Kesto",
      address: "Osoite",
      cleaner: "Siivoojasi",
      price: "Hinta",
      payment: "Maksutapa",
      plan: "Pakettisi",
      nextCleaning: "Seuraava siivous",
      instructions: "Ohjeesi",
    },
    expectTitle: "Mitä odottaa",
    expect: [
      "Saavumme sovittuna aikana. Varmista, että pääsemme asuntoosi.",
      "Tuomme omat tarvikkeet — ammattikäyttöön tarkoitettuja, ympäristöystävällisiä tuotteita.",
      "Sama siivooja joka kerta. Opimme tuntemaan kotisi ja toiveesi ajan myötä.",
    ],
    helpText:
      "Haluatko muuttaa aikaa tai onko kysyttävää? Vastaa tähän sähköpostiin tai tavoita meidät osoitteessa",
    helpEmail: "hello@quickclean.fi",
    sign: "Nauti puhtaasta kodistasi. — QuickClean-tiimi",
    vatNote: "sis. ALV 25,5 %",
    tbc: "Vahvistetaan myöhemmin",
  },
};

// ── HTML builder ──────────────────────────────────────────────────────────────

function row(label: string, value: string): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;width:140px">${label}</td>
      <td style="padding:8px 0;color:#0a1628;font-size:13px;font-weight:600;vertical-align:top">${value}</td>
    </tr>`;
}

export function buildCustomerConfirmationEmail(data: BookingEmailData): {
  subject: string;
  html: string;
} {
  const c = copy[data.locale] ?? copy.en;
  const ref = data.bookingId.slice(0, 8).toUpperCase();

  const subject = c.subject(data.cleaningDate);

  const html = `<!DOCTYPE html>
<html lang="${data.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(10,22,40,0.07)">

        <!-- Header bar -->
        <tr>
          <td style="background:#0a1628;padding:28px 32px">
            <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">QuickClean</p>
            <p style="margin:4px 0 0;font-size:12px;color:#7c9885;font-weight:600;text-transform:uppercase;letter-spacing:1px">Tampere, Finland</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 0">
            <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0a1628">${c.greeting(data.customerFirstName)}</p>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6">${c.intro}</p>

            <!-- Booking ref badge -->
            <div style="background:#f0f8f3;border:1px solid #c8dcd0;border-radius:10px;padding:12px 16px;margin-bottom:24px;display:inline-block">
              <span style="font-size:11px;font-weight:700;color:#7c9885;text-transform:uppercase;letter-spacing:1px">Ref #${ref}</span>
            </div>

            <!-- Details table -->
            <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#7c9885;text-transform:uppercase;letter-spacing:1px">${c.detailsTitle}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0">
              ${row(c.fields.service, data.serviceType)}
              ${row(c.fields.date, data.cleaningDate)}
              ${row(c.fields.time, data.cleaningTime)}
              ${row(c.fields.duration, data.estimatedDuration)}
              ${row(c.fields.address, data.address)}
              ${row(c.fields.cleaner, data.cleanerName ?? c.tbc)}
              ${row(c.fields.price, `${data.totalPrice} <span style="font-weight:400;color:#9ca3af;font-size:11px">(${c.vatNote})</span>`)}
              ${row(c.fields.payment, data.paymentMethod)}
              ${row(c.fields.plan, data.subscriptionPlan)}
              ${data.nextCleaningDate ? row(c.fields.nextCleaning, data.nextCleaningDate) : ""}
              ${data.specialInstructions ? row(c.fields.instructions, `<em style="color:#6b7280">${data.specialInstructions}</em>`) : ""}
            </table>
          </td>
        </tr>

        <!-- What to expect -->
        <tr>
          <td style="padding:28px 32px 0">
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#7c9885;text-transform:uppercase;letter-spacing:1px">${c.expectTitle}</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${c.expect
                .map(
                  (step, i) => `
              <tr>
                <td style="vertical-align:top;padding-bottom:12px;width:28px">
                  <div style="width:22px;height:22px;border-radius:50%;background:#0a1628;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#ffffff">${i + 1}</div>
                </td>
                <td style="vertical-align:top;padding-bottom:12px;padding-left:10px;font-size:13px;color:#4b5563;line-height:1.6">${step}</td>
              </tr>`,
                )
                .join("")}
            </table>
          </td>
        </tr>

        <!-- Help -->
        <tr>
          <td style="padding:24px 32px">
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7">
              ${c.helpText} <a href="mailto:${c.helpEmail}" style="color:#7c9885;font-weight:600">${c.helpEmail}</a>.
            </p>
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td style="padding:0 32px 32px">
            <p style="margin:0;font-size:14px;font-weight:600;color:#0a1628">${c.sign}</p>
          </td>
        </tr>

        <!-- Footer bar -->
        <tr>
          <td style="background:#f8faf9;border-top:1px solid #e9ede9;padding:16px 32px">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
              QuickClean · Tampere, Finland · <a href="mailto:hello@quickclean.fi" style="color:#9ca3af">hello@quickclean.fi</a>
              <br/>This email was sent because a booking was made on quickclean.fi.
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
