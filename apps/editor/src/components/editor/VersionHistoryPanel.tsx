'use client';

import { useState, useEffect } from 'react';
import type { PageVersion } from '@castor/types';
import { api, ApiError } from '@/lib/api';

interface Props {
  siteId: string;
  pageId: string;
  token: string;
  currentVersion: number;
  onRollback: (version: PageVersion) => Promise<void>;
}

export function VersionHistoryPanel({ siteId, pageId, token, currentVersion, onRollback }: Props) {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<number | null>(null);

  useEffect(() => {
    api.pages.listVersions(siteId, pageId, token)
      .then((vs) => setVersions([...vs].reverse())) // newest first
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [siteId, pageId, token]);

  async function handleRollback(version: PageVersion) {
    if (!confirm(`Restore version ${version.version}? This will create a new version.`)) return;
    setRolling(version.version);
    try {
      await onRollback(version);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Rollback failed');
    } finally {
      setRolling(null);
    }
  }

  return (
    <aside className="w-64 flex flex-col border-r border-gray-800 bg-gray-950 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <span className="text-sm font-medium">Version History</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <p className="text-xs text-gray-600 text-center mt-4 animate-pulse">Loading…</p>
        )}
        {!loading && versions.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">No saved versions yet.</p>
        )}
        {versions.map((v) => {
          const isCurrent = v.version === currentVersion;
          const date = new Date(v.ts);
          const label = date.toLocaleString(undefined, {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <div
              key={v.version}
              className={`rounded-lg border px-3 py-2.5 space-y-1 ${
                isCurrent ? 'border-blue-600 bg-blue-900/20' : 'border-gray-800 bg-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">v{v.version}</span>
                {isCurrent && (
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">current</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xs text-gray-600 truncate">{v.authorId}</p>
              {!isCurrent && (
                <button
                  onClick={() => handleRollback(v)}
                  disabled={rolling === v.version}
                  className="mt-1 w-full text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded px-2 py-1 transition-colors"
                >
                  {rolling === v.version ? 'Restoring…' : 'Restore this version'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
