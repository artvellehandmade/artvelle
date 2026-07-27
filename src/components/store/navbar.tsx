"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Search } from "lucide-react";
import { useCart } from "@/context/cart";
import { useSettings } from "@/context/settings";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SearchBox } from "@/components/store/search-box";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar({ account }: { account?: { name: string } | null }) {
  const settings = useSettings();
  const { count, setOpen } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-background/0"
      )}
    >
      <nav className="container-px mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 md:h-20">
        {/* Logo — left on all sizes */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={settings.brandName}
              width={130}
              height={36}
              className="h-7 w-auto object-contain md:h-8"
            />
          ) : (
            <span className="font-serif text-xl tracking-tight md:text-2xl">
              {settings.brandName}
            </span>
          )}
        </Link>

        {/* Center: desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  data-active={active}
                  className={cn(
                    "link-underline text-sm tracking-wide transition-colors hover:text-accent",
                    active ? "text-accent" : "text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="hidden md:block">
            <SearchBox variant="icon" />
          </div>
          {/* Mobile: quick link to search on the shop page */}
          <Link
            href="/shop"
            className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-muted cursor-pointer md:hidden"
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <ThemeToggle />
          <Link
            href="/account"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-muted cursor-pointer"
            aria-label={account ? "My account" : "Log in"}
            title={account ? `Hi, ${account.name.split(" ")[0]}` : "Log in"}
          >
            <User className="h-[18px] w-[18px]" />
            {account && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
            )}
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-muted cursor-pointer"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-medium text-accent-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation bar — replaces the old hamburger drawer */}
      <div className="border-t border-border/60 bg-background/80 backdrop-blur-md md:hidden">
        <ul className="no-scrollbar container-px mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-1.5">
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  data-active={active}
                  className={cn(
                    "block rounded-full px-4 py-1.5 text-sm font-medium tracking-wide transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
