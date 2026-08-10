export const LOCALES = ["en", "fi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en_US",
  fi: "fi_FI",
};

export const HREFLANG_TAGS: Record<Locale, string> = {
  en: "en",
  fi: "fi",
};

// ── Site ──────────────────────────────────────────────────────────────────────

function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://frosh.fi";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const BASE_URL = resolveBaseUrl();

export const IS_INDEXABLE_ENV = BASE_URL === "https://frosh.fi";

// ── Business identity (NAP) ───────────────────────────────────────────────────

export const BUSINESS = {
  legalName: "Frosh Enterprises",
  tradeName: "Frosh",
  businessId: "3599859-5",
  vatId: "FI35998595",

  email: "hello@frosh.fi",
  phone: "+358503484537",
  phoneDisplay: "+358 50 348 4537",
  whatsapp: "358503484537",

  address: {
    street: "Näyttelijänkatu 19 K",
    locality: "Tampere",
    region: "Pirkanmaa",
    postalCode: "33720",
    country: "FI",
  },

  // Confirmed from Google Maps listing:
  // https://www.google.com/maps/place/Frosh/@61.2084122,24.2425933
  geo: {
    latitude: 61.2084122,
    longitude: 24.2425933,
  },

  openingHours: [
    {
      days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "08:00",
      closes: "19:00",
    },
  ],

  priceRange: "€€",
  foundingDate: "2026",
  currency: "EUR",

  // Google Business Profile confirmed:
  // https://share.google/SrxBGoyGatj8XS297
  // Add the remaining social profile URLs once the pages exist.
  // Remove any line you don't have a real profile for — bare domains hurt more than omitting.
  sameAs: [
    "https://share.google/SrxBGoyGatj8XS297",
    // "https://www.facebook.com/froshfi",
    // "https://www.instagram.com/froshfi",
    // "https://www.linkedin.com/company/frosh",
  ] as string[],
} as const;

// ── Service area ──────────────────────────────────────────────────────────────

export const SERVICE_AREA = {
  primaryCity: "Tampere",
  region: "Pirkanmaa",
  country: "Finland",
  radiusMeters: 30000,
  cities: ["Tampere", "Nokia", "Ylöjärvi", "Kangasala", "Pirkkala", "Lempäälä"],
  futureCities: ["Helsinki"],
} as const;

// ── Services ──────────────────────────────────────────────────────────────────

export interface ServiceDefinition {
  slug: string;
  path: string;
  name: { en: string; fi: string };
  description: { en: string; fi: string };
  category: string;
  priceFrom: number | null;
  priceUnit: "Visit" | "Month" | null;
}

export const STAIN_SURCHARGE_NOTICE = {
  en: "Time spent on removing tough stains will be charged as extra fees in a separate invoice.",
  fi: "Hankalien tahrojen poistamiseen kuluva aika laskutetaan lisämaksuna erillisellä laskulla.",
} as const;

