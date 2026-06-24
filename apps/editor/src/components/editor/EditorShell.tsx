'use client';

import { useState } from 'react';
import type { PageSchema, SiteConfig, SlotValue, Changeset, RejectionDetail, PageVersion, PublishSnapshot } from '@castor/types';
import { CastorLogo } from '@/components/CastorLogo';
import { SlotEditor } from './SlotEditor';
import { PreviewPane } from './PreviewPane';
import { AIChatPanel } from './AIChatPanel';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { DesignTokenPanel } from './DesignTokenPanel';
import { api, ApiError } from '@/lib/api';

interface Props {
  initialPage: PageSchema;
  site: SiteConfig;
  token: string;
  role: 'owner' | 'client';
}

type Panel = 'ai' | 'tokens' | 'history' | null;

export function EditorShell({ initialPage, site, token, role }: Props) {
  const [page, setPage] = useState<PageSchema>(initialPage);
  const [dirtySlots, setDirtySlots] = useState<Changeset>({});
  const [rejections, setRejections] = useState<RejectionDetail[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [aiSuggestion, setAiSuggestion] = useState<Changeset | null>(null);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle');
  const [lastPublish, setLastPublish] = useState<PublishSnapshot | null>(null);
  const [activeTokens, setActiveTokens] = useState({
    colorIdx: 0,
    spacing: (site.designTokens?.spacingPresets?.[0] ?? 'Normal') as import('@castor/types').SpacingPreset,
    fontIdx: 0,
  });

  const visibleSlots = Object.values(page.slots).filter(s => {
    if (s.status === 'undetectable') return false;
    if (role === 'client') return s.visibility === 'client-visible';
    return s.visibility !== 'frozen';
  });

  function handleSlotChange(slotId: string, value: SlotValue) {
    setDirtySlots(prev => ({ ...prev, [slotId]: value }));
    setPage(prev => ({
      ...prev,
      slots: { ...prev.slots, [slotId]: { ...prev.slots[slotId], currentValue: value } },
    }));
  }

  async function handleSave() {
    if (!Object.keys(dirtySlots).length) return;
    setSaveStatus('saving'); setRejections([]);
    try {
      const result = await api.pages.updateContent(page.siteId, page.pageId, dirtySlots, token);
      if (result.approved) {
        setDirtySlots({}); setSaveStatus('saved');
        setPage(prev => ({ ...prev, currentVersion: result.version }));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setRejections(result.rejections ?? []); setSaveStatus('error');
      }
    } catch { setSaveStatus('error'); }
  }

  async function handlePublish() {
    if (Object.keys(dirtySlots).length) {
      if (!confirm('Save unsaved changes before publishing?')) return;
      await handleSave();
    }
    setPublishStatus('publishing');
    try {
      const snap = await api.publish.publish(page.siteId, page.pageId, token);
      setLastPublish(snap); setPublishStatus('done');
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Publish failed');
      setPublishStatus('error');
    }
  }

  async function applyAiSuggestion() {
    if (!aiSuggestion) return;
    for (const [id, val] of Object.entries(aiSuggestion)) handleSlotChange(id, val);
    setAiSuggestion(null);
  }

  async function handleRollback(version: PageVersion) {
    try {
      await api.pages.rollback(page.siteId, page.pageId, version.version, token);
      const fresh = await api.pages.get(page.siteId, page.pageId, token);
      setPage(fresh); setDirtySlots({}); setRejections([]);
    } catch (err) { alert(err instanceof ApiError ? err.message : 'Rollback failed'); }
  }

  const rejMap = Object.fromEntries(rejections.map(r => [r.slotId, r.message]));
  const hasDirty = Object.keys(dirtySlots).length > 0;

  const panelBtn = (id: Panel, label: string) => (
    <button onClick={() => setActivePanel(activePanel === id ? null : id)}
      className="flex-1 py-2.5 text-xs font-medium transition-colors"
      style={{
        color: activePanel === id ? 'var(--accent)' : 'var(--text-3)',
        borderTop: activePanel === id ? '1px solid var(--accent)' : '1px solid transparent',
        background: 'transparent',
      }}>
      {label}
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Left sidebar */}
      <aside className="w-72 flex flex-col shrink-0 overflow-hidden"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>

        {/* Site/page header */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <CastorLogo size={22} />
            <div className="flex items-center gap-2">
              {role === 'owner' && (
                <a href="/admin" className="text-xs transition-colors" style={{ color: 'var(--text-3)' }}
                  title="Back to admin">
                  ← Admin
                </a>
              )}
              <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>v{page.currentVersion}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium truncate min-w-0">{page.title}</p>
            {/* Save button */}
            <button onClick={handleSave} disabled={!hasDirty || saveStatus === 'saving'}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 shrink-0"
              style={{
                background: hasDirty ? (saveStatus === 'saved' ? 'var(--green-dim)' : 'var(--accent-dim)') : 'var(--surface-2)',
                color: hasDirty ? (saveStatus === 'saved' ? 'var(--green)' : 'var(--accent)') : 'var(--text-3)',
                border: `1px solid ${hasDirty ? (saveStatus === 'saved' ? 'rgba(82,200,120,0.2)' : 'rgba(232,168,40,0.2)') : 'var(--border-2)'}`,
              }}>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : hasDirty ? 'Save' : 'Saved'}
            </button>
          </div>

          {/* Publish row */}
          <div className="flex items-center gap-2">
            <button onClick={handlePublish} disabled={publishStatus === 'publishing'}
              className="flex-1 text-xs py-2 rounded-lg font-medium transition-all duration-150"
              style={{
                background: publishStatus === 'done' ? 'var(--green-dim)' : 'var(--surface-2)',
                color: publishStatus === 'done' ? 'var(--green)' : 'var(--text-2)',
                border: `1px solid ${publishStatus === 'done' ? 'rgba(82,200,120,0.2)' : 'var(--border-2)'}`,
              }}>
              {publishStatus === 'publishing' ? 'Publishing…' : publishStatus === 'done' ? '✓ Published' : '↑ Publish'}
            </button>
            {lastPublish && (
              <a href={lastPublish.deployUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-2.5 py-2 rounded-lg transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--border-2)' }}
                title={lastPublish.deployUrl}>
                ↗
              </a>
            )}
          </div>
        </div>

        {/* Validation errors */}
        {saveStatus === 'error' && rejections.length === 0 && (
          <div className="mx-3 mt-2 text-xs rounded-lg px-3 py-2"
            style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(240,112,112,0.15)' }}>
            Save failed — check slot errors below.
          </div>
        )}

        {/* Slot list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {visibleSlots.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-3)' }}>No editable slots.</p>
          )}
          {visibleSlots.map(slot => (
            <SlotEditor key={slot.slotId} descriptor={slot}
              isDirty={slot.slotId in dirtySlots}
              error={rejMap[slot.slotId]}
              aiHighlight={aiSuggestion ? slot.slotId in aiSuggestion : false}
              onChange={val => handleSlotChange(slot.slotId, val)} />
          ))}
        </div>

        {/* Panel tabs */}
        <div className="flex shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {panelBtn('ai', 'AI Chat')}
          {panelBtn('tokens', 'Tokens')}
          {panelBtn('history', 'History')}
        </div>
      </aside>

      {/* Side panels */}
      {activePanel === 'ai' && (
        <AIChatPanel siteId={page.siteId} pageId={page.pageId} token={token}
          suggestion={aiSuggestion} onSuggestion={setAiSuggestion}
          onApply={applyAiSuggestion} onDismiss={() => setAiSuggestion(null)} />
      )}
      {activePanel === 'tokens' && (
        <DesignTokenPanel
          tokens={site.designTokens}
          active={activeTokens}
          onChange={setActiveTokens}
        />
      )}
      {activePanel === 'history' && (
        <VersionHistoryPanel siteId={page.siteId} pageId={page.pageId} token={token}
          currentVersion={page.currentVersion} onRollback={handleRollback} />
      )}

      {/* Preview */}
      <PreviewPane page={page} tokens={site.designTokens} activeTokens={activeTokens} token={token} />
    </div>
  );
}
