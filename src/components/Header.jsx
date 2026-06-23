import React from 'react';
import { Orbit } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

export function Header() {
  const { t } = useI18n();
  return (
    <header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--text-color)] text-[var(--bg-color)]">
          <Orbit className="size-4.5" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-zinc-900 dark:text-white leading-tight">
            GitRadar
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('header.subtitle')}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t('header.liveTracking')}
        </span>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-zinc-900 dark:text-zinc-200 hover:underline"
        >
          {t('header.documentation')}
        </a>
      </div>
    </header>
  );
}
