"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type ArticleReadingToolsProps = {
  containerId: string;
  dictionary: {
    readingProgressLabel: string;
    readerControlsLabel: string;
    decreaseTextSizeLabel: string;
    increaseTextSizeLabel: string;
    copyLinkLabel: string;
    copiedLinkLabel: string;
  };
  className?: string;
};

const READER_SIZE_STORAGE_KEY = "blog-reader-size";
const READER_SIZES = ["compact", "comfortable", "large"] as const;

async function copyCurrentUrl() {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return;
    } catch {
      // Fall through for browsers that expose Clipboard API without write permission.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = window.location.href;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Unable to copy article URL");
  }
}

export function ArticleReadingTools({
  containerId,
  dictionary,
  className,
}: ArticleReadingToolsProps) {
  const [progress, setProgress] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedSize = window.localStorage.getItem(READER_SIZE_STORAGE_KEY);
    const storedIndex = READER_SIZES.indexOf(
      storedSize as (typeof READER_SIZES)[number]
    );
    if (storedIndex >= 0) {
      setSizeIndex(storedIndex);
    }
  }, []);

  useEffect(() => {
    const content = document.getElementById(containerId);
    if (!content) {
      return;
    }

    const size = READER_SIZES[sizeIndex];
    content.dataset.readingSize = size;
    window.localStorage.setItem(READER_SIZE_STORAGE_KEY, size);
  }, [containerId, sizeIndex]);

  useEffect(() => {
    const content = document.getElementById(containerId);
    if (!content) {
      return;
    }

    let frameId = 0;
    const updateProgress = () => {
      frameId = 0;
      const rect = content.getBoundingClientRect();
      const contentTop = window.scrollY + rect.top;
      const start = contentTop - window.innerHeight * 0.28;
      const end = contentTop + content.offsetHeight - window.innerHeight * 0.68;
      const range = Math.max(1, end - start);
      const nextProgress = Math.min(
        100,
        Math.max(0, ((window.scrollY - start) / range) * 100)
      );
      setProgress(nextProgress);
    };

    const scheduleProgressUpdate = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    };

    const resizeObserver = new ResizeObserver(scheduleProgressUpdate);
    resizeObserver.observe(content);
    scheduleProgressUpdate();
    window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
    window.addEventListener("resize", scheduleProgressUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleProgressUpdate);
      window.removeEventListener("resize", scheduleProgressUpdate);
    };
  }, [containerId]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await copyCurrentUrl();
      setCopied(true);
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div
        role="progressbar"
        aria-label={dictionary.readingProgressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-40 h-0.5 bg-border/35"
      >
        <span
          className="block h-full origin-left bg-primary transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      <div
        role="group"
        aria-label={dictionary.readerControlsLabel}
        className={cn(
          "inline-flex h-10 items-center overflow-hidden rounded-lg border border-border/70 bg-background/85 shadow-xs backdrop-blur-xl",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setSizeIndex((current) => Math.max(0, current - 1))}
          disabled={sizeIndex === 0}
          aria-label={dictionary.decreaseTextSizeLabel}
          title={dictionary.decreaseTextSizeLabel}
          className="grid h-10 w-10 place-items-center text-muted outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Minus aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <span
          aria-hidden="true"
          className="grid h-10 min-w-10 place-items-center border-x border-border/60 px-2 text-xs font-semibold text-foreground"
        >
          Aa
        </span>
        <button
          type="button"
          onClick={() =>
            setSizeIndex((current) => Math.min(READER_SIZES.length - 1, current + 1))
          }
          disabled={sizeIndex === READER_SIZES.length - 1}
          aria-label={dictionary.increaseTextSizeLabel}
          title={dictionary.increaseTextSizeLabel}
          className="grid h-10 w-10 place-items-center text-muted outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="inline-flex h-10 items-center gap-2 border-l border-border/60 px-3 text-xs font-medium text-muted outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:text-foreground sm:px-4 sm:text-sm"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4 text-success" strokeWidth={1.8} />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          )}
          <span>{copied ? dictionary.copiedLinkLabel : dictionary.copyLinkLabel}</span>
        </button>
      </div>
    </>
  );
}
