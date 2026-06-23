import React from 'react';
import { useI18n } from '../i18n/index.jsx';

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="pt-8 pb-4 animate-fade-in">
      <div className="max-w-3xl">
        <h1 className="text-[40px] font-extrabold tracking-tight text-[var(--text-color)] sm:text-[54px] leading-[1.05] letter-spacing-tight">
          GitRadar
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] leading-relaxed text-[var(--meta-text)] max-w-[62ch]">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>
  );
}
