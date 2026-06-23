import React, { useState, useEffect } from 'react';
import { useI18n } from './i18n/index.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Hero } from './components/Hero';
import { TrendsView } from './components/TrendsView';
import { RepoDetail } from './components/RepoDetail';
import { ApiDocs } from './components/ApiDocs';
import { EmbedChart } from './components/EmbedChart';
import { Heart, TerminalSquare, Sun, Moon, Keyboard } from 'lucide-react';

function Dashboard() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <Hero />

      {/* Interactive Radar Trends Section */}
      <section className="border-t border-[var(--border-color)] pt-8">
        <TrendsView />
      </section>
    </div>
  );
}

function App() {
  const { t, locale, setLocale } = useI18n();
  const { user, login, logout } = useAuth();
  // Dark/Light theme toggles
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gitradar.theme');
    return saved ? saved : 'light';
  });

  const [rateLimit, setRateLimit] = useState(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('gitradar.theme', theme);
  }, [theme]);

  // Rate Limit check
  useEffect(() => {
    const checkLimit = async () => {
      try {
        const res = await fetch('https://api.github.com/rate_limit');
        if (res.ok) {
          const data = await res.json();
          setRateLimit(data.resources?.search || data.rate);
        }
      } catch (e) {}
    };
    checkLimit();
    window.addEventListener('focus', checkLimit);
    return () => window.removeEventListener('focus', checkLimit);
  }, []);

  // Global Keyboard Shortcuts Effect
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        if (e.key === 'Escape') {
          activeEl.blur();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search repositories..."]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key.toLowerCase() === 't') {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
      } else if (e.key.toLowerCase() === 'f') {
        window.dispatchEvent(new CustomEvent('toggle-filters'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Embed view conditional check
  const isEmbed = window.location.pathname.startsWith('/embed/');

  if (isEmbed) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/embed/:owner/:name" element={<EmbedChart />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <main className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] selection:bg-[var(--text-color)] selection:text-[var(--bg-color)] transition-colors duration-200">
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-10 lg:px-8 space-y-12">
          
          {/* Brand and controls header */}
          <div className="pb-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2">
              <img 
                src="/logo.jpg" 
                alt="GitRadar Logo" 
                className="size-8 rounded-lg object-cover border border-[var(--border-color)]"
              />
              <span className="text-sm font-bold text-[var(--text-color)]">{t('header.title')}</span>
            </Link>
            
            <div className="flex items-center gap-4">
              {/* Rate Limit Indicator */}
              {rateLimit && (
                <div 
                  className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--badge-bg)] border border-[var(--border-color)] text-[var(--meta-text)] flex items-center gap-1.5 cursor-help"
                  title={`${t('nav.apiLimitTitle')} ${new Date(rateLimit.reset * 1000).toLocaleTimeString()}`}
                >
                  <span className={`size-1.5 rounded-full ${
                    rateLimit.remaining > 5 
                      ? 'bg-emerald-500 animate-pulse' 
                      : rateLimit.remaining > 0 
                        ? 'bg-amber-500 animate-pulse' 
                        : 'bg-rose-500 animate-bounce'
                  }`} />
                  <span>{t('nav.apiRemaining')}: {rateLimit.remaining}/{rateLimit.limit}</span>
                </div>
              )}

              <Link 
                to="/docs" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--meta-text)] hover:text-[var(--text-color)] transition-colors"
              >
                <TerminalSquare className="size-4" />
                {t('nav.apiDocs')}
              </Link>

              {/* Auth: Login/Logout */}
              {user ? (
                <div className="flex items-center gap-2">
                  <img src={user.avatar_url} alt="" className="size-6 rounded-full" />
                  <span className="text-xs font-medium text-[var(--meta-text)]">{user.username}</span>
                  <button onClick={logout} className="text-[10px] text-[var(--meta-text)] hover:text-[var(--text-color)] underline underline-offset-2">(logout)</button>
                </div>
              ) : (
                <button onClick={login} className="text-xs font-semibold text-[var(--meta-text)] hover:text-[var(--text-color)] underline underline-offset-2 transition-colors">
                  Login with GitHub
                </button>
              )}

              {/* Language Switcher */}
              <div className="relative">
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="appearance-none bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--meta-text)] cursor-pointer hover:border-[var(--text-color)] transition-colors outline-none"
                >
                  <option value="tr">🇹🇷 TR</option>
                  <option value="en">🇬🇧 EN</option>
                </select>
              </div>

              {/* Theme toggle Button */}
              <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--badge-bg)] transition-all cursor-pointer text-[var(--meta-text)] hover:text-[var(--text-color)]"
                title={theme === 'light' ? t('nav.switchToDark') : t('nav.switchToLight')}
              >
                {theme === 'light' ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* App Routes */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/repo/:owner/:name" element={<RepoDetail />} />
            <Route path="/docs" element={<ApiDocs />} />
          </Routes>

          {/* Minimal Footer */}
          <footer className="border-t border-[var(--border-color)] pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--meta-text)] gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p>{t('footer.copyright')} {t('footer.developedBy')} <a href="https://alztrk.github.io" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--text-color)] hover:opacity-80 underline underline-offset-2">alztrk</a>.</p>
              
              {/* Keyboard shortcuts hints */}
              <span className="hidden md:inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[var(--badge-bg)] border border-[var(--border-color)] text-[10px] font-semibold text-[var(--meta-text)]">
                <Keyboard className="size-3" />
                <span>{t('footer.shortcuts')}: <kbd className="px-1 bg-[var(--card-bg)] rounded border border-[var(--border-color)]">/</kbd> {t('footer.search')} | <kbd className="px-1 bg-[var(--card-bg)] rounded border border-[var(--border-color)]">T</kbd> {t('footer.theme')} | <kbd className="px-1 bg-[var(--card-bg)] rounded border border-[var(--border-color)]">F</kbd> {t('filters.button')}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              {t('footer.madeWithLove')} <Heart className="size-3 text-red-500 fill-red-500" /> {t('footer.madeWith')}
            </div>
          </footer>

        </div>
      </main>
    </BrowserRouter>
  );
}

export default App;
