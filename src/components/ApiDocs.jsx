import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Play, Copy, Check, Terminal, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ApiDocs() {
  const { t } = useI18n();
  const { apiUrl } = useAuth();
  const [copied, setCopied] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Live Test States
  const [testLang, setTestLang] = useState('javascript');
  const [testTime, setTestTime] = useState('7');
  const [testSort, setTestSort] = useState('stars');
  const [testStars, setTestStars] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(`${apiUrl}/api/trends?lang=${testLang}&time=${testTime}&sort=${testSort}${testStars ? `&stars=${testStars}` : ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLiveTest = async () => {
    setApiLoading(true);
    setApiResult(null);
    try {
      const queryParams = new URLSearchParams();
      if (testLang) queryParams.set('lang', testLang);
      if (testTime) queryParams.set('time', testTime);
      if (testSort) queryParams.set('sort', testSort);
      if (testStars) queryParams.set('stars', testStars);

      const response = await fetch(`${apiUrl}/api/trends?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(t('api.serverError'));
      }
      const data = await response.json();
      setApiResult(data);
    } catch (err) {
      setApiResult({ error: err.message });
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-[var(--text-color)]">
      <div className="border-b border-[var(--border-color)] pb-5">
        <h2 className="text-xl font-bold text-[var(--text-color)]">{t('api.title')}</h2>
        <p className="text-xs text-[var(--meta-text)] mt-0.5">{t('api.subtitle')}</p>
      </div>

      {/* Endpoint summary */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="subtle" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 uppercase font-bold text-[10px]">GET</Badge>
          <code className="text-sm font-bold text-[var(--text-color)]">/api/trends</code>
        </div>
        <p className="text-xs text-[var(--meta-text)] max-w-xl">
          {t('api.endpointDesc')}
        </p>
      </div>

      {/* Live Sandbox Interactive Area */}
      <Card className="rounded-xl border-[var(--border-color)] bg-[var(--card-bg)]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-color)]">{t('api.sandbox')}</h3>
            <p className="text-xs text-[var(--meta-text)] mt-0.5">{t('api.sandboxDesc')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {/* Lang filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('api.language')}</label>
              <select
                value={testLang}
                onChange={(e) => setTestLang(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-1.5 text-xs focus:outline-none text-[var(--text-color)]"
              >
                <option value="">{t('api.all')}</option>
                <option value="javascript">{t('languages.javascript')}</option>
                <option value="typescript">{t('languages.typescript')}</option>
                <option value="python">{t('languages.python')}</option>
                <option value="rust">{t('languages.rust')}</option>
                <option value="go">{t('languages.go')}</option>
              </select>
            </div>

            {/* Time range */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('api.period')}</label>
              <select
                value={testTime}
                onChange={(e) => setTestTime(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-1.5 text-xs focus:outline-none text-[var(--text-color)]"
              >
                <option value="1">{t('api.day1')}</option>
                <option value="7">{t('api.days7')}</option>
                <option value="30">{t('api.days30')}</option>
                <option value="0">{t('api.allTime')}</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('api.sortBy')}</label>
              <select
                value={testSort}
                onChange={(e) => setTestSort(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-1.5 text-xs focus:outline-none text-[var(--text-color)]"
              >
                <option value="stars">{t('api.sortStars')}</option>
                <option value="forks">{t('api.sortForks')}</option>
                <option value="updated">{t('api.sortUpdated')}</option>
              </select>
            </div>

            {/* Minimum Stars */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('api.minStars')}</label>
              <input
                type="number"
                value={testStars}
                onChange={(e) => setTestStars(e.target.value)}
                placeholder={t('api.minStarsPlaceholder')}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-1.5 text-xs focus:outline-none text-[var(--text-color)]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center gap-2 flex-wrap">
            <code className="text-xs text-[var(--meta-text)] break-all select-all font-mono">
              GET {apiUrl}/api/trends?lang={testLang}&time={testTime}&sort={testSort}{testStars ? `&stars=${testStars}` : ''}
            </code>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg text-xs font-semibold hover:bg-[var(--badge-bg)] transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-[var(--meta-text)]" />}
                {t('api.copyUrl')}
              </button>
              <button
                onClick={handleLiveTest}
                disabled={apiLoading}
                className="px-4 py-1.5 bg-[var(--text-color)] text-[var(--bg-color)] rounded-lg text-xs font-bold hover:opacity-90 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {apiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {t('api.runQuery')}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live API Console Output */}
      {apiResult && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--meta-text)] flex items-center gap-1.5">
            <Terminal className="size-4 text-[var(--meta-text)]" />
            {t('api.consoleOutput')}
          </h3>
          <Card className="bg-zinc-950 dark:bg-black border border-[var(--border-color)] text-zinc-100 rounded-xl">
            <CardContent className="p-4 overflow-x-auto text-[11px] font-mono leading-relaxed max-h-96">
              <pre>{JSON.stringify(apiResult, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Query parameters table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('api.queryParams')}</h3>
        <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--card-bg)] text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--badge-bg)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--meta-text)] uppercase">
                <th className="p-3">{t('api.paramCol')}</th>
                <th className="p-3">{t('api.typeCol')}</th>
                <th className="p-3">{t('api.descCol')}</th>
                <th className="p-3">{t('api.defaultCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-color)]">lang</td>
                <td className="p-3 text-[var(--meta-text)]">string</td>
                <td className="p-3 text-[var(--meta-text)]">{t('api.langDesc')}</td>
                <td className="p-3 text-[var(--meta-text)]">-</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-color)]">time</td>
                <td className="p-3 text-[var(--meta-text)]">number</td>
                <td className="p-3 text-[var(--meta-text)]">{t('api.timeDesc')}</td>
                <td className="p-3 text-[var(--meta-text)]">7</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-color)]">sort</td>
                <td className="p-3 text-[var(--meta-text)]">string</td>
                <td className="p-3 text-[var(--meta-text)]">{t('api.sortDesc')}</td>
                <td className="p-3 text-[var(--meta-text)]">stars</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-color)]">stars</td>
                <td className="p-3 text-[var(--meta-text)]">number</td>
                <td className="p-3 text-[var(--meta-text)]">{t('api.starsDesc')}</td>
                <td className="p-3 text-[var(--meta-text)]">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vote API Documentation */}
      <div className="border-t border-[var(--border-color)] pt-8 space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-color)]">{t('api.voteTitle')}</h2>
        <p className="text-xs text-[var(--meta-text)]">{t('api.voteDesc')}</p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="subtle" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 uppercase font-bold text-[10px]">POST</Badge>
            <code className="text-sm font-bold text-[var(--text-color)]">/api/vote</code>
          </div>
          <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--card-bg)] text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--badge-bg)] border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--meta-text)] uppercase">
                  <th className="p-3">{t('api.paramCol')}</th>
                  <th className="p-3">{t('api.typeCol')}</th>
                  <th className="p-3">{t('api.descCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                <tr>
                  <td className="p-3 font-semibold text-[var(--text-color)]">repo_id</td>
                  <td className="p-3 text-[var(--meta-text)]">string</td>
                  <td className="p-3 text-[var(--meta-text)]">{t('api.voteRepoIdDesc')}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[var(--text-color)]">vote_type</td>
                  <td className="p-3 text-[var(--meta-text)]">number</td>
                  <td className="p-3 text-[var(--meta-text)]">{t('api.voteTypeDesc')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="subtle" className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900 uppercase font-bold text-[10px]">GET</Badge>
            <code className="text-sm font-bold text-[var(--text-color)]">/api/votes/:repoId</code>
          </div>
          <p className="text-xs text-[var(--meta-text)]">{t('api.votesDesc')}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="subtle" className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900 uppercase font-bold text-[10px]">GET</Badge>
            <code className="text-sm font-bold text-[var(--text-color)]">/api/votes/:repoId/user</code>
          </div>
          <p className="text-xs text-[var(--meta-text)]">{t('api.voteUserDesc')}</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{t('api.voteAuthDesc')}</p>
        </div>
      </div>
    </div>
  );
}
