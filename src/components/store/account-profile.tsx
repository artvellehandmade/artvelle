"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/app/actions/account";

export function AccountProfile({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fname, setFname] = useState(name);
  const [fphone, setFphone] = useState(phone ?? "");
  const [loading, setLoading] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateProfile({ name: fname, phone: fphone });
    setLoading(false);
    if (res.ok) {
      toast.success("Profile updated");
      setEditing(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">Profile</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-accent hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSave} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted-foreground">
              Full name
            </span>
            <input
              required
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted-foreground">
              Phone
            </span>
            <input
              value={fphone}
              onChange={(e) => setFphone(e.target.value)}
              className="input"
              placeholder="Optional"
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setFname(name);
                setFphone(phone ?? "");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{phone || "—"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
