// Claude-driven MULTI-PAGE ingest of swissbasketballcamp.com.
//
// Routes were enumerated from the real site's nav/footer links (not guessed),
// then each page was visited and its copy read from the rendered DOM. Pages
// ingested: home, camp-informationen, anmeldung, kontakt. The remaining real
// routes (impressum/datenschutz/agb, buchung) are boilerplate legal / an
// external booking flow, so they're deliberately not modelled as content pages.
//
// Run: MONGODB_URI="$(grep -E '^MONGODB_URI=' .env.local | sed 's/^MONGODB_URI=//')" \
//        npx tsx scripts/reingest-swiss-allstar.ts

import { createSite, publish } from "../lib/sites/service";
import { ALL_PERMISSIONS } from "../lib/guardian/policy";
import type { Page, SiteContent } from "../lib/model/types";

const REG = "https://www.swissbasketballcamp.com/de/anmeldung/";
const PURPLE = "#3f145b";
const ORANGE = "#ee793f";
const A = "https://www.swissbasketballcamp.com/assets/";

const IMG = {
  group: `${A}swiss-allstar-basketball-camp-group-photo-BQZItcw4.jpg`,
  coaching: `${A}swiss-allstar-basketball-camp-coaching-sz8Fw6ch.jpg`,
  development: `${A}swiss-allstar-basketball-camp-development-BPQgKrhY.jpg`,
  results: `${A}swiss-allstar-basketball-camp-results-CoU0Qow0.jpg`,
  girls: `${A}swiss-allstar-basketball-camp-girls-smiling-DaDPMSLA.jpg`,
  kids: `${A}swiss-allstar-basketball-camp-kids-CIJcWRLZ.jpg`,
  dribbling: `${A}swiss-allstar-basketball-camp-boy-dribbling-CnNL1XTp.avif`,
};

// Slot ids must be unique across the whole site, so prefix them per page.
let n = 0;
const id = (p: string) => `${p}_${++n}`;
const t = (p: string, label: string, value: string) =>
  ({ id: id(p), type: "text", label, value }) as const;
const rich = (p: string, label: string, value: string) =>
  ({ id: id(p), type: "richtext", label, value }) as const;
const img = (p: string, label: string, src: string, alt: string) =>
  ({ id: id(p), type: "image", label, value: { src, alt } }) as const;
const btn = (p: string, label: string, text: string, href: string) =>
  ({ id: id(p), type: "button", label, value: { text, href } }) as const;
const color = (p: string, label: string, value: string) =>
  ({ id: id(p), type: "color", label, value }) as const;

