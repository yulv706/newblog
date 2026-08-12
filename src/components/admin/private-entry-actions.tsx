"use client";

import { Archive, Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  archivePrivateEntryAction,
  completePrivateEntryAction,
  deletePrivateEntryAction,
  reopenPrivateEntryAction,
} from "@/actions/private-notes";
import type { PrivateEntry } from "@/lib/private-notes";

type PrivateEntryActionsProps = {
  entry: PrivateEntry;
  labels: {
    editButton: string;
    completeButton: string;
    reopenButton: string;
    archiveButton: string;
    deleteButton: string;
    deleteConfirm: string;
  };
};

export function PrivateEntryActions({ entry, labels }: PrivateEntryActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Link
        href={`/admin/private/${entry.id}/edit`}
        title={labels.editButton}
        aria-label={labels.editButton}
        className="text-muted hover:bg-secondary hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
      >
        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
      {entry.status === "completed" ? (
        <form action={reopenPrivateEntryAction}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button
            type="submit"
            title={labels.reopenButton}
            aria-label={labels.reopenButton}
            className="text-muted hover:bg-secondary hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : (
        <form action={completePrivateEntryAction}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button
            type="submit"
            title={labels.completeButton}
            aria-label={labels.completeButton}
            className="text-muted hover:bg-success/10 hover:text-success inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
          >
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
      {entry.status !== "archived" ? (
        <form action={archivePrivateEntryAction}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button
            type="submit"
            title={labels.archiveButton}
            aria-label={labels.archiveButton}
            className="text-muted hover:bg-secondary hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
          >
            <Archive aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : null}
      <form
        action={deletePrivateEntryAction}
        onSubmit={(event) => {
          if (!window.confirm(labels.deleteConfirm)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="entryId" value={entry.id} />
        <button
          type="submit"
          title={labels.deleteButton}
          aria-label={labels.deleteButton}
          className="text-muted hover:bg-destructive/10 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