export const SERVICES: ServiceDefinition[] = [
  {
    slug: "maintenance",
    path: "/services/home-care",
    name: {
      en: "Home Maintenance Cleaning",
      fi: "Kodin ylläpitosiivous",
    },
    description: {
      en: "Recurring home cleaning in Tampere on a weekly, bi-weekly, or monthly schedule. Same vetted cleaner where possible, all supplies included, eligible for the Finnish household tax deduction.",
      fi: "Säännöllinen kotisiivous Tampereella viikoittain, joka toinen viikko tai kuukausittain. Sama luotettava siivooja mahdollisuuksien mukaan, välineet sisältyvät hintaan, kotitalousvähennyskelpoinen.",
    },
    category: "House Cleaning",
    priceFrom: 87,
    priceUnit: "Month",
  },
  {
    slug: "deep",
    path: "/services/deep-cleaning",
    name: {
      en: "Deep Cleaning",
      fi: "Syväsiivous",
    },
    description: {
      en: "Thorough top-to-bottom deep clean covering the areas routine cleaning misses. Available monthly, quarterly, or as a one-time service across Tampere and Pirkanmaa.",
      fi: "Perusteellinen syväsiivous, joka kattaa alueet joita tavallinen siivous ei tavoita. Saatavilla kuukausittain, neljännesvuosittain tai kertaluonteisesti Tampereella ja Pirkanmaalla.",
    },
    category: "Deep Cleaning",
    priceFrom: 134,
    priceUnit: "Month",
  },
  {
    slug: "moveout",
    path: "/services/moveout",
    name: {
      en: "Move-Out Cleaning",
      fi: "Muuttosiivous",
    },
    description: {
      en: "End-of-tenancy cleaning in Tampere carried out to the standard Finnish landlords and housing companies expect at handover.",
      fi: "Muuttosiivous Tampereella suomalaisten vuokranantajien ja taloyhtiöiden luovutusvaatimusten mukaisesti.",
    },
    category: "Move Out Cleaning",
    priceFrom: 158,
    priceUnit: "Visit",
  },
  {
    slug: "office",
    path: "/services/office",
    name: {
      en: "Office & Workplace Cleaning",
      fi: "Toimistosiivous",
    },
    description: {
      en: "Contract cleaning for offices and workplaces in Tampere, priced by weekly hours with a schedule built around your working day.",
      fi: "Sopimussiivous toimistoille ja työpaikoille Tampereella, hinnoiteltu viikkotuntien mukaan ja aikataulutettu työpäivänne ympärille.",
    },
    category: "Office Cleaning",
    priceFrom: null,
    priceUnit: null,
  },
];

// ── FAQ content ───────────────────────────────────────────────────────────────
// Confirmed by client. Used for FAQPage schema (schema.ts) and visible FAQ
// sections. Schema and visible content must always match.

