"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, StickyNote, Check, X, Loader2 } from "lucide-react";
import {
  updateLeadStatus,
  updateLeadNotes,
  deleteLead,
} from "@/app/actions/admin";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/leads";

export function LeadActions({
  id,
  status,
  notes,
}: {
  id: string;
  status: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveNotes() {
    setSaving(true);
    const res = await updateLeadNotes(id, draft);
    setSaving(false);
    if (res.ok) {
      toast.success("Note saved");
      setEditing(false);
      router.refresh();
    } else {
      toast.error("Could not save note");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-2">
        <select
          value={status}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              const res = await updateLeadStatus(id, e.target.value);
              if (res.ok) {
                toast.success("Status updated");
                router.refresh();
              } else toast.error(res.error || "Failed");
            })
          }
          className="input h-9 w-auto text-xs"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          onClick={() => setEditing((v) => !v)}
          className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-muted ${
            notes ? "text-accent" : "text-muted-foreground"
          }`}
          title={notes ? "Edit follow-up note" : "Add follow-up note"}
        >
          <StickyNote className="h-4 w-4" />
        </button>

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

      {editing && (
        <div className="w-72 rounded-xl border border-border bg-background p-2 text-left shadow-lg">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Called on 12 Jul — wants blue set, will confirm size."
            className="input resize-none text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setDraft(notes ?? "");
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              onClick={saveNotes}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
