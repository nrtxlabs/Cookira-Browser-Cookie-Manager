import React from 'react';
import { ShieldAlertIcon } from './Icons';

export type SecurityNoticeVariant =
  | 'export'
  | 'export-encrypted'
  | 'import'
  | 'editor'
  | 'profiles';

interface SecurityNoticeProps {
  variant: SecurityNoticeVariant;
  compact?: boolean;
}

const COMPACT_COPY: Partial<Record<SecurityNoticeVariant, string>> = {
  editor: 'Cookies may hold session IDs—handle carefully to avoid account hijacking.',
};

const NOTICE_COPY: Record<
  SecurityNoticeVariant,
  { title: string; body: string; tone: 'warn' | 'accent' }
> = {
  export: {
    title: 'Security Warning',
    body: 'Cookies may contain sensitive authentication tokens and website session IDs. Handle exported files carefully—if a session ID is leaked, an attacker could hijack your account. Use Encrypted Vault when sharing or backing up across devices.',
    tone: 'warn',
  },
  'export-encrypted': {
    title: 'Encrypted Vault Protection',
    body: 'Cookies will be encrypted locally with AES-256-GCM (PBKDF2-SHA256). Keep your passphrase private—Cookira never stores passphrases and cannot recover lost keys.',
    tone: 'accent',
  },
  import: {
    title: 'Security Warning',
    body: 'Imported cookies can grant or overwrite active website sessions. Only import files or header strings from trusted sources, and review the Pre-Import Diff carefully before applying.',
    tone: 'warn',
  },
  editor: {
    title: 'Handle Session Data Carefully',
    body: 'Cookie values often hold active session IDs or auth secrets. Never paste raw values into public channels—if leaked, your account may be hijacked.',
    tone: 'warn',
  },
  profiles: {
    title: 'Local Profile Snapshots',
    body: 'Saved profiles store session cookies locally inside your browser profile. Keep device access secure and avoid sharing raw profile backups.',
    tone: 'warn',
  },
};

export const SecurityNotice: React.FC<SecurityNoticeProps> = ({ variant, compact = false }) => {
  const cfg = NOTICE_COPY[variant];
  const isAccent = cfg.tone === 'accent';
  const text = compact && COMPACT_COPY[variant] ? COMPACT_COPY[variant] : cfg.body;

  return (
    <div
      role="note"
      className={`${compact ? 'px-2 py-1.5' : 'p-2.5'} rounded border text-xs flex items-start gap-2 leading-snug`}
      style={{
        backgroundColor: isAccent ? 'var(--ck-accent-soft)' : 'var(--ck-warn-soft)',
        borderColor: isAccent ? 'var(--ck-border-strong)' : 'var(--ck-warn)',
        color: isAccent ? 'var(--ck-accent)' : 'var(--ck-warn)',
      }}
    >
      <ShieldAlertIcon size={compact ? 13 : 15} className="shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="cookira-mono font-semibold uppercase">{cfg.title}: </span>
        <span style={{ color: 'var(--ck-text)' }}>{text}</span>
      </div>
    </div>
  );
};
