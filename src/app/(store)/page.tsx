import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Truck,
  HandHeart,
  ShieldCheck,
  Star,
  Quote,
} from "lucide-react";
import { getFeatured, getCategoryCounts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import { CATEGORIES, CATEGORY_IMAGES, galleryImg } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Real studio photos used in the hero collage.
const HERO_IMAGES = [
  galleryImg("Pooja Essentials/Resin Pooja Thali/pooja-thali-1.jpg"),
  galleryImg("Personalised Gifts/Resin Photo Frame/photo-frame-1.jpg"),
  galleryImg("Tableware and Dining/Ring Platter/ring-platter-1.jpg"),
  galleryImg("Wedding Preservation/Varmala and Flower Preservation/varmala-1.jpg"),
];

/* Style the final word of the headline in shimmering gold italic */
function FancyHeadline({ text }: { text: string }) {
  const words = text.trim().split(" ");
  const last = words.pop();
  return (
    <h1 className="mt-6 font-serif text-5xl leading-[1.04] tracking-tight md:text-7xl">
      {words.join(" ")}{" "}
      <em className="text-gold-shimmer not-italic font-serif italic">{last}</em>
    </h1>
  );
}

const MARQUEE_ITEMS = [
  "Handmade with love",
  "One-of-a-kind pieces",
  "Custom commissions",
  "Ships across India",
  "Cash on delivery",
  "Poured & cured by hand",
];

const TESTIMONIALS = [
  {
    name: "Priya S.",
    city: "Mumbai",
    text: "The ocean-wave coasters are even more beautiful in person — the gold rim catches light like real waves. Gifting a second set already!",
  },
  {
    name: "Aarav M.",
    city: "Bengaluru",
    text: "Ordered a custom name plate for our new home. The colours matched our door perfectly and it arrived safely packed. Truly premium work.",
  },
  {
    name: "Ishita R.",
    city: "Delhi",
    text: "My preserved-rose keepsake made the best anniversary gift ever. You can tell every piece is made with so much care. 10/10.",
  },
];

export default async function HomePage() {
  const [settings, featured, counts] = await Promise.all([
    getSettings(),
    getFeatured(8),
    getCategoryCounts(),
  ]);

  const countFor = (c: string) =>
    counts.find((x) => x.category === c)?.count ?? 0;
  const totalPieces = counts.reduce((n, c) => n + c.count, 0);

  return (
    <div className="overflow-x-clip">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="container-px mx-auto grid max-w-7xl items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-card px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-accent" />
                </span>
                Handmade resin art studio
                <Sparkles className="h-3.5 w-3.5 gold-text" />
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <FancyHeadline text={settings.heroHeadline} />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                {settings.heroSubtext}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/shop" size="lg">
                  Shop the collection <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/about" size="lg" variant="outline">
                  Our story
                </ButtonLink>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <HandHeart className="h-4 w-4 gold-text" /> One-of-a-kind pieces
                </span>
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 gold-text" /> Ships across India
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 gold-text" /> Cash on delivery
                </span>
              </div>
            </Reveal>
          </div>

          {/* Floating image collage */}
          <Reveal delay={0.1} className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-tr from-accent/10 via-transparent to-accent/10 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="mt-10 space-y-4">
                <div className="animate-float">
                  <HeroTile src={HERO_IMAGES[0]} ratio="aspect-[4/5]" />
                </div>
                <div className="animate-float-delay">
                  <HeroTile src={HERO_IMAGES[1]} ratio="aspect-square" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="animate-float-slow">
                  <HeroTile src={HERO_IMAGES[2]} ratio="aspect-square" />
                </div>
                <div className="animate-float">
                  <HeroTile src={HERO_IMAGES[3]} ratio="aspect-[4/5]" />
                </div>
              </div>

              {/* Floating trust chip */}
              <div className="animate-float-delay absolute -left-4 bottom-10 hidden rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-xl backdrop-blur md:block">
                <div className="flex items-center gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Loved by customers across India
                </p>
              </div>

              {/* Floating counter chip */}
              {totalPieces > 0 && (
                <div className="animate-float absolute -right-3 top-6 hidden rounded-2xl border border-border bg-card/90 px-4 py-3 text-center shadow-xl backdrop-blur md:block">
                  <p className="font-serif text-2xl gold-text">{totalPieces}+</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    unique pieces
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Marquee band ---------------- */}
      <section className="border-y border-border bg-foreground py-3.5 text-background">
        <div className="relative flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-8 whitespace-nowrap text-sm uppercase tracking-[0.2em]"
              >
                {item}
                <Sparkles className="h-4 w-4 gold-text" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section className="container-px mx-auto max-w-7xl py-16">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest gold-text">
                Browse by
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl">
                Categories
              </h2>
            </div>
            <Link
              href="/shop"
              className="link-underline hidden items-center gap-1 text-sm sm:inline-flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat} delay={i * 0.05}>
              <Link
                href={`/shop?category=${encodeURIComponent(cat)}`}
                className="card-lift group relative block aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                <Image
                  src={CATEGORY_IMAGES[cat] ?? HERO_IMAGES[0]}
                  alt={cat}
                  fill
                  sizes="(max-width:768px) 50vw, 16vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity duration-500 group-hover:from-black/85" />
                <div className="absolute inset-x-0 bottom-0 translate-y-1 p-3 text-white transition-transform duration-500 group-hover:translate-y-0">
                  <p className="font-serif text-base leading-tight">{cat}</p>
                  <p className="text-[11px] opacity-80">{countFor(cat)} pieces</p>
                </div>
                <span className="absolute right-3 top-3 grid h-8 w-8 translate-y-1 place-items-center rounded-full bg-white/15 opacity-0 backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <ArrowRight className="h-4 w-4 text-white" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Featured ---------------- */}
      <section className="container-px mx-auto max-w-7xl pb-16">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest gold-text">
                Handpicked
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl">
                Featured pieces
              </h2>
            </div>
            <Link
              href="/shop"
              className="link-underline inline-flex items-center gap-1 text-sm"
            >
              Shop all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        {featured.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No products yet. Add products from the admin panel, or run the seed
            script to load samples.
          </p>
        )}
      </section>

      {/* ---------------- Process ---------------- */}
      <section className="relative border-y border-border bg-card">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="container-px mx-auto max-w-7xl py-20">
          <Reveal>
            <p className="text-center text-xs uppercase tracking-widest gold-text">
              Simple &amp; personal
            </p>
            <h2 className="mt-1 text-center font-serif text-3xl md:text-4xl">
              How it works
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Choose or customise",
                d: "Pick a ready piece from the shop, or request a custom commission in your colours.",
              },
              {
                n: "02",
                t: "We craft it by hand",
                d: "Each piece is poured, cured and finished with care in our studio.",
              },
              {
                n: "03",
                t: "Delivered to your door",
                d: "Carefully packed and shipped across India. Pay online or on delivery.",
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <div className="group relative rounded-3xl border border-transparent p-6 text-center transition-all duration-500 hover:border-border hover:bg-background hover:shadow-xl">
                  <span className="font-serif text-6xl text-gold-shimmer">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-serif text-xl">{step.t}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-widest gold-text">
            Kind words
          </p>
          <h2 className="mt-1 text-center font-serif text-3xl md:text-4xl">
            Customers love their pieces
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="card-lift relative flex h-full flex-col rounded-3xl border border-border bg-card p-7">
                <Quote className="absolute -top-4 left-7 h-8 w-8 rounded-full bg-accent p-1.5 text-accent-foreground" />
                <div className="flex items-center gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- About snippet ---------------- */}
      <section className="container-px mx-auto max-w-7xl pb-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <div className="relative">
              <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-muted shadow-2xl">
                <Image
                  src={galleryImg("Home Decor/Resin Name Plate/name-plate-1.jpg")}
                  alt="Our studio"
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1.2s] hover:scale-105"
                />
              </div>
              <div className="animate-float absolute -bottom-6 -right-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xl md:-right-8">
                <p className="font-serif text-3xl gold-text">100%</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  handmade
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <p className="text-xs uppercase tracking-widest gold-text">
                Our story
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-tight">
                Little pieces of art,{" "}
                <em className="text-gold-shimmer italic">made to last.</em>
              </h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                {settings.aboutText}
              </p>
              <div className="mt-7">
                <ButtonLink href="/about" variant="outline">
                  Read more <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA band ---------------- */}
      <section className="container-px mx-auto max-w-7xl pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground px-8 py-20 text-center text-background">
            {/* Animated aurora blobs */}
            <div className="animate-aurora pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
            <div className="animate-aurora-2 pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

            <Sparkles className="mx-auto h-8 w-8 gold-text" />
            <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl md:text-5xl">
              Want something{" "}
              <em className="text-gold-shimmer italic">made just for you?</em>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-background/70">
              Custom name plates, keepsakes and wall art in your colours and
              size. Tell us your idea and we&apos;ll bring it to life.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/contact" variant="gold" size="lg">
                Request a custom piece <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function HeroTile({ src, ratio }: { src: string; ratio: string }) {
  return (
    <div
      className={`relative ${ratio} overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-black/5`}
    >
      <Image
        src={src}
        alt="Resin art"
        fill
        sizes="(max-width:768px) 50vw, 25vw"
        className="object-cover transition-transform duration-[1.4s] ease-out hover:scale-110"
      />
    </div>
  );
}
