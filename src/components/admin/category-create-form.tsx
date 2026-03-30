"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createCategoryAction,
  type CategoryFormActionState,
} from "@/actions/categories-tags";
import { createSlug } from "@/lib/slug";

const INITIAL_CATEGORY_FORM_STATE: CategoryFormActionState = {
  error: null,
  success: null,
};

export function CategoryCreateForm() {
  const [name, setName] = useState("");
  const [state, formAction, isPending] = useActionState(
    createCategoryAction,
    INITIAL_CATEGORY_FORM_STATE
  );

  const autoSlug = useMemo(() => createSlug(name), [name]);

  useEffect(() => {
    if (state.success) {
      setName("");
    }
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Category name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Frontend Development"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Auto slug</span>
          <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 font-mono text-xs text-muted">
            {autoSlug}
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Creating..." : "Create category"}
        </button>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
