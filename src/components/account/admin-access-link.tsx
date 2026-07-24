import React from "react";
import Link from "next/link";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";

type AdminAccessLinkProps = {
  role: "reader" | "admin";
  label: string;
};

export function AdminAccessLink({ role, label }: AdminAccessLinkProps) {
  if (role !== "admin") {
    return null;
  }

  return (
    <Link
      href="/admin"
      className="border-primary/20 bg-primary/6 text-primary hover:bg-primary/10 inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-medium transition-colors"
    >
      <span className="inline-flex items-center gap-2">
        <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
        {label}
      </span>
      <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
