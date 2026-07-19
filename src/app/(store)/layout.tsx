import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { getUserSession } from "@/lib/user-auth";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();
  const account = session ? { name: session.name } : null;

  return (
    <>
      <AnnouncementBar />
      <Navbar account={account} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </>
  );
}
