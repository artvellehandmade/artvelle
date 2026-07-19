import { MessageSquare, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MessageActions } from "@/components/admin/message-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries" };

export default async function AdminMessages() {
  const messages = await prisma.message
    .findMany({ orderBy: { createdAt: "desc" }, take: 200 })
    .catch(() => []);

  return (
    <div>
      <h1 className="font-serif text-3xl">Inquiries</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Messages from your contact form.
      </p>

      {messages.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl">No inquiries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact form submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border p-5 ${
                m.isRead
                  ? "border-border bg-card"
                  : "border-accent/40 bg-accent/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {!m.isRead && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        New
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <a
                      href={`mailto:${m.email}`}
                      className="inline-flex items-center gap-1 hover:text-accent"
                    >
                      <Mail className="h-3 w-3" /> {m.email}
                    </a>
                    {m.phone && (
                      <a
                        href={`tel:${m.phone}`}
                        className="inline-flex items-center gap-1 hover:text-accent"
                      >
                        <Phone className="h-3 w-3" /> {m.phone}
                      </a>
                    )}
                    <span>{m.createdAt.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <MessageActions id={m.id} isRead={m.isRead} />
              </div>
              {m.subject && (
                <p className="mt-3 text-sm font-medium">{m.subject}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {m.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
