import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PolicyLayout, PolicySection } from "@/components/store/policy-layout";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers on handmade resin art care, delivery times across India, custom commissions, cash on delivery, returns and how each piece is made.",
  alternates: { canonical: "/faq" },
};

/**
 * Kept as data (not JSX) so the same source feeds both the rendered page and
 * the FAQPage structured data — they can never drift apart.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: "Is every piece really handmade?",
    a: "Yes. Each piece is poured, cured and finished by hand in our studio. Nothing is mass-produced or machine-cast, which is why no two pieces are ever identical.",
  },
  {
    q: "Why does my piece look slightly different from the photo?",
    a: "Resin moves as it cures, so colour depth, swirl patterns and bubble placement vary between pours. Screens also render colour differently. This variation is a property of the medium and is what makes each piece one of a kind.",
  },
  {
    q: "How long does delivery take?",
    a: "Ready-made pieces are dispatched in 2–4 business days. After dispatch, delivery takes 2–4 days to metro cities, 4–7 days elsewhere, and up to 10 days for remote pincodes. You get a tracking link by email.",
  },
  {
    q: "Do you offer cash on delivery?",
    a: "Yes, on eligible pieces. You will see cash on delivery as an option at checkout wherever it is available. Some pieces also allow part-payment — a small advance online with the balance collected on delivery.",
  },
  {
    q: "Can I order a custom or commissioned piece?",
    a: "Yes. Tell us the colours, size and occasion and we will design it with you, sharing progress photos before pouring. Commissions typically take 2–3 weeks. Because they are made to your brief they cannot be returned once production begins.",
  },
  {
    q: "Can I return a piece if I change my mind?",
    a: "No. As everything is handmade to order, returns are accepted only where an item arrives damaged, defective or incorrect — reported within 48 hours of delivery with photographs. Whether a specific piece is returnable is shown on its product page.",
  },
  {
    q: "How do I look after resin art?",
    a: "Keep it out of prolonged direct sunlight, which can yellow resin over time. Do not put very hot cookware directly on a coaster without a mat. Clean with a soft damp cloth only — never solvents, alcohol or abrasive scourers.",
  },
  {
    q: "Do you ship across India?",
    a: "Yes, we deliver to all serviceable pincodes in India. Shipping is calculated live at checkout from your pincode and the parcel size, so you always see the real cost before paying.",
  },
];

export default async function FaqPage() {
  const s = await getSettings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PolicyLayout
        eyebrow="Help"
        title="Frequently asked questions"
        intro={`The things people ask us most about ordering handmade resin art from ${s.brandName}.`}
      >
        {FAQS.map((f) => (
          <PolicySection key={f.q} title={f.q}>
            <p>{f.a}</p>
          </PolicySection>
        ))}

        <PolicySection title="Something else?">
          <p>
            Email{" "}
            <a href={`mailto:${s.contactEmail}`} className="text-accent underline">
              {s.contactEmail}
            </a>
            {s.whatsapp ? " or message us on WhatsApp" : ""} — we reply to
            everything.
          </p>
        </PolicySection>
      </PolicyLayout>
    </>
  );
}