// ── Home ─────────────────────────────────────────────────────────────────────
const home: Page = {
  id: "page_home",
  path: "",
  title: "Home",
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      slots: [
        t("h", "headline", "Europas grösstes Basketball-Camp für Kinder"),
        t(
          "h",
          "subhead",
          "13.–18. Juli & 20.–25. Juli 2026 · 8–19 Jahre · Zofingen · 24/7 Betreuung · Über 20'000 Teilnehmer seit 1983",
        ),
        btn("h", "cta", "Jetzt Ihr Kind anmelden", REG),
        color("h", "accent", ORANGE),
        img("h", "image", IMG.group, "Gruppenfoto des Swiss Allstar Basketball Camp"),
      ],
    },
    {
      id: "sec_safety",
      type: "text",
      slots: [
        t("h", "heading", "Sicher und professionell betreut"),
        rich(
          "h",
          "body",
          "24/7-Betreuung, klare Tagesstruktur und ein erfahrenes Coaching-Team mit jahrzehntelanger Camp-Erfahrung. Ihr Kind befindet sich jederzeit in einer sicheren und strukturierten Umgebung.",
        ),
        img("h", "image", IMG.coaching, "Sicher und professionell betreut"),
      ],
    },
    {
      id: "sec_stats",
      type: "features",
      slots: [
        t("h", "heading", "Vertrauen von Eltern seit über 40 Jahren"),
        t("h", "feature-one-title", "20'000+"),
        t("h", "feature-one-body", "Teilnehmer seit 1983"),
        t("h", "feature-two-title", "43 Jahre"),
        t("h", "feature-two-body", "Erfahrung und Tradition"),
        t("h", "feature-three-title", "500+"),
        t("h", "feature-three-body", "Kinder jeden Sommer"),
      ],
    },
    {
      id: "sec_testimonials",
      type: "testimonials",
      slots: [
        t("h", "heading", "Das sagen Eltern"),
        rich("h", "testimonial-one-quote", "„Unser Sohn wollte direkt wieder buchen. Super organisiert und tolle Coaches.\""),
        t("h", "testimonial-one-author", "— M. Keller, Zürich"),
        rich("h", "testimonial-two-quote", "„Sehr professionell und gleichzeitig familiär. Wir hatten ein sehr gutes Gefühl.\""),
        t("h", "testimonial-two-author", "— S. Rossi, Winterthur"),
        rich("h", "testimonial-three-quote", "„Top Betreuung und klare Struktur. Unser Kind hat grosse Fortschritte gemacht.\""),
        t("h", "testimonial-three-author", "— A. Meier, Basel"),
      ],
    },
    {
      id: "sec_training",
      type: "text",
      slots: [
        t("h", "heading", "Professionelles Training und echte Entwicklung"),
        rich(
          "h",
          "body",
          "Ihr Kind trainiert 2–3 Mal pro Tag in strukturierten Einheiten mit Fokus auf Technik, Spielverständnis und Entscheidungsfindung. Erfahrene Coaches arbeiten in kleinen Gruppen für individuellen Fortschritt und persönliches Feedback.",
        ),
        img("h", "image", IMG.development, "Professionelles Training und echte Entwicklung"),
      ],
    },
    {
      id: "sec_community",
      type: "text",
      slots: [
        t("h", "heading", "Eine Woche voller Energie, Freunde und Selbstvertrauen"),
        rich(
          "h",
          "body",
          "Über Basketball hinaus geht es um Verbindung. Ihr Kind schliesst Freundschaften, gewinnt Selbstvertrauen und erlebt eine Woche, die in Erinnerung bleibt.",
        ),
        img("h", "image", IMG.girls, "Eine Woche voller Energie, Freunde und Selbstvertrauen"),
      ],
    },
    {
      id: "sec_home_cta",
      type: "cta",
      slots: [
        t("h", "heading", "Sichern Sie den Platz Ihres Kindes heute"),
        btn("h", "button", "Jetzt Ihr Kind anmelden", REG),
        color("h", "bg", PURPLE),
      ],
    },
    {
      id: "sec_home_footer",
      type: "footer",
      slots: [t("h", "text", "© 2026 Swiss Allstar Basketball Camp. Zofingen, Schweiz.")],
    },
  ],
};

