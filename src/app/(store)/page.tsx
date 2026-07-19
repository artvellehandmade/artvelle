import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Truck, HandHeart, ShieldCheck } from "lucide-react";
import { getFeatured, getCategoryCounts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import { CATEGORIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

const heroImg = (s: string) => `https://picsum.photos/seed/${s}/800/1000`;

export default async function HomePage() {
  const [settings, featured, counts] = await Promise.all([
    getSettings(),
    getFeatured(8),
    getCategoryCounts(),
  ]);

  const countFor = (c: string) =>
    counts.find((x) => x.category === c)?.count ?? 0;

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <div className="container-px mx-auto grid max-w-7xl items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 gold-text" />
                Handmade resin art studio
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
                {settings.heroHeadline}
              </h1>
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

          <Reveal delay={0.1} className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="mt-8 space-y-4">
                <HeroTile seed="heroA" ratio="aspect-[4/5]" />
                <HeroTile seed="heroB" ratio="aspect-square" />
              </div>
              <div className="space-y-4">
                <HeroTile seed="heroC" ratio="aspect-square" />
                <HeroTile seed="heroD" ratio="aspect-[4/5]" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Browse by
              </p>
              <h2 className="mt-1 font-serif text-3xl">Categories</h2>
            </div>
            <Link
              href="/shop"
              className="hidden items-center gap-1 text-sm hover:text-accent sm:inline-flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat} delay={i * 0.04}>
              <Link
                href={`/shop?category=${encodeURIComponent(cat)}`}
                className="group relative block aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                <Image
                  src={heroImg(`cat-${cat}`)}
                  alt={cat}
                  fill
                  sizes="(max-width:768px) 50vw, 16vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="font-serif text-base leading-tight">{cat}</p>
                  <p className="text-[11px] opacity-80">
                    {countFor(cat)} pieces
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Featured ---------------- */}
      <section className="container-px mx-auto max-w-7xl py-16">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Handpicked
              </p>
              <h2 className="mt-1 font-serif text-3xl">Featured pieces</h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-sm hover:text-accent"
            >
              Shop all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        {featured.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
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
      <section className="border-y border-border bg-card">
        <div className="container-px mx-auto max-w-7xl py-16">
          <Reveal>
            <h2 className="text-center font-serif text-3xl">How it works</h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
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
              <Reveal key={step.n} delay={i * 0.08}>
                <div className="text-center">
                  <span className="font-serif text-5xl gold-text">{step.n}</span>
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

      {/* ---------------- About snippet ---------------- */}
      <section className="container-px mx-auto max-w-7xl py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-muted">
              <Image
                src="https://picsum.photos/seed/studio/1000/800"
                alt="Our studio"
                fill
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Our story
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-tight">
                Little pieces of art, made to last.
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
          <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-16 text-center text-background">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
            <h2 className="font-serif text-3xl md:text-4xl">
              Want something made just for you?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-background/70">
              Custom name plates, keepsakes and wall art in your colours and
              size. Tell us your idea and we&apos;ll bring it to life.
            </p>
            <div className="mt-7 flex justify-center">
              <ButtonLink href="/contact" variant="gold" size="lg">
                Request a custom piece
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function HeroTile({ seed, ratio }: { seed: string; ratio: string }) {
  return (
    <div className={`relative ${ratio} overflow-hidden rounded-2xl bg-muted`}>
      <Image
        src={heroImg(seed)}
        alt="Resin art"
        fill
        sizes="(max-width:768px) 50vw, 25vw"
        className="object-cover"
      />
    </div>
  );
}
