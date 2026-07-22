"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DailyShareButtonProps = {
  path: string;
  title: string;
  text: string;
  label: string;
  successLabel: string;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function DailyShareButton({
  path,
  title,
  text,
  label,
  successLabel,
}: DailyShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  async function share() {
    const url = new URL(path, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await copyText(url);
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Unable to share daily entry", error);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      title={copied ? successLabel : label}
      aria-label={copied ? successLabel : label}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors outline-none",
        copied
          ? "text-success"
          : "text-muted hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground"
      )}
    >
      {copied ? (
        <Check aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      ) : (
        <Share2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      )}
      <span>{copied ? successLabel : label}</span>
    </button>
  );
}
