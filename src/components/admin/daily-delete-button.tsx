"use client";

import { Trash2 } from "lucide-react";

type DailyDeleteButtonProps = {
  entryId: number;
  label: string;
  confirmMessage: string;
  action: (formData: FormData) => Promise<void>;
};

export function DailyDeleteButton({
  entryId,
  label,
  confirmMessage,
  action,
}: DailyDeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="entryId" value={entryId} />
      <button
        type="submit"
        className="text-destructive hover:bg-destructive/10 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}
