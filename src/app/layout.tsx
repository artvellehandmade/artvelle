import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/settings";

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
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Providers settings={settings}>{children}</Providers>
      </body>
    </html>
  );
}
