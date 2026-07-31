import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { PolicyLayout, PolicySection } from "@/components/store/policy-layout";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms you agree to when ordering handmade resin art from us — pricing, handmade variation, payments, cancellations and liability.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const s = await getSettings();

  return (
    <PolicyLayout
      eyebrow="Legal"
      title="Terms & Conditions"
      updated="1 August 2026"
      intro={`By browsing or ordering from ${s.brandName}, you agree to the terms below.`}
    >
      <PolicySection title="Handmade means each piece varies">
        <p>
          Every piece is poured, cured and finished by hand. Colour depth, swirl
          patterns, bubble placement and edge finish will differ slightly from
          the photographs — that variation is a property of the medium, not a
          defect, and is not grounds for a return under our returns policy.
        </p>
        <p>
          Screens also render colour differently. We photograph in natural light
          and do not colour-correct beyond basic exposure.
        </p>
      </PolicySection>

      <PolicySection title="Orders and acceptance">
        <p>
          Placing an order is an offer to buy. A contract forms only when we
          confirm the order. We may decline or cancel an order — with a full
          refund — if a piece is no longer available, if it was listed at a
          clearly incorrect price, or if we cannot deliver to your address.
        </p>
      </PolicySection>

      <PolicySection title="Pricing and payment">
        <p>
          All prices are in Indian Rupees and include applicable taxes unless
          stated otherwise. Shipping is calculated at checkout based on your
          pincode and the parcel size.
        </p>
        <p>
          We accept online payment via Razorpay, cash on delivery, and part-
          payment (an online advance with the balance collected on delivery)
          where the piece allows it. Custom commissions may require full advance
          payment before work begins.
        </p>
      </PolicySection>

      <PolicySection title="Custom and commissioned work">
        <p>
          Commissions are made to your brief and cannot be resold, so they are
          non-returnable and non-refundable once production has begun. We will
          share progress photographs and confirm the design with you before
          pouring.
        </p>
      </PolicySection>

      <PolicySection title="Cancellations">
        <p>
          You can cancel a ready-made piece any time before it is dispatched —
          email us and we will refund in full. Once an order is handed to the
          courier it can no longer be cancelled; see our{" "}
          <Link href="/shipping-returns" className="text-accent underline">
            shipping &amp; returns policy
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection title="Care and use">
        <p>
          Resin is durable but not indestructible. Keep pieces out of prolonged
          direct sunlight, avoid placing very hot items directly on coasters
          without a mat, and clean with a soft damp cloth only — never solvents
          or abrasives. Damage from misuse is not covered.
        </p>
      </PolicySection>

      <PolicySection title="Intellectual property">
        <p>
          All photographs, designs, text and artwork on this site belong to{" "}
          {s.brandName}. You may not reproduce or use them commercially without
          written permission.
        </p>
      </PolicySection>

      <PolicySection title="Liability">
        <p>
          Our liability for any order is limited to the amount you paid for it.
          We are not liable for indirect or consequential loss. Nothing here
          limits rights you have under Indian consumer law.
        </p>
      </PolicySection>

      <PolicySection title="Governing law">
        <p>
          These terms are governed by the laws of India, and disputes fall under
          the jurisdiction of the courts where our studio is registered.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
