'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface Props {
  siteId: string;
  token: string;
}

export function EditorLinkButton({ siteId, token }: Props) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    try {
      const { editorUrl } = await api.auth.generateEditorLink(siteId, token);
      setLink(editorUrl);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to generate link');
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 w-72 font-mono"
        />
        <button onClick={copy} className="text-blue-400 hover:text-blue-300 text-xs">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={generate}
      className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg px-4 py-2 transition-colors border border-gray-700"
    >
      Generate Client Link
    </button>
  );
}
