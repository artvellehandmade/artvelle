"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, MailOpen, Mail } from "lucide-react";
import { setMessageRead, deleteMessage } from "@/app/actions/admin";

export function MessageActions({
  id,
  isRead,
}: {
  id: string;
  isRead: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() =>
          start(async () => {
            await setMessageRead(id, !isRead);
            router.refresh();
          })
        }
        disabled={pending}
        title={isRead ? "Mark unread" : "Mark read"}
        className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
      >
        {isRead ? (
          <Mail className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MailOpen className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={() =>
          start(async () => {
            const res = await deleteMessage(id);
            if (res.ok) {
              toast.success("Deleted");
              router.refresh();
            }
          })
        }
        disabled={pending}
        title="Delete"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
