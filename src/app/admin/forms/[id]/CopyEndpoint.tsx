'use client';

import { useState } from 'react';

export default function CopyEndpoint({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}
