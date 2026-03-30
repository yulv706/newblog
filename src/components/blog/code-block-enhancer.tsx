"use client";

import { useEffect } from "react";

type CodeBlockEnhancerProps = {
  containerId: string;
};

function normalizeLanguageLabel(language: string) {
  if (!language) {
    return "text";
  }
  if (language.toLowerCase() === "ts") {
    return "typescript";
  }
  if (language.toLowerCase() === "js") {
    return "javascript";
  }
  return language.toLowerCase();
}

function getCodeText(preElement: HTMLElement) {
  const lineElements = Array.from(
    preElement.querySelectorAll<HTMLElement>("[data-line]")
  );

  if (lineElements.length === 0) {
    return preElement.textContent ?? "";
  }

  return lineElements.map((lineElement) => lineElement.textContent ?? "").join("\n");
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy copy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function CodeBlockEnhancer({ containerId }: CodeBlockEnhancerProps) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const cleanupCallbacks: Array<() => void> = [];

    const codeBlocks = Array.from(
      container.querySelectorAll<HTMLElement>("pre.post-code-pre")
    );

    for (const preElement of codeBlocks) {
      const wrapperElement =
        preElement.closest<HTMLElement>("figure") ?? preElement.parentElement;
      if (!wrapperElement) {
        continue;
      }

      if (wrapperElement.dataset.codeBlockEnhanced === "true") {
        continue;
      }
      wrapperElement.dataset.codeBlockEnhanced = "true";
      wrapperElement.classList.add("post-code-wrapper");

      const toolbarElement = document.createElement("div");
      toolbarElement.className = "post-code-toolbar";

      const languageElement = document.createElement("span");
      languageElement.className = "post-code-language";
      languageElement.textContent = normalizeLanguageLabel(
        preElement.dataset.language ?? "text"
      );

      const copyButtonElement = document.createElement("button");
      copyButtonElement.type = "button";
      copyButtonElement.className = "post-code-copy-button";
      copyButtonElement.textContent = "Copy";

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const handleCopy = async () => {
        const codeText = getCodeText(preElement);
        const copied = await copyTextToClipboard(codeText);
        if (copied) {
          copyButtonElement.textContent = "Copied";
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            copyButtonElement.textContent = "Copy";
            timeoutId = null;
          }, 1200);
        } else {
          copyButtonElement.textContent = "Failed";
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            copyButtonElement.textContent = "Copy";
            timeoutId = null;
          }, 1200);
        }
      };

      copyButtonElement.addEventListener("click", handleCopy);
      cleanupCallbacks.push(() => {
        copyButtonElement.removeEventListener("click", handleCopy);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

      toolbarElement.append(languageElement, copyButtonElement);
      wrapperElement.insertBefore(toolbarElement, preElement);
    }

    return () => {
      for (const cleanup of cleanupCallbacks) {
        cleanup();
      }
    };
  }, [containerId]);

  return null;
}
