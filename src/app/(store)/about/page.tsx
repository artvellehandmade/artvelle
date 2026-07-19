import Image from "next/image";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/store/reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "About" };

export default async function AboutPage() {
  const s = await getSettings();

  return (
    <div className="container-px mx-auto max-w-5xl py-16">
      <Reveal>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Our story
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-tight">
            The art of {s.brandName}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {s.tagline}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-3xl bg-muted">
          <Image
            src="https://picsum.photos/seed/aboutbanner/1400/800"
            alt={s.brandName}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
      </Reveal>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <Reveal>
          <div>
            <h2 className="font-serif text-3xl">Made by hand, with heart</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {s.aboutText}
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Every pour is a little unpredictable — that&apos;s the beauty of
              resin. No two pieces are ever exactly alike, which means the piece
              you receive is truly one of a kind.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="grid grid-cols-2 gap-4">
            {["v1", "v2", "v3", "v4"].map((seed) => (
              <div
                key={seed}
                className="relative aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                <Image
                  src={`https://picsum.photos/seed/about-${seed}/500/500`}
                  alt="Studio"
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          { t: "Handcrafted", d: "Poured & finished by hand in small batches." },
          { t: "Made to order", d: "Custom colours, names and sizes on request." },
          { t: "Loved across India", d: "Carefully packed and shipped nationwide." },
        ].map((v, i) => (
          <Reveal key={v.t} delay={i * 0.06}>
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <h3 className="font-serif text-xl gold-text">{v.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-16 text-center">
        <ButtonLink href="/shop" size="lg">
          Explore the collection
        </ButtonLink>
      </div>
    </div>
  );
}
