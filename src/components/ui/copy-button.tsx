"use client";
import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
      aria-label="Copiar"
    >
      {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
    </button>
  );
}
