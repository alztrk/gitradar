import React, { useState, useEffect, useMemo } from 'react';
import { RepoCard } from './RepoCard';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Loader2, RefreshCw, AlertCircle, Search, SlidersHorizontal, ChevronDown, Check, ChevronLeft, ChevronRight, Download, Upload, BarChart3, Trophy, TrendingUp, Flame, Star, GitFork } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function TrendsView() {
  const { t } = useI18n();
  const { apiUrl } = useAuth();

  const LANGUAGE_OPTIONS = [
    { label: t('languages.all'), value: '' },
    { label: t('languages.javascript'), value: 'language:javascript' },
    { label: t('languages.typescript'), value: 'language:typescript' },
    { label: t('languages.python'), value: 'language:python' },
    { label: t('languages.rust'), value: 'language:rust' },
    { label: t('languages.go'), value: 'language:go' },
    { label: t('languages.cpp'), value: 'language:cpp' },
    { label: t('languages.java'), value: 'language:java' },
    { label: t('languages.ruby'), value: 'language:ruby' }
  ];

  const TIME_RANGES = [
    { label: t('timeRanges.today'), days: 1 },
    { label: t('timeRanges.pastWeek'), days: 7 },
    { label: t('timeRanges.pastMonth'), days: 30 },
    { label: t('timeRanges.allTime'), days: 0 }
  ];

  const SORT_OPTIONS = [
    { label: t('sortOptions.mostStars'), value: 'stars', order: 'desc' },
    { label: t('sortOptions.forksCount'), value: 'forks', order: 'desc' },
    { label: t('sortOptions.recentlyUpdated'), value: 'updated', order: 'desc' },
    { label: t('sortOptions.helpWanted'), value: 'help-wanted-issues', order: 'desc' }
  ];

  const LICENSE_OPTIONS = [
    { label: t('licenseOptions.any'), value: '' },
    { label: t('licenseOptions.mit'), value: 'license:mit' },
    { label: t('licenseOptions.apache'), value: 'license:apache-2.0' },
    { label: t('licenseOptions.gpl'), value: 'license:gpl-3.0' }
  ];

  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // URL State Synchronizer
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const selectedLanguage = searchParams.get('lang') || '';
  const selectedTimeRange = Number(searchParams.get('time') || '7');
  const selectedSort = searchParams.get('sort') || 'stars';
  const minStars = searchParams.get('min_stars') || '';
  const selectedLicense = searchParams.get('license') || '';
  const currentPage = Number(searchParams.get('page') || '1');

  // Advanced Query Builder variables
  const queryOrg = searchParams.get('org') || '';
  const queryArchived = searchParams.get('archived') || '';
  const querySize = searchParams.get('size') || '';
  const queryForksMin = searchParams.get('forks_min') || '';

  // Bookmarks state (syncs with localstorage)
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('gitradar.bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Bookmark Notes state (syncs with localstorage)
  const [bookmarkNotes, setBookmarkNotes] = useState(() => {
    const saved = localStorage.getItem('gitradar.bookmark_notes');
    return saved ? JSON.parse(saved) : {};
  });

  const handleUpdateNote = (id, noteText) => {
    const updated = { ...bookmarkNotes, [id]: noteText };
    setBookmarkNotes(updated);
    localStorage.setItem('gitradar.bookmark_notes', JSON.stringify(updated));
  };

  // Comparison State
  const [compareIds, setCompareIds] = useState([]);

  const [hasMore, setHasMore] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ─── Leaderboard State ───
  const LEADERBOARD_PERIODS = [
    { key: 'week', label: t('leaderboard.periods.week'), days: 7 },
    { key: 'month', label: t('leaderboard.periods.month'), days: 30 },
    { key: 'year', label: t('leaderboard.periods.year'), days: 365 },
    { key: 'all', label: t('leaderboard.periods.all'), days: 0 },
  ];
  const [lbPeriod, setLbPeriod] = useState('week');
  const [lbRepos, setLbRepos] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  const LEADERBOARD_SORTS = [
    { key: 'velocity', label: t('leaderboard.velocity'), icon: '⚡', sortFn: (a, b) => b.velocity_score - a.velocity_score },
    { key: 'stars', label: t('leaderboard.stars'), icon: '⭐', sortFn: (a, b) => b.stars - a.stars },
    { key: 'forks', label: t('leaderboard.forks'), icon: '🍴', sortFn: (a, b) => b.forks - a.forks },
    { key: 'newest', label: t('leaderboard.newest'), icon: '🆕', sortFn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  ];
  const [lbSort, setLbSort] = useState('velocity');

  const fetchLeaderboard = async (periodKey) => {
    setLbLoading(true);
    const period = LEADERBOARD_PERIODS.find(p => p.key === periodKey) || LEADERBOARD_PERIODS[0];
    const lbCacheKey = `gitradar.lb_${periodKey}`;
    try {
      let q = 'stars:>=100';
      if (period.days > 0) {
        const d = new Date();
        d.setDate(d.getDate() - period.days);
        q = `created:>${d.toISOString().split('T')[0]} stars:>=10`;
      }
      const url = `${apiUrl}/api/trends?time=${days}&sort=stars&lang=${langQuery || ''}&stars=0`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('rate-limited');
      const data = await res.json();

      const languageColors = {
        javascript: '#f1e05a', typescript: '#3178c6', python: '#3572A5',
        rust: '#dea584', go: '#00ADD8', cpp: '#f34b7d', java: '#b07219', ruby: '#701516'
      };

      const items = (data.items || []).map(item => {
        const created = new Date(item.created_at);
        const diffDays = Math.max(1, Math.ceil(Math.abs(Date.now() - created) / (1000 * 60 * 60 * 24)));
        return {
          id: item.id,
          name: item.name,
          owner: { login: item.owner.login, avatar_url: item.owner.avatar_url },
          description: item.description,
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language,
          languageColor: languageColors[item.language?.toLowerCase()] || '#71717a',
          html_url: item.html_url,
          created_at: item.created_at,
          velocity_score: parseFloat((item.stargazers_count / diffDays).toFixed(1)),
        };
      });

      setLbRepos(items);
      localStorage.setItem(lbCacheKey, JSON.stringify(items));
    } catch {
      const cached = localStorage.getItem(lbCacheKey);
      if (cached) { try { setLbRepos(JSON.parse(cached)); } catch {} }
    } finally {
      setLbLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(lbPeriod);
  }, [lbPeriod]);

  // Toggle Filters keyboard shortcuts listener
  useEffect(() => {
    const handleToggle = () => {
      setFiltersOpen(prev => !prev);
    };
    window.addEventListener('toggle-filters', handleToggle);
    return () => window.removeEventListener('toggle-filters', handleToggle);
  }, []);

  // Export saved bookmarks and notes to JSON file
  const handleExportBookmarks = () => {
    const payload = {
      bookmarks,
      notes: bookmarkNotes
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "gitradar-bookmarks.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import saved bookmarks and notes from JSON file
  const handleImportBookmarks = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          let importedBookmarks = [];
          let importedNotes = {};

          if (parsed && parsed.bookmarks && Array.isArray(parsed.bookmarks)) {
            importedBookmarks = parsed.bookmarks;
            importedNotes = parsed.notes || {};
          } else if (Array.isArray(parsed)) {
            importedBookmarks = parsed;
          } else {
            alert(t('bookmarks.invalidFormat'));
            return;
          }

          const mergedBookmarks = [...bookmarks];
          importedBookmarks.forEach(item => {
            if (item.id && !mergedBookmarks.some(m => m.id === item.id)) {
              mergedBookmarks.push(item);
            }
          });
          setBookmarks(mergedBookmarks);
          localStorage.setItem('gitradar.bookmarks', JSON.stringify(mergedBookmarks));

          const mergedNotes = { ...bookmarkNotes, ...importedNotes };
          setBookmarkNotes(mergedNotes);
          localStorage.setItem('gitradar.bookmark_notes', JSON.stringify(mergedNotes));
        } catch (err) {
          alert(t('bookmarks.parseFailed'));
        }
      };
    }
  };

  // Toggle saving repo
  const handleToggleBookmark = (id) => {
    let updated;
    const targetRepo = repos.find(r => r.id === id) || bookmarks.find(r => r.id === id);
    if (!targetRepo) return;

    if (bookmarks.some(r => r.id === id)) {
      updated = bookmarks.filter(r => r.id !== id);
      setCompareIds(prev => prev.filter(cId => cId !== id));
      // Delete note
      const nextNotes = { ...bookmarkNotes };
      delete nextNotes[id];
      setBookmarkNotes(nextNotes);
      localStorage.setItem('gitradar.bookmark_notes', JSON.stringify(nextNotes));
    } else {
      updated = [...bookmarks, targetRepo];
    }
    setBookmarks(updated);
    localStorage.setItem('gitradar.bookmarks', JSON.stringify(updated));
  };

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value !== undefined && value !== null && value !== '') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Always reset page index back to 1 on filter changes unless changing page directly
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const fetchTrendingRepos = async () => {
    setLoading(true);
    setError(null);
    const cacheKey = `gitradar_trends_cache_${currentPage}_q-${searchQuery}_lang-${selectedLanguage}_time-${selectedTimeRange}_sort-${selectedSort}_stars-${minStars}_lic-${selectedLicense}_org-${queryOrg}_arch-${queryArchived}_sz-${querySize}_forks-${queryForksMin}`;
    
    try {
      let queryParts = [];

      // Time Range Logic
      if (selectedTimeRange > 0) {
        const date = new Date();
        date.setDate(date.getDate() - selectedTimeRange);
        const dateString = date.toISOString().split('T')[0];
        queryParts.push(`created:>${dateString}`);
      }

      // Language Filter
      if (selectedLanguage) {
        queryParts.push(selectedLanguage);
      }

      // License Filter
      if (selectedLicense) {
        queryParts.push(selectedLicense);
      }

      // Org / User Filter
      if (queryOrg.trim()) {
        queryParts.push(`org:${queryOrg.trim()}`);
      }

      // Archived filter
      if (queryArchived) {
        queryParts.push(`archived:${queryArchived}`);
      }

      // Size Filter
      if (querySize) {
        queryParts.push(`size:>=${querySize}`);
      }

      // Forks Filter
      if (queryForksMin) {
        queryParts.push(`forks:>=${queryForksMin}`);
      }

      // Keyword Search
      if (searchQuery.trim()) {
        queryParts.push(searchQuery.trim());
      }

      // Min Stars filter
      if (minStars) {
        queryParts.push(`stars:>=${minStars}`);
      } else {
        // Fetch all repositories without limiting to >=500 stars to make it fully open
        queryParts.push('stars:>=0');
      }

      const q = queryParts.join(' ');
      const activeSort = SORT_OPTIONS.find(o => o.value === selectedSort) || SORT_OPTIONS[0];

      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${activeSort.value}&order=${activeSort.order}&per_page=12&page=${currentPage}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(t('errors.rateLimitError'));
      }
      
      const data = await response.json();
      
      const languageColors = {
        javascript: '#f1e05a',
        typescript: '#3178c6',
        python: '#3572A5',
        rust: '#dea584',
        go: '#00ADD8',
        cpp: '#f34b7d',
        java: '#b07219',
        ruby: '#701516'
      };

      const items = data.items.map(item => {
        // Calculate velocity (stars per day) since created date
        const createdDate = new Date(item.created_at);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - createdDate);
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const velocity = parseFloat((item.stargazers_count / diffDays).toFixed(1));

        return {
          id: item.id,
          name: item.name,
          owner: { 
            login: item.owner.login,
            avatar_url: item.owner.avatar_url
          },
          description: item.description,
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language,
          languageColor: languageColors[item.language?.toLowerCase()] || '#71717a',
          html_url: item.html_url,
          created_at: item.created_at,
          velocity_score: velocity
        };
      });

      setRepos(items);
      const isMore = data.total_count > currentPage * 12;
      setHasMore(isMore);
      setTotalCount(data.total_count);
      setIsOfflineCached(false);
      localStorage.setItem(cacheKey, JSON.stringify({ items, hasMore: isMore, totalCount: data.total_count }));
    } catch (err) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setRepos(parsed.items || []);
          setHasMore(!!parsed.hasMore);
          setTotalCount(parsed.totalCount || 0);
          setIsOfflineCached(true);
        } catch (e) {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrendingRepos();
    }, 400);

    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, selectedLanguage, selectedTimeRange, selectedSort, minStars, selectedLicense, queryOrg, queryArchived, querySize, queryForksMin]);

  // Export current list to json file
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(repos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "gitradar-trends.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalPages = totalCount > 0 
    ? Math.max(1, Math.ceil(totalCount / 12)) 
    : (hasMore ? currentPage + 1 : currentPage);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePage = 10;
    
    const endPage = Math.min(totalPages, maxVisiblePage);
    for (let i = 1; i <= endPage; i++) {
      items.push(
        <button
          key={i}
          onClick={() => updateParam('page', i)}
          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer h-8 min-w-[32px] ${
            currentPage === i
              ? 'bg-[var(--text-color)] text-[var(--bg-color)] border-[var(--text-color)] font-bold'
              : 'border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--badge-bg)] bg-[var(--card-bg)]'
          }`}
        >
          {i}
        </button>
      );
    }
    
    if (totalPages > maxVisiblePage) {
      items.push(<span key="ellipsis-1" className="text-xs text-[var(--meta-text)] px-1">...</span>);
      
      if (currentPage > maxVisiblePage && currentPage < totalPages) {
        items.push(
          <button
            key={currentPage}
            onClick={() => updateParam('page', currentPage)}
            className="px-2.5 py-1 rounded text-xs font-bold border border-[var(--text-color)] bg-[var(--text-color)] text-[var(--bg-color)] transition-colors cursor-pointer h-8 min-w-[32px]"
          >
            {currentPage}
          </button>
        );
        items.push(<span key="ellipsis-2" className="text-xs text-[var(--meta-text)] px-1">...</span>);
      }
      
      items.push(
        <button
          key={totalPages}
          onClick={() => updateParam('page', totalPages)}
          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer h-8 min-w-[32px] ${
            currentPage === totalPages
              ? 'bg-[var(--text-color)] text-[var(--bg-color)] border-[var(--text-color)] font-bold'
              : 'border-[var(--border-color)] text-[var(--text-color)] hover:bg-[var(--badge-bg)] bg-[var(--card-bg)]'
          }`}
        >
          {totalPages}
        </button>
      );
    }
    
    return items;
  };

  return (
    <div className="space-y-6">
      
      {/* Offline Caching indicator */}
      {isOfflineCached && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
          <span className="size-2 bg-amber-500 rounded-full shrink-0" />
          <span>{t('offline.message')}</span>
        </div>
      )}
      
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2 relative z-20">
        
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="size-4 text-[var(--meta-text)]" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] rounded-lg py-2 pl-10 pr-4 text-sm placeholder-zinc-400 focus:outline-none h-10"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-between gap-2 border border-[var(--border-color)] px-4 py-2 rounded-lg text-sm text-[var(--text-color)] hover:bg-[var(--badge-bg)] transition-colors h-10 cursor-pointer ${
              filtersOpen ? 'bg-[var(--badge-bg)] font-semibold' : 'bg-[var(--card-bg)]'
            }`}
          >
            <SlidersHorizontal className="size-4 text-[var(--meta-text)]" />
            <span>{t('filters.button')}</span>
            <ChevronDown className={`size-4 text-[var(--meta-text)] transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          <Button
            variant="outline"
            className="h-10 text-[var(--text-color)] border-[var(--border-color)] px-3 cursor-pointer"
            onClick={handleExportJson}
            title={t('filters.exportTrends')}
          >
            <Download className="size-4" />
          </Button>
        </div>

      </div>

      {/* Main Grid Layout: List on Left, Advanced Filters Sidebar on Right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Repo List Area */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Bookmarked Repositories */}
          {bookmarks.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-[var(--border-color)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--meta-text)]">
                    {t('bookmarks.title')} ({bookmarks.length})
                  </h3>
                  <p className="text-[10px] text-[var(--meta-text)]">{t('bookmarks.selectToCompare')}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Export Bookmarks */}
                  <button 
                    onClick={handleExportBookmarks}
                    className="text-[10px] font-bold text-[var(--meta-text)] hover:text-[var(--text-color)] border border-[var(--border-color)] px-2 py-1 rounded bg-[var(--badge-bg)] flex items-center gap-1 cursor-pointer"
                    title={t('bookmarks.exportAsJson')}
                  >
                    <Download className="size-3" /> {t('bookmarks.export')}
                  </button>

                  {/* Import Bookmarks */}
                  <label className="text-[10px] font-bold text-[var(--meta-text)] hover:text-[var(--text-color)] border border-[var(--border-color)] px-2 py-1 rounded bg-[var(--badge-bg)] flex items-center gap-1 cursor-pointer">
                    <Upload className="size-3" /> {t('bookmarks.import')}
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBookmarks} 
                      className="hidden" 
                    />
                  </label>

                  <button 
                    onClick={() => {
                      setBookmarks([]);
                      setCompareIds([]);
                      localStorage.removeItem('gitradar.bookmarks');
                    }}
                    className="text-[10px] font-bold text-red-500 hover:underline ml-2 cursor-pointer"
                  >
                    {t('bookmarks.clearAll')}
                  </button>
                </div>
              </div>

              {/* Bookmarks Grid List with Notes fields */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {bookmarks.map(repo => (
                  <div key={repo.id} className="p-3 border border-[var(--border-color)] rounded-lg bg-[var(--badge-bg)] flex flex-col justify-between gap-2 relative group/item">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        {/* Comparison Checkbox */}
                        <input 
                          type="checkbox"
                          checked={compareIds.includes(repo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompareIds([...compareIds, repo.id]);
                            } else {
                              setCompareIds(compareIds.filter(id => id !== repo.id));
                            }
                          }}
                          className="size-3.5 rounded border-[var(--border-color)] text-[var(--text-color)] focus:ring-0 cursor-pointer shrink-0"
                          title={t('bookmarks.selectForComparison')}
                        />
                        <div className="min-w-0">
                          <Link to={`/repo/${repo.owner?.login}/${repo.name}`} className="text-xs font-bold text-[var(--text-color)] hover:underline block truncate">
                            {repo.name}
                          </Link>
                          <span className="text-[10px] text-[var(--meta-text)] block truncate">{t('common.by')} {repo.owner?.login}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggleBookmark(repo.id)}
                        className="text-[var(--meta-text)] hover:text-[var(--text-color)] cursor-pointer text-sm font-semibold px-1 shrink-0"
                        title={t('bookmarks.removeBookmark')}
                      >
                        ×
                      </button>
                    </div>

                    {/* Bookmark Notes Input Field */}
                    <div className="mt-1">
                      <input 
                        type="text"
                        placeholder={t('bookmarks.addNote')}
                        value={bookmarkNotes[repo.id] || ''}
                        onChange={(e) => handleUpdateNote(repo.id, e.target.value)}
                        className="w-full text-[10px] px-2 py-1 rounded bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-color)] focus:outline-none focus:border-zinc-400 placeholder-[var(--meta-text)]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Repository Comparison Matrix Panel */}
              {compareIds.length >= 2 && (() => {
                const comparedRepos = bookmarks.filter(r => compareIds.includes(r.id));
                return (
                  <div className="p-4 border border-[var(--border-color)] bg-[var(--card-bg)] rounded-xl space-y-4 animate-fade-in shadow-sm">
                    <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">
                        <BarChart3 className="size-4 text-blue-500" />
                        <span>{t('compare.title')} ({comparedRepos.length})</span>
                      </div>
                      <button 
                        onClick={() => setCompareIds([])}
                        className="text-[10px] font-bold text-[var(--meta-text)] hover:text-[var(--text-color)] underline cursor-pointer"
                      >
                        {t('compare.clearMatrix')}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--meta-text)] uppercase bg-[var(--badge-bg)]">
                            <th className="p-2.5">{t('compare.repoMetric')}</th>
                            {comparedRepos.map(r => (
                              <th key={r.id} className="p-2.5 font-bold text-[var(--text-color)] truncate max-w-[120px]">{r.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-color)]">
                          <tr>
                            <td className="p-2.5 font-semibold text-[var(--meta-text)]">{t('compare.stars')}</td>
                            {comparedRepos.map(r => (
                              <td key={r.id} className="p-2.5 font-bold">⭐ {r.stars?.toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-[var(--meta-text)]">{t('compare.forks')}</td>
                            {comparedRepos.map(r => (
                              <td key={r.id} className="p-2.5 font-medium">{r.forks?.toLocaleString()}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-[var(--meta-text)]">{t('compare.velocityScore')}</td>
                            {comparedRepos.map(r => (
                              <td key={r.id} className="p-2.5 text-blue-500 font-bold">⚡ {r.velocity_score}{t('repo.perDay')}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-[var(--meta-text)]">{t('compare.language')}</td>
                            {comparedRepos.map(r => (
                              <td key={r.id} className="p-2.5">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--badge-bg)] text-[var(--text-color)] font-medium border border-[var(--border-color)] text-[10px]">
                                  <span className="size-1.5 rounded-full" style={{ backgroundColor: r.languageColor || '#71717a' }} />
                                  {r.language || 'N/A'}
                                </span>
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-[var(--meta-text)]">{t('compare.notes')}</td>
                            {comparedRepos.map(r => (
                              <td key={r.id} className="p-2.5 italic text-[var(--meta-text)] font-mono max-w-[120px] truncate" title={bookmarkNotes[r.id] || ''}>
                                {bookmarkNotes[r.id] || t('compare.noNotes')}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── Trending Leaderboard ─── */}
          {(() => {
            const activeSortObj = LEADERBOARD_SORTS.find(s => s.key === lbSort) || LEADERBOARD_SORTS[0];
            const sorted = [...lbRepos]
              .sort(activeSortObj.sortFn)
              .slice(0, 10);
            
            const podium = sorted.slice(0, 3);
            const rest = sorted.slice(3);

            if (lbLoading && lbRepos.length === 0) {
              return (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                        <Trophy className="size-3.5 text-white" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">{t('leaderboard.title')}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
                        <div className="flex flex-col items-center gap-3">
                          <div className="size-12 rounded-xl shimmer-bg" />
                          <div className="h-3 w-20 rounded shimmer-bg" />
                          <div className="h-3 w-14 rounded shimmer-bg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (sorted.length === 0) return null;
            
            // Podium order: 2nd | 1st | 3rd  (classic leaderboard layout)
            const podiumOrder = podium.length >= 3 
              ? [podium[1], podium[0], podium[2]] 
              : podium;
            const podiumRanks = podium.length >= 3 ? [2, 1, 3] : podium.map((_, i) => i + 1);

            const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
            const PODIUM_STYLES = {
              1: {
                border: 'border-amber-500/40',
                bg: 'bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent',
                glow: 'shadow-[0_0_30px_rgba(245,158,11,0.12)]',
                ring: 'ring-1 ring-amber-500/20',
                barColor: 'bg-gradient-to-t from-amber-500/30 to-amber-400/10',
                barHeight: 'h-20',
                avatarSize: 'size-14',
                textSize: 'text-sm',
                velBg: 'bg-amber-500/15 text-amber-600',
              },
              2: {
                border: 'border-slate-400/30',
                bg: 'bg-gradient-to-b from-slate-300/10 via-slate-400/5 to-transparent',
                glow: 'shadow-[0_0_20px_rgba(148,163,184,0.08)]',
                ring: 'ring-1 ring-slate-400/15',
                barColor: 'bg-gradient-to-t from-slate-400/25 to-slate-300/10',
                barHeight: 'h-14',
                avatarSize: 'size-11',
                textSize: 'text-xs',
                velBg: 'bg-slate-400/15 text-slate-500',
              },
              3: {
                border: 'border-orange-700/25',
                bg: 'bg-gradient-to-b from-orange-600/10 via-amber-700/5 to-transparent',
                glow: 'shadow-[0_0_15px_rgba(194,120,60,0.08)]',
                ring: 'ring-1 ring-orange-600/15',
                barColor: 'bg-gradient-to-t from-orange-600/25 to-orange-500/10',
                barHeight: 'h-10',
                avatarSize: 'size-11',
                textSize: 'text-xs',
                velBg: 'bg-orange-500/15 text-orange-600',
              }
            };

            return (
              <div className="space-y-4 animate-fade-in">
                {/* Leaderboard Header */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                        <Trophy className="size-3.5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)] flex items-center gap-1.5">
                          {t('leaderboard.title')}
                          <Flame className="size-3 text-orange-500 animate-pulse" />
                          {lbLoading && <Loader2 className="size-3 text-[var(--meta-text)] animate-spin" />}
                        </h3>
                        <p className="text-[10px] text-[var(--meta-text)]">
                          {LEADERBOARD_PERIODS.find(p => p.key === lbPeriod)?.label} · {activeSortObj.icon} {activeSortObj.label} {t('leaderboard.sortSuffix')}
                        </p>
                      </div>
                    </div>
                    {/* Period Filter Tabs */}
                    <div className="flex items-center gap-1 bg-[var(--badge-bg)] p-1 rounded-lg border border-[var(--border-color)]">
                      {LEADERBOARD_PERIODS.map(p => (
                        <button
                          key={p.key}
                          onClick={() => setLbPeriod(p.key)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                            lbPeriod === p.key
                              ? 'bg-[var(--text-color)] text-[var(--bg-color)] shadow-sm'
                              : 'text-[var(--meta-text)] hover:text-[var(--text-color)] hover:bg-[var(--card-bg)]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Sort Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)] shrink-0">{t('leaderboard.sortLabel')}:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {LEADERBOARD_SORTS.map(s => (
                        <button
                          key={s.key}
                          onClick={() => setLbSort(s.key)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                            lbSort === s.key
                              ? 'bg-[var(--text-color)] text-[var(--bg-color)] border-[var(--text-color)] shadow-sm'
                              : 'bg-[var(--card-bg)] text-[var(--meta-text)] border-[var(--border-color)] hover:text-[var(--text-color)] hover:border-[var(--hover-border)]'
                          }`}
                        >
                          <span>{s.icon}</span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ═══ Podium: Top 3 ═══ */}
                {podium.length >= 3 && (
                  <div className="grid grid-cols-3 gap-3 items-end">
                    {podiumOrder.map((repo, idx) => {
                      const rank = podiumRanks[idx];
                      const s = PODIUM_STYLES[rank];
                      return (
                        <Link
                          key={repo.id}
                          to={`/repo/${repo.owner?.login}/${repo.name}`}
                          className={`group/pod block rounded-xl border ${s.border} ${s.bg} ${s.glow} ${s.ring} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg overflow-hidden`}
                        >
                          {/* Podium Bar (height varies by rank) */}
                          <div className={`${s.barColor} ${s.barHeight} flex items-center justify-center relative`}>
                            <span className={`${rank === 1 ? 'text-3xl' : 'text-2xl'} leading-none drop-shadow-sm`}>
                              {MEDALS[rank]}
                            </span>
                            {rank === 1 && (
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                                <Flame className="size-4 text-amber-500/60 animate-pulse" />
                              </div>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="p-3 flex flex-col items-center text-center gap-2">
                            <img
                              src={repo.owner?.avatar_url}
                              alt={repo.owner?.login}
                              className={`${s.avatarSize} rounded-xl border-2 ${s.border} bg-[var(--badge-bg)] object-cover shadow-sm`}
                            />
                            <div className="min-w-0 w-full">
                              <p className={`${s.textSize} font-bold text-[var(--text-color)] truncate group-hover/pod:underline`}>
                                {repo.name}
                              </p>
                              <p className="text-[10px] text-[var(--meta-text)] truncate">
                                {repo.owner?.login}
                              </p>
                            </div>

                            {/* Velocity Badge */}
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${s.velBg}`}>
                              <TrendingUp className="size-3" />
                              {repo.velocity_score}{t('repo.perDay')}
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center justify-center gap-3 text-[10px] text-[var(--meta-text)]">
                              <span className="inline-flex items-center gap-1">
                                <Star className="size-3 text-amber-500" />
                                <span className="font-semibold">{repo.stars?.toLocaleString()}</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <GitFork className="size-3" />
                                {repo.forks?.toLocaleString()}
                              </span>
                            </div>

                            {/* Language */}
                            {repo.language && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--badge-bg)] border border-[var(--border-color)] text-[var(--meta-text)]">
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: repo.languageColor || '#71717a' }} />
                                {repo.language}
                              </span>
                            )}

                            {/* Description */}
                            {repo.description && (
                              <p className="text-[10px] text-[var(--meta-text)] line-clamp-2 leading-relaxed">
                                {repo.description.length > 60 ? repo.description.slice(0, 60) + '…' : repo.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* ═══ Vertical List: #4 – #10 ═══ */}
                {rest.length > 0 && (
                  <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--card-bg)]">
                    {rest.map((repo, idx) => {
                      const rank = idx + 4;
                      return (
                        <Link
                          key={repo.id}
                          to={`/repo/${repo.owner?.login}/${repo.name}`}
                          className={`group/row flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--badge-bg)] ${
                            idx < rest.length - 1 ? 'border-b border-[var(--border-color)]' : ''
                          }`}
                        >
                          {/* Rank Number */}
                          <span className="text-xs font-black text-[var(--meta-text)] opacity-50 w-5 text-center shrink-0">
                            {rank}
                          </span>

                          {/* Avatar */}
                          <img
                            src={repo.owner?.avatar_url}
                            alt={repo.owner?.login}
                            className="size-7 rounded-lg border border-[var(--border-color)] shrink-0 bg-[var(--badge-bg)] object-cover"
                          />

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-color)] truncate group-hover/row:underline">{repo.name}</span>
                              {repo.language && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--badge-bg)] border border-[var(--border-color)] text-[var(--meta-text)] shrink-0">
                                  <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: repo.languageColor || '#71717a' }} />
                                  {repo.language}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--meta-text)] truncate block">
                              {repo.description ? (repo.description.length > 70 ? repo.description.slice(0, 70) + '…' : repo.description) : t('leaderboard.noDescription')}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="shrink-0 flex items-center gap-3 text-[10px] text-[var(--meta-text)]">
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Star className="size-3 text-amber-500" />
                              {repo.stars?.toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <GitFork className="size-3" />
                              {repo.forks?.toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-[var(--meta-text)]">
                              <TrendingUp className="size-3" />
                              {repo.velocity_score}/d
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Loading state - Skeletons */}
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="rounded-xl border-[var(--border-color)] bg-[var(--card-bg)]">
                  <CardContent className="p-5 flex flex-col justify-between h-[150px]">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-1/2 rounded shimmer-bg" />
                        <div className="h-4.5 w-14 rounded shimmer-bg" />
                      </div>
                      <div className="h-3.5 w-full rounded shimmer-bg" />
                    </div>
                    <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-3">
                      <div className="h-3 w-16 rounded shimmer-bg" />
                      <div className="h-3 w-12 rounded shimmer-bg" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <Card className="border-[var(--border-color)] bg-[var(--badge-bg)]">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="size-8 text-[var(--meta-text)]" />
                <h3 className="mt-3 text-sm font-semibold text-[var(--text-color)]">{t('errors.unableToFetch')}</h3>
                <p className="mt-1 max-w-[36ch] text-xs text-[var(--meta-text)]">
                  {error}
                </p>
                <Button variant="outline" size="sm" className="mt-4 border-[var(--border-color)] text-[var(--text-color)]" onClick={fetchTrendingRepos}>
                  <RefreshCw className="mr-1.5 size-3.5" /> {t('errors.tryAgain')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !error && repos.length === 0 && (
            <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--badge-bg)]/30 animate-fade-in">
              <p className="text-sm text-[var(--meta-text)] font-medium">{t('search.noResults')}</p>
            </div>
          )}

          {/* Repos list */}
          {!loading && !error && repos.length > 0 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs text-[var(--meta-text)]">
                <span>{t('search.showing')} {repos.length} {t('search.of')} {totalCount ? totalCount.toLocaleString() : 'N/A'} {t('search.reposFound')}</span>

              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {repos.map(repo => (
                  <RepoCard 
                    key={repo.id} 
                    repo={repo} 
                    isBookmarked={bookmarks.some(b => b.id === repo.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>

              {/* Minimalist Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center items-center gap-3 pt-6 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => updateParam('page', Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--badge-bg)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer h-8"
                  >
                    <ChevronLeft className="size-3.5" />
                    {t('pagination.prev')}
                  </button>

                  <div className="flex items-center gap-1 flex-wrap">
                    {renderPaginationItems()}
                  </div>

                  <button
                    onClick={() => updateParam('page', Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages || !hasMore || loading}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--badge-bg)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer h-8"
                  >
                    {t('pagination.next')}
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar Filters Dropdown Panel - Inline/Sidebar Style */}
        {filtersOpen && (
          <div className="w-full lg:w-64 shrink-0 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">{t('filters.title')}</h3>
              <button 
                onClick={() => setFiltersOpen(false)}
                className="text-[11px] font-bold text-[var(--meta-text)] hover:text-[var(--text-color)] lg:hidden cursor-pointer"
              >
                {t('filters.close')}
              </button>
            </div>
            
            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.language')}</label>
              <select
                value={selectedLanguage}
                onChange={(e) => updateParam('lang', e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-2 text-xs text-[var(--text-color)] focus:outline-none"
              >
                {LANGUAGE_OPTIONS.map(lang => (
                  <option key={lang.label} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Created Period selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.createdPeriod')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TIME_RANGES.map(range => (
                  <button
                    key={range.label}
                    onClick={() => updateParam('time', range.days)}
                    className={`px-2 py-1 text-[11px] rounded border text-left flex justify-between items-center cursor-pointer transition-colors ${
                      selectedTimeRange === range.days 
                        ? 'border-[var(--text-color)] bg-[var(--text-color)] text-[var(--bg-color)] font-medium' 
                        : 'border-[var(--border-color)] hover:bg-[var(--badge-bg)] text-[var(--meta-text)]'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort by selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.sortMetric')}</label>
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateParam('sort', opt.value)}
                    className={`px-2 py-1.5 text-xs rounded text-left flex justify-between items-center cursor-pointer transition-colors ${
                      selectedSort === opt.value 
                        ? 'bg-[var(--badge-bg)] text-[var(--text-color)] font-bold' 
                        : 'hover:bg-[var(--badge-bg)] text-[var(--meta-text)]'
                    }`}
                  >
                    {opt.label}
                    {selectedSort === opt.value && <Check className="size-3.5 text-[var(--text-color)]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* QUERY BUILDER: Org or User filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.orgOrUser')}</label>
              <input
                type="text"
                value={queryOrg}
                onChange={(e) => updateParam('org', e.target.value)}
                placeholder="e.g. google, microsoft"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] rounded-md p-1.5 text-xs focus:outline-none placeholder-zinc-500"
              />
            </div>

            {/* QUERY BUILDER: Include Archived */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.archivedStatus')}</label>
              <select
                value={queryArchived}
                onChange={(e) => updateParam('archived', e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-2 text-xs text-[var(--text-color)] focus:outline-none"
              >
                <option value="">{t('filters.archivedAny')}</option>
                <option value="false">{t('filters.archivedActiveOnly')}</option>
                <option value="true">{t('filters.archivedOnly')}</option>
              </select>
            </div>

            {/* QUERY BUILDER: Size input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.minSize')}</label>
              <input
                type="number"
                value={querySize}
                onChange={(e) => updateParam('size', e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] rounded-md p-1.5 text-xs focus:outline-none placeholder-zinc-500"
              />
            </div>

            {/* QUERY BUILDER: Forks threshold */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.minForks')}</label>
              <input
                type="number"
                value={queryForksMin}
                onChange={(e) => updateParam('forks_min', e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] rounded-md p-1.5 text-xs focus:outline-none placeholder-zinc-500"
              />
            </div>

            {/* License dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.license')}</label>
              <select
                value={selectedLicense}
                onChange={(e) => updateParam('license', e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-2 text-xs text-[var(--text-color)] focus:outline-none"
              >
                {LICENSE_OPTIONS.map(lic => (
                  <option key={lic.label} value={lic.value}>{lic.label}</option>
                ))}
              </select>
            </div>

            {/* Stars threshold input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('filters.minimumStars')}</label>
              <input
                type="number"
                value={minStars}
                onChange={(e) => updateParam('min_stars', e.target.value)}
                placeholder={t('filters.noLimit')}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-color)] rounded-md p-1.5 text-xs placeholder-zinc-405 focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
              <button
                onClick={() => {
                  setSearchParams(new URLSearchParams({ time: '7', page: '1' }));
                }}
                className="text-[11px] font-semibold text-[var(--meta-text)] hover:text-[var(--text-color)] hover:underline cursor-pointer"
              >
                {t('filters.reset')}
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-[11px] font-bold text-[var(--text-color)] hover:underline cursor-pointer lg:hidden"
              >
                {t('filters.apply')}
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