// ── Camp-Informationen ───────────────────────────────────────────────────────
const campInfo: Page = {
  id: "page_campinfo",
  path: "camp-informationen",
  title: "Camp Details",
  sections: [
    {
      id: "sec_ci_hero",
      type: "hero",
      slots: [
        t("ci", "headline", "Alles, was du über das Camp wissen musst"),
        t("ci", "subhead", "Datum, Ablauf, Unterkunft, Verpflegung und alles andere auf einen Blick."),
        btn("ci", "cta", "Jetzt anmelden", REG),
        color("ci", "accent", ORANGE),
        img("ci", "image", IMG.kids, "Kinder am Swiss Allstar Basketball Camp"),
      ],
    },
    {
      id: "sec_ci_facts",
      type: "features",
      slots: [
        t("ci", "heading", "Das Camp auf einen Blick"),
        t("ci", "feature-one-title", "8–19 Jahre"),
        t("ci", "feature-one-body", "Alter der Teilnehmenden"),
        t("ci", "feature-two-title", "Zofingen"),
        t("ci", "feature-two-body", "Mehrzweckhalle, CH-4800"),
        t("ci", "feature-three-title", "24/7"),
        t("ci", "feature-three-body", "Betreuung, seit 1983"),
      ],
    },
    {
      id: "sec_ci_location",
      type: "text",
      slots: [
        t("ci", "heading", "Standort und Anreise"),
        rich(
          "ci",
          "body",
          "Mehrzweckhalle Zofingen, Strengelbacherstrasse 27, CH-4800 Zofingen. Mit dem Zug bis Bahnhof Zofingen, von dort 10 Minuten zu Fuss — unser Team wartet von 09:00 bis 10:30 Uhr am Bahnhof (Ausschau halten nach der SABC-Fahne). Mit dem Auto direkt zur Mehrzweckhalle; gebührenpflichtige Parkplätze sind vorhanden.",
        ),
        img("ci", "image", IMG.group, "Mehrzweckhalle Zofingen"),
      ],
    },
    {
      id: "sec_ci_schedule",
      type: "text",
      slots: [
        t("ci", "heading", "Camp-Start, Family Day und Tagesablauf"),
        rich(
          "ci",
          "body",
          "Check-in am Montag zwischen 09:15 und 10:45 Uhr, Eröffnungszeremonie um 10:45 Uhr. Am Samstag ab 08:30 Uhr Family Day mit Turnierfinale, Siegerehrung um 11:00 Uhr und Food Trucks bis 15:00 Uhr. Ein Beispieltag: 07:00 Aufstehen, 07:30 Frühstück, 08:30 und 10:15 Training, 11:30 Mittagessen, 13:30 und 15:30 Training, 17:30 Abendessen, 19:00 Abendprogramm, 22:30 Nachtruhe.",
        ),
        img("ci", "image", IMG.development, "Tagesablauf im Camp"),
      ],
    },
    {
      id: "sec_ci_care",
      type: "text",
      slots: [
        t("ci", "heading", "Sicherheit, Verpflegung und Unterkunft"),
        rich(
          "ci",
          "body",
          "24/7 Betreuung durch ein erfahrenes Team, Night Guards in der Nacht, medizinisches Personal vor Ort und ein Spital in unmittelbarer Nähe. Drei frisch zubereitete Mahlzeiten täglich mit regionalen Zutaten (Catering durch Scolarest); Allergien und Unverträglichkeiten werden berücksichtigt. Übernachtet wird in einfachen, sauberen Mehrbettzimmern mit 15–25 Kindern, eingeteilt nach Alter und Geschlecht.",
        ),
        img("ci", "image", IMG.coaching, "Betreuung im Camp"),
      ],
    },
    {
      id: "sec_ci_testimonial",
      type: "testimonials",
      slots: [
        t("ci", "heading", "Das sagen Eltern"),
        rich(
          "ci",
          "testimonial-one-quote",
          "„Unser Sohn war vor dem Camp ziemlich skeptisch. Er wollte eigentlich gar nicht hin. Nach der ersten Woche hat er uns gefragt, ob er noch eine Woche bleiben kann.\"",
        ),
        t("ci", "testimonial-one-author", "— Stefan, Zürich"),
      ],
    },
    {
      id: "sec_ci_faq",
      type: "faq",
      slots: [
        t("ci", "heading", "Häufig gestellte Fragen"),
        t("ci", "faq-one-q", "Wo findet das Camp statt?"),
        rich("ci", "faq-one-a", "In der Mehrzweckhalle Zofingen, Strengelbacherstrasse 27, CH-4800 Zofingen."),
        t("ci", "faq-two-q", "Wann beginnt und endet das Camp?"),
        rich("ci", "faq-two-a", "Check-in am Montag ab 09:15 Uhr; das Camp endet am Samstag mit dem Family Day bis 15:00 Uhr."),
        t("ci", "faq-three-q", "Kann mein Kind zu Hause schlafen, statt im Camp zu übernachten?"),
        rich("ci", "faq-three-a", "Ja. Mit der Option „Eigene Unterkunft\" nehmen Kinder am Tagesprogramm teil; die Aufsichtspflicht des Camp-Teams endet dann mit dem Tagesprogramm."),
        t("ci", "faq-four-q", "Gibt es unterschiedliche Leistungsniveaus?"),
        rich("ci", "faq-four-a", "Ja — von Anfängern bis zu ambitionierten Vereinsspielern wird in Gruppen nach Niveau trainiert."),
        t("ci", "faq-five-q", "Was passiert bei Allergien oder Diätvorgaben?"),
        rich("ci", "faq-five-a", "Allergien und Unverträglichkeiten werden bei der Verpflegung berücksichtigt — bitte bei der Anmeldung angeben."),
        t("ci", "faq-six-q", "Welche Sprache wird im Camp gesprochen?"),
        rich("ci", "faq-six-a", "Hauptsprache ist Deutsch; das internationale Coaching-Team spricht zudem Englisch und weitere Sprachen."),
      ],
    },
    {
      id: "sec_ci_cta",
      type: "cta",
      slots: [
        t("ci", "heading", "Jetzt Platz für den Sommer sichern"),
        btn("ci", "button", "Jetzt anmelden", REG),
        color("ci", "bg", PURPLE),
      ],
    },
  ],
};

