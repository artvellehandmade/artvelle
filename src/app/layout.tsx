import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/settings";
import { getUserSession } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

// Ensures mobile browsers render at the device width instead of a zoomed-out
// desktop layout. Without this the whole site looks "zoomed" on phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: {
      default: `${s.brandName} — ${s.tagline}`,
      template: `%s · ${s.brandName}`,
    },
    description: s.heroSubtext,
    openGraph: {
      title: `${s.brandName} — ${s.tagline}`,
      description: s.heroSubtext,
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  // If the shopper is logged in, hand their name/phone to the cart so the
  // add-to-cart mini sign-up never prompts them again.
  const session = await getUserSession();
  let initialLead: { name: string; phone: string } | null = null;
  if (session) {
    const u = await prisma.user
      .findUnique({ where: { id: session.id }, select: { name: true, phone: true } })
      .catch(() => null);
    if (u) initialLead = { name: u.name, phone: u.phone ?? "" };
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Providers settings={settings} initialLead={initialLead}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
