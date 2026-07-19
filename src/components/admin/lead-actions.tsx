"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { updateLeadStatus, deleteLead } from "@/app/actions/admin";

const STATUSES = ["interested", "contacted", "converted"];

export function LeadActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await updateLeadStatus(id, e.target.value);
            router.refresh();
          })
        }
        className="input h-9 w-auto text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        onClick={() =>
          start(async () => {
            const res = await deleteLead(id);
            if (res.ok) {
              toast.success("Removed");
              router.refresh();
            }
          })
        }
        disabled={pending}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