export const FAQS: Record<Locale, { question: string; answer: string }[]> = {
  en: [
    {
      question: "How does the booking process work?",
      answer:
        "Choose your service and apartment size on frosh.fi, select a date and time slot, and complete checkout. You'll receive a confirmation email immediately. We'll reach out 24 hours before your first visit to confirm access.",
    },
    {
      question: "Do I need to be home during the cleaning?",
      answer:
        "No. Most customers provide a key or door code so we can clean while they're at work. You just need to ensure safe access is arranged before the visit.",
    },
    {
      question: "What cleaning products do you use?",
      answer:
        "We bring all supplies and equipment. Our products are effective and professionally chosen for each surface type. If you have specific preferences or allergies, let us know in the booking notes.",
    },
    {
      question: "Can I cancel or reschedule?",
      answer:
        "Yes. Individual visits can be rescheduled or cancelled free of charge up to 24 hours before the scheduled time. Subscriptions can be cancelled anytime from your dashboard with no minimum commitment.",
    },
    {
      question: "Are your cleaners insured?",
      answer:
        "Yes. All cleaners are vetted before assignment and covered by Frosh's liability insurance for every visit. Coverage details are available on request.",
    },
    {
      question: "What areas do you serve?",
      answer:
        "We currently serve Tampere, Nokia, Ylöjärvi, Kangasala, Pirkkala, and Lempäälä. Contact us if you're outside these areas and we'll let you know if we can help.",
    },
    {
      question: "Will I have the same cleaner every time?",
      answer:
        "Where operationally possible, yes. We assign the same cleaner to recurring bookings. Illness or staffing changes may occasionally require a substitute, but you'll always be notified.",
    },
    {
      question: "Can I claim the household tax deduction?",
      answer:
        "Private customers may be eligible for the Finnish household tax deduction (kotitalousvähennys) on the labour portion of the service. We provide the documentation you need to claim it. Confirm current eligibility and caps at vero.fi.",
    },
  ],
  fi: [
    {
      question: "Miten varaaminen toimii?",
      answer:
        "Valitse palvelu ja asunnon koko frosh.fi:ssä, valitse päivämäärä ja aika sekä maksa. Saat vahvistussähköpostin välittömästi. Otamme yhteyttä 24 tuntia ennen ensimmäistä käyntiä vahvistaaksemme pääsyjärjestelyt.",
    },
    {
      question: "Täytyykö minun olla kotona siivouksen aikana?",
      answer:
        "Ei. Useimmat asiakkaat jättävät avaimen tai ovikoodin, jotta voimme siivota heidän ollessaan töissä. Sinun tarvitsee vain varmistaa, että pääsy on järjestetty ennen käyntiä.",
    },
    {
      question: "Mitä siivoustuotteita käytätte?",
      answer:
        "Tuomme kaikki tarvikkeet ja välineet mukanamme. Tuotteemme on valittu ammattimaisesti kullekin pintamateriaalille. Jos sinulla on erityistoiveita tai allergioita, kerro niistä varauslomakkeella.",
    },
    {
      question: "Voinko perua tai siirtää käynnin?",
      answer:
        "Kyllä. Yksittäisiä käyntejä voi siirtää tai peruuttaa maksutta 24 tuntia ennen sovittua aikaa. Tilauksen voi peruuttaa milloin tahansa omasta käyttäjätililtä ilman sitoumusaikaa.",
    },
    {
      question: "Ovatko siivoojanne vakuutettuja?",
      answer:
        "Kyllä. Kaikki siivoojat tarkastetaan ennen tehtävään asettamista, ja Frosh kattaa heidät vastuuvakuutuksella jokaisen käynnin aikana. Vakuutuksen tiedot ovat saatavilla pyynnöstä.",
    },
    {
      question: "Millä alueilla toimitte?",
      answer:
        "Palvelemme tällä hetkellä Tamperetta, Nokiaa, Ylöjärveä, Kangasalaa, Pirkalaa ja Lempäälää. Ota yhteyttä, jos asut muualla — kerromme voimmeko auttaa.",
    },
    {
      question: "Tuleeko sama siivooja joka kerta?",
      answer:
        "Mahdollisuuksien mukaan kyllä. Pyrimme lähettämään saman siivoajan toistuviin käynteihin. Sairaustapauksissa tai henkilöstömuutoksissa sijainen on mahdollinen, mutta siitä ilmoitetaan aina etukäteen.",
    },
    {
      question: "Voinko hyödyntää kotitalousvähennystä?",
      answer:
        "Yksityisasiakkaat voivat olla oikeutettuja kotitalousvähennykseen palvelun työkustannuksista. Toimitamme tarvittavat asiakirjat vähennyksen hakemista varten. Tarkista voimassa olevat ehdot ja enimmäismäärät osoitteesta vero.fi.",
    },
  ],
};

// ── Route registry ────────────────────────────────────────────────────────────

export type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface RouteDefinition {
  path: string;
  priority: number;
  changeFrequency: ChangeFreq;
  noindex?: boolean;
}

export const PUBLIC_ROUTES: RouteDefinition[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  ...SERVICES.map((s) => ({
    path: s.path,
    priority: 0.9,
    changeFrequency: "monthly" as ChangeFreq,
  })),
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/booking", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export const NOINDEX_ROUTES: string[] = [
  "/booking/success",
  "/booking/cancelled",
  "/pricing/office-cleaning/success",
  "/pricing/office-cleaning/cancelled",
];

export const DISALLOWED_PATHS: string[] = [
  "/admin",
  "/dashboard",
  "/api",
  "/login",
  "/signup",
  "/reset-password",
  "/auth",
  "/booking/success",
  "/booking/cancelled",
  "/pricing/office-cleaning/success",
  "/pricing/office-cleaning/cancelled",
  "/*?session_id=",
  "/*?booking_id=",
];

// ── URL builders ──────────────────────────────────────────────────────────────

export function absoluteUrl(locale: Locale, path = ""): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return `${BASE_URL}/${locale}${clean}`;
}

export function alternateLanguages(path = ""): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of LOCALES) {
    map[HREFLANG_TAGS[locale]] = absoluteUrl(locale, path);
  }
  map["x-default"] = absoluteUrl(DEFAULT_LOCALE, path);
  return map;
}

export function findService(slugOrPath: string): ServiceDefinition | undefined {
  return SERVICES.find((s) => s.slug === slugOrPath || s.path === slugOrPath);
}