// ── Anmeldung ────────────────────────────────────────────────────────────────
const anmeldung: Page = {
  id: "page_anmeldung",
  path: "anmeldung",
  title: "Anmeldung",
  sections: [
    {
      id: "sec_an_hero",
      type: "hero",
      slots: [
        t("an", "headline", "Kind anmelden"),
        t("an", "subhead", "Anmeldung dauert nur 2 Minuten · Bestätigung sofort per E-Mail"),
        btn("an", "cta", "Jetzt Platz sichern", REG),
        color("an", "accent", ORANGE),
        img("an", "image", IMG.dribbling, "Junge dribbelt den Ball"),
      ],
    },
    {
      id: "sec_an_weeks",
      type: "features",
      slots: [
        t("an", "heading", "Woche auswählen"),
        t("an", "feature-one-title", "Woche 1 — CHF 695"),
        t("an", "feature-one-body", "13.–18. Juli 2026 (ausgebucht)"),
        t("an", "feature-two-title", "Woche 2 — CHF 695"),
        t("an", "feature-two-body", "20.–25. Juli 2026"),
        t("an", "feature-three-title", "Beide Wochen — CHF 1290"),
        t("an", "feature-three-body", "13.–25. Juli 2026 (ausgebucht)"),
      ],
    },
    {
      id: "sec_an_extras",
      type: "text",
      slots: [
        t("an", "heading", "Zusatzleistungen (optional)"),
        rich(
          "an",
          "body",
          "Stornoversicherung (CHF 49): Wird Ihr Kind vor dem Camp krank oder passiert ein Unfall, erhalten Sie den vollen Betrag zurück. Frühe Anreise (CHF 49): Anreise einen Tag früher am Sonntag zwischen 17:00 und 18:30 Uhr. Flughafen-Shuttle (CHF 79): Hin- und Rückfahrt ab Flughafen Zürich. Eigene Unterkunft (−CHF 50): Teilnahme am Tagesprogramm ohne Übernachtung.",
        ),
      ],
    },
    {
      id: "sec_an_included",
      type: "text",
      slots: [
        t("an", "heading", "Was im Camp enthalten ist"),
        rich(
          "an",
          "body",
          "Professionelles Coaching und Training, Willkommensgeschenk, alle Mahlzeiten während des Camps, Unterkunft (falls nicht abgewählt), NBA-Gastauftritte und Q&A, Turnierteilnahme, Camp-BBQ und soziale Veranstaltungen, 24/7 Betreuung und Sicherheit — und vieles mehr.",
        ),
        img("an", "image", IMG.results, "Im Camp enthalten"),
      ],
    },
    {
      id: "sec_an_cta",
      type: "cta",
      slots: [
        t("an", "heading", "Die Plätze sind begrenzt und schnell ausgebucht"),
        btn("an", "button", "Jetzt Platz sichern", REG),
        color("an", "bg", PURPLE),
      ],
    },
  ],
};

// ── Kontakt (uses Castor's own form section, so enquiries land in the inbox) ──
const kontakt: Page = {
  id: "page_kontakt",
  path: "kontakt",
  title: "Kontakt",
  sections: [
    {
      id: "sec_ko_form",
      type: "form",
      slots: [
        t("ko", "heading", "Kontakt"),
        t(
          "ko",
          "intro",
          "Hast du Fragen zum Swiss Allstar Basketball Camp? Wir helfen dir gerne weiter — schreib uns eine Nachricht.",
        ),
        t("ko", "field-name-label", "Vollständiger Name"),
        t("ko", "field-email-label", "E-Mail-Adresse"),
        t("ko", "field-message-label", "Nachricht"),
        t("ko", "submit-label", "Nachricht senden"),
        t("ko", "success", "Danke — wir melden uns so schnell wie möglich."),
        color("ko", "accent", ORANGE),
      ],
    },
    {
      id: "sec_ko_footer",
      type: "footer",
      slots: [
        t("ko", "text", "Swiss Allstar Basketball Camp · Mehrzweckhalle Zofingen · CH-4800 Zofingen"),
      ],
    },
  ],
};

const content: SiteContent = { pages: [home, campInfo, anmeldung, kontakt] };

async function main() {
  // Keep the canonical slug by default, while permitting a safe new-site ingest.
  const slug = process.env.CASTOR_INGEST_SLUG ?? "swiss-allstar";
  await createSite({
    slug,
    name: "Swiss Allstar Basketball Camp",
    password: "camp2026swiss",
    permissions: ALL_PERMISSIONS,
    draft: content,
  });
  await publish(slug, "multi-page ingest (home, camp details, anmeldung, kontakt)");
  console.log(`Ingested "${slug}" with ${content.pages.length} pages and published.`);
  console.log("Pages:", content.pages.map((p) => `/${p.path}`).join(", "));
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
