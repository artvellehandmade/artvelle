import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { AnnouncementBar } from "@/components/store/announcement-bar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </>
  );
}
