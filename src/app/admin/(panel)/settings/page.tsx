import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="font-serif text-3xl">Branding & settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your brand, contact details and store options. Changes appear on
        your website instantly.
      </p>
      <div className="mt-6">
        <SettingsForm initial={settings} />
      </div>
    </div>
  );
}
