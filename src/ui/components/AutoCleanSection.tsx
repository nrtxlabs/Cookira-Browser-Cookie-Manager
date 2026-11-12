import React, { useState } from 'react';
import type { AutoCleanRule, CookieRecord, CookiraSettings } from '../../core/types';
import { selectAutoCleanTargets } from '../../background/index';
import { TrashIcon } from './Icons';

interface AutoCleanSectionProps {
  draft: CookiraSettings;
  allCookies: CookieRecord[];
  onPersist: (next: CookiraSettings) => Promise<void>;
}

export const AutoCleanSection: React.FC<AutoCleanSectionProps> = ({
  draft,
  allCookies,
  onPersist,
}) => {
  const [whitelistInput, setWhitelistInput] = useState('');
  const [ruleDomain, setRuleDomain] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState<'startup' | 'tab_close'>('tab_close');
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);

  const addWhitelistDomain = () => {
    const clean = whitelistInput.trim().toLowerCase().replace(/^\.+/, '');
    if (!clean || draft.protectedWhitelist.includes(clean)) return;
    void onPersist({
      ...draft,
      protectedWhitelist: [...draft.protectedWhitelist, clean],
    });
    setWhitelistInput('');
  };

  const addAutoCleanRule = () => {
    const clean = ruleDomain.trim().toLowerCase().replace(/^\.+/, '');
    if (!clean) return;
    const rule: AutoCleanRule = {
      id: `rule_${Date.now()}`,
      domainPattern: clean,
      trigger: ruleTrigger,
      enabled: true,
    };
    void onPersist({
      ...draft,
      autoCleanRules: [...draft.autoCleanRules, rule],
    });
    setRuleDomain('');
  };

  const runDryRunPreview = () => {
    const simulated = { ...draft, autoCleanEnabled: true };
    const startupHits = selectAutoCleanTargets({
      cookies: allCookies,
      settings: simulated,
      trigger: 'startup',
    });
    const tabCloseHits = selectAutoCleanTargets({
      cookies: allCookies,
      settings: simulated,
      trigger: 'tab_close',
    });
    setDryRunResult(
      `Dry-Run Preview: ${startupHits.length} cookies on startup, ${tabCloseHits.length} cookies on tab close (locked & whitelisted domains excluded).`,
    );
  };

  return (
    <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--ck-border-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="cookira-mono text-xs font-semibold uppercase">Auto-Clean &amp; Protected Whitelist</span>
        <label className="cookira-chip flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoCleanEnabled}
            onChange={(e) => void onPersist({ ...draft, autoCleanEnabled: e.target.checked })}
            className="accent-[var(--ck-accent)]"
          />
          <span>Enable Auto-Clean (Off by default)</span>
        </label>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={whitelistInput}
          onChange={(e) => setWhitelistInput(e.target.value)}
          placeholder="Whitelist domain (e.g. github.com)"
          className="cookira-input cookira-mono text-xs px-2.5 py-1 flex-1"
        />
        <button type="button" onClick={addWhitelistDomain} className="cookira-btn-secondary text-xs px-2.5 py-1">
          Protect
        </button>
      </div>

      {draft.protectedWhitelist.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.protectedWhitelist.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() =>
                void onPersist({
                  ...draft,
                  protectedWhitelist: draft.protectedWhitelist.filter((item) => item !== d),
                })
              }
              className="cookira-chip cookira-mono text-xs px-2 py-0.5 rounded border cursor-pointer"
              style={{
                backgroundColor: 'var(--ck-success-soft)',
                borderColor: 'var(--ck-success)',
                color: 'var(--ck-success)',
              }}
              title="Click to remove from whitelist"
            >
              {d} ×
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={ruleDomain}
          onChange={(e) => setRuleDomain(e.target.value)}
          placeholder="Auto-clean pattern (e.g. tracker.example)"
          className="cookira-input cookira-mono text-xs px-2.5 py-1 flex-1 min-w-[160px]"
        />
        <select
          value={ruleTrigger}
          onChange={(e) => setRuleTrigger(e.target.value as 'startup' | 'tab_close')}
          className="cookira-input text-xs px-2 py-1"
        >
          <option value="tab_close">On Tab Close</option>
          <option value="startup">On Startup</option>
        </select>
        <button type="button" onClick={addAutoCleanRule} className="cookira-btn-secondary text-xs px-2.5 py-1">
          Add Rule
        </button>
        <button type="button" onClick={runDryRunPreview} className="cookira-btn-secondary text-xs px-2.5 py-1">
          Dry-Run
        </button>
      </div>

      {draft.autoCleanRules.map((rule) => (
        <div
          key={rule.id}
          className="px-2.5 py-1.5 rounded border flex items-center justify-between gap-2 text-xs cookira-mono"
          style={{
            backgroundColor: 'var(--ck-surface-alt)',
            borderColor: 'var(--ck-border-subtle)',
          }}
        >
          <span className="truncate">
            {rule.domainPattern} · {rule.trigger}
          </span>
          <button
            type="button"
            onClick={() =>
              void onPersist({
                ...draft,
                autoCleanRules: draft.autoCleanRules.filter((r) => r.id !== rule.id),
              })
            }
            className="cookira-btn-danger p-1"
            aria-label={`Remove rule ${rule.domainPattern}`}
          >
            <TrashIcon size={11} />
          </button>
        </div>
      ))}

      {dryRunResult && (
        <div
          className="p-2 rounded border text-xs cookira-mono"
          style={{
            backgroundColor: 'var(--ck-accent-soft)',
            borderColor: 'var(--ck-border)',
            color: 'var(--ck-accent)',
          }}
        >
          {dryRunResult}
        </div>
      )}
    </section>
  );
};
