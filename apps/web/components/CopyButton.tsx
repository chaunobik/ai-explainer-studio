"use client";

import {useState} from "react";

export function CopyButton({text, label = "Copy"}: {text: string; label?: string}) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="button secondary" type="button" onClick={copy}>
      {copied ? "Đã copy ✓" : label}
    </button>
  );
}
