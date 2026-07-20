"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Menu, X, User } from "lucide-react";
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

export function Navbar({ account }: { account?: { name: string } | null }) {
  const settings = useSettings();
  const { count, setOpen } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-background/0"
      )}
    >
      <nav className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between md:h-20">
        {/* Left: mobile menu button */}
        <button
          className="md:hidden -ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-muted cursor-pointer"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-center gap-2"
        >
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={settings.brandName}
              width={130}
              height={36}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="font-serif text-2xl tracking-tight">
              {settings.brandName}
            </span>
          )}
        </Link>

        {/* Center: desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
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
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <SearchBox variant="icon" />
          </div>
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

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 z-50 h-full w-72 bg-card p-6 shadow-2xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl">{settings.brandName}</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6">
                <SearchBox variant="bar" onNavigate={() => setMenuOpen(false)} />
              </div>
              <ul className="mt-6 space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block rounded-xl px-3 py-3 text-lg hover:bg-muted"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li className="mt-2 border-t border-border pt-2">
                  <Link
                    href="/account"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-lg hover:bg-muted"
                  >
                    <User className="h-5 w-5" />
                    {account ? "My account" : "Log in / Sign up"}
                  </Link>
                </li>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
