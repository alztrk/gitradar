import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Star, GitFork, Eye, Globe, ExternalLink, Calendar, GitCommit, Code, AlertTriangle, CheckCircle2, Info, ShieldAlert, Folder, File, FileCode, FileJson, FileImage, FileText, FileSpreadsheet, FileArchive, FileAudio, FileVideo, Binary } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';
import Editor from '@monaco-editor/react';

const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'].includes(ext);
};

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (isImageFile(filename)) {
    return <FileImage className="size-4 text-emerald-500 shrink-0" />;
  }
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    return <FileCode className="size-4 text-amber-500 shrink-0" />;
  }
  if (['css', 'scss', 'sass', 'less'].includes(ext)) {
    return <FileCode className="size-4 text-pink-500 shrink-0" />;
  }
  if (['json', 'yml', 'yaml', 'xml', 'toml', 'ini', 'cfg'].includes(ext)) {
    return <FileJson className="size-4 text-indigo-500 shrink-0" />;
  }
  if (['md', 'txt', 'rst', 'adoc'].includes(ext)) {
    return <FileText className="size-4 text-sky-500 shrink-0" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z', 'tgz'].includes(ext)) {
    return <FileArchive className="size-4 text-orange-500 shrink-0" />;
  }
  if (['rs', 'go', 'cpp', 'c', 'h', 'hpp', 'cs', 'java', 'kt', 'swift', 'py', 'rb', 'pl', 'php', 'sh', 'bash'].includes(ext)) {
    return <FileCode className="size-4 text-rose-500 shrink-0" />;
  }
  if (['pdf', 'docx', 'doc'].includes(ext)) {
    return <FileText className="size-4 text-red-500 shrink-0" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="size-4 text-green-600 shrink-0" />;
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <FileAudio className="size-4 text-violet-500 shrink-0" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return <FileVideo className="size-4 text-fuchsia-500 shrink-0" />;
  }
  if (['bin', 'exe', 'dll', 'so', 'o'].includes(ext)) {
    return <Binary className="size-4 text-zinc-500 shrink-0" />;
  }
  return <File className="size-4 text-[var(--meta-text)] shrink-0" />;
};

const getFileLanguage = (filename) => {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop().toLowerCase();
  const mapping = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    cpp: 'cpp',
    c: 'c',
    sh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql'
  };
  return mapping[ext] || 'plaintext';
};

export function RepoDetail() {
  const { owner, name } = useParams();
  const { t } = useI18n();
  const [repoData, setRepoData] = useState(null);
  const [readmeContent, setReadmeContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [readmeLoading, setReadmeLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  
  // Advanced features state
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [toc, setToc] = useState([]);
  const [readingProgress, setReadingProgress] = useState(0);

  // Source Explorer state
  const [contents, setContents] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('readme'); // 'readme' or 'code'

  // Contributors state
  const [contributors, setContributors] = useState([]);
  const [contributorsLoading, setContributorsLoading] = useState(false);

  const fetchRepoContents = async (path = '') => {
    setContentsLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${path}`);
      if (response.ok) {
        const data = await response.json();
        // Sort folders first, then files
        const sorted = data.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
        setContents(sorted);
        setCurrentPath(path);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setContentsLoading(false);
    }
  };

  const fetchSingleFileContent = async (file) => {
    setSelectedFile(file);
    if (isImageFile(file.name)) {
      setFileContent('');
      return;
    }
    setFileLoading(true);
    try {
      const response = await fetch(file.download_url);
      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
      }
    } catch (e) {
        setFileContent(t('repoDetail.errorLoadingFile'));
    } finally {
      setFileLoading(false);
    }
  };

  // Monitor scroll for reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.pageYOffset / totalHeight) * 100;
        setReadingProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Details with Offline Cache fallback
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      
      const cacheKey = `gitradar.cache_repo_${owner}_${name}`;
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}`);
        if (!response.ok) {
          throw new Error(t('api.repoDetailsError'));
        }
        const data = await response.json();
        setRepoData(data);
        setIsOfflineCached(false);
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err) {
        // Fallback to local storage
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setRepoData(JSON.parse(cached));
          setIsOfflineCached(true);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchReadme = async () => {
      setReadmeLoading(true);
      const readmeCacheKey = `gitradar.cache_readme_${owner}_${name}`;
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}/readme`);
        if (response.ok) {
          const fileData = await response.json();
          const rawBinary = atob(fileData.content.replace(/\s/g, ''));
          const utf8Text = decodeURIComponent(
            Array.prototype.map.call(rawBinary, (c) => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')
          );
          const parsedHtml = await marked.parse(utf8Text);
          
          const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${name}/HEAD`;
          const blobBaseUrl = `https://github.com/${owner}/${name}/blob/HEAD`;
          
          const resolvedHtml = parsedHtml
            .replace(/(<img[^>]+src=")(?!http|https|\/\/)([^"]+)(")/gi, `$1${rawBaseUrl}/$2$3`)
            .replace(/(<a[^>]+href=")(?!http|https|\/\/)([^"]+)(")/gi, `$1${blobBaseUrl}/$2$3`);

          const parser = document.createElement('div');
          parser.innerHTML = resolvedHtml;
          const headings = parser.querySelectorAll('h2, h3');
          const parsedToc = Array.from(headings).map((h, i) => {
            const text = h.innerText;
            const id = h.id || `readme-heading-${i}`;
            h.id = id;
            return { id, text, level: h.tagName === 'H2' ? 2 : 3 };
          });
          setToc(parsedToc);
          setReadmeContent(parser.innerHTML);
          localStorage.setItem(readmeCacheKey, parser.innerHTML);
        } else {
          setReadmeContent(`<p class="text-zinc-500 text-xs">${t('repoDetail.noReadme')}</p>`);
        }
      } catch (err) {
        // Try fallback cache
        const cachedReadme = localStorage.getItem(readmeCacheKey);
        if (cachedReadme) {
          const parser = document.createElement('div');
          parser.innerHTML = cachedReadme;
          const headings = parser.querySelectorAll('h2, h3');
          const parsedToc = Array.from(headings).map((h, i) => {
            const text = h.innerText;
            const id = h.id || `readme-heading-${i}`;
            h.id = id;
            return { id, text, level: h.tagName === 'H2' ? 2 : 3 };
          });
          setToc(parsedToc);
          setReadmeContent(parser.innerHTML);
          setIsOfflineCached(true);
        } else {
          setReadmeContent(`<p class="text-zinc-500 text-xs">${t('repoDetail.couldNotLoadReadme')}</p>`);
        }
      } finally {
        setReadmeLoading(false);
      }
    };

    const fetchContributors = async () => {
      setContributorsLoading(true);
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}/contributors?per_page=5`);
        if (response.ok) {
          const data = await response.json();
          setContributors(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setContributorsLoading(false);
      }
    };

    fetchDetails();
    fetchReadme();
    fetchContributors();
  }, [owner, name]);

  // Code Copy Buttons effect
  useEffect(() => {
    if (readmeLoading || !readmeContent) return;
    
    const container = document.querySelector('.readme-container');
    if (!container) return;
    
    const preElements = container.querySelectorAll('pre');
    preElements.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;
      
      pre.style.position = 'relative';
      pre.className += ' group rounded-lg bg-zinc-950 p-4 border border-[var(--border-color)] overflow-x-auto';
      
      const code = pre.querySelector('code');
      const textToCopy = code ? code.innerText : pre.innerText;
      
      const btn = document.createElement('button');
      btn.className = 'copy-btn absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer';
      btn.innerText = t('repoDetail.copy');
      
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(textToCopy);
        btn.innerText = t('repoDetail.copied');
        btn.style.color = '#34d399';
        setTimeout(() => {
          btn.innerText = t('repoDetail.copy');
          btn.style.color = '';
        }, 2000);
      });
      
      pre.appendChild(btn);
    });
  }, [readmeLoading, readmeContent]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border-color)] border-t-[var(--text-color)]" />
        <p className="text-sm font-semibold text-[var(--meta-text)]">{t('repoDetail.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-[var(--border-color)] bg-[var(--badge-bg)]">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-base font-semibold text-[var(--text-color)]">{t('repoDetail.analysisFailed')}</h3>
          <p className="mt-2 text-xs text-[var(--meta-text)]">{error}</p>
          <Link to="/" className="mt-4">
            <Button size="sm">{t('repoDetail.goBackHome')}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const generateChartData = () => {
    if (!repoData) return [];
    
    const createdDate = new Date(repoData.created_at);
    const currentDate = new Date();
    
    // Total days since repo was created
    const diffTime = Math.abs(currentDate - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const totalStars = repoData.stargazers_count;
    const totalForks = repoData.forks_count;
    
    const intervals = 8;
    const chartData = [];

    // Case: Repo created today or extremely recently (diffDays is less than 2)
    if (diffDays <= 1) {
      return [
        {
          date: createdDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' (' + t('embed.created') + ')',
          stars: 0,
          forks: 0,
          velocity: 0
        },
        {
          date: t('embed.now'),
          stars: totalStars,
          forks: totalForks,
          velocity: parseFloat(totalStars.toFixed(1))
        }
      ];
    }

    const isRecent = diffDays <= 30;
    
    const timeStep = diffTime / intervals;

    for (let i = 0; i <= intervals; i++) {
      const isLastStep = i === intervals;
      
      const stepDate = isLastStep 
        ? currentDate 
        : new Date(createdDate.getTime() + (i * timeStep));
        
      let formattedDate = '';
      if (isRecent) {
        formattedDate = stepDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else {
        formattedDate = stepDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
      
      const factor = i / intervals;
      const starsAtStep = isLastStep ? totalStars : Math.round(totalStars * factor);
      const forksAtStep = isLastStep ? totalForks : Math.round(totalForks * factor);
      
      const stepDiff = Math.max(1, Math.ceil((stepDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      const velocityAtStep = parseFloat((starsAtStep / stepDiff).toFixed(1));

      chartData.push({
        date: isLastStep ? t('embed.now') : formattedDate,
        stars: starsAtStep,
        forks: forksAtStep,
        velocity: velocityAtStep
      });
    }

    return chartData;
  };

  const calculateHealthScore = () => {
    if (!repoData) return { grade: t('repoDetail.na'), score: 0, color: 'text-zinc-500', statusText: t('repoDetail.na'), breakdown: {}, insights: [] };

    const pushedDate = new Date(repoData.pushed_at);
    const currentDate = new Date();
    const daysSincePush = Math.max(0, Math.ceil((currentDate - pushedDate) / (1000 * 60 * 60 * 24)));
    const createdDate = new Date(repoData.created_at);
    const repoAgeDays = Math.max(1, Math.ceil((currentDate - createdDate) / (1000 * 60 * 60 * 24)));
    
    const stars = repoData.stargazers_count || 0;
    const forks = repoData.forks_count || 0;
    const openIssues = repoData.open_issues_count || 0;
    const velocity = stars / repoAgeDays;
    
    const hasIssuesEnabled = repoData.has_issues !== false;
    const isArchived = repoData.archived === true;

    // 1. Commit Activity (30% weight)
    let activityScore = 50;
    if (daysSincePush <= 1) activityScore = 100;
    else if (daysSincePush <= 7) activityScore = 90;
    else if (daysSincePush <= 30) activityScore = 75;
    else if (daysSincePush <= 90) activityScore = 55;
    else if (daysSincePush <= 180) activityScore = 35;
    else activityScore = 15;

    const isStableLegacy = stars > 5000 && forks > 500 && openIssues < 10;
    const isNewProject = repoAgeDays < 30;

    // Stable legacy projelerde aktivite dogal olarak dusuk olabilir
    if (isStableLegacy && daysSincePush <= 180) {
      activityScore = Math.max(activityScore, 70);
    }

    // 2. Issue Score (25% weight)
    let issueScore = 100;
    const issueRatio = openIssues / (stars + forks + 1);
    if (hasIssuesEnabled && openIssues > 0) {
      if (issueRatio <= 0.02) issueScore = 95;
      else if (issueRatio <= 0.05) issueScore = Math.round(85 - (issueRatio - 0.02) * 333);
      else if (issueRatio <= 0.15) issueScore = Math.round(75 - (issueRatio - 0.05) * 150);
      else issueScore = Math.max(10, Math.round(60 - (issueRatio - 0.15) * 100));
    }

    // 3. Community Traction Score (25% weight)
    const forkRatio = forks / (stars + 1);
    let communityScore = 0;
    if (forkRatio >= 0.20) communityScore = 100;
    else if (forkRatio >= 0.10) communityScore = 80;
    else if (forkRatio >= 0.05) communityScore = 60;
    else if (forkRatio >= 0.02) communityScore = 40;
    else if (forkRatio >= 0.005) communityScore = 25;
    else communityScore = Math.max(5, Math.round(forkRatio * 2000));

    // 4. Daily Traction/Velocity Score (20% weight)
    let velocityScore = 0;
    if (velocity >= 5) velocityScore = 100;
    else if (velocity >= 2) velocityScore = 85;
    else if (velocity >= 1) velocityScore = 70;
    else if (velocity >= 0.3) velocityScore = 50;
    else if (velocity >= 0.1) velocityScore = 30;
    else velocityScore = Math.max(5, Math.round(velocity * 100));

    // Weighted scoring
    let finalScore = 0;
    let breakdown = {};

    if (!hasIssuesEnabled) {
      finalScore = Math.round(
        (activityScore * 0.40) + 
        (communityScore * 0.35) + 
        (velocityScore * 0.25)
      );
      breakdown = {
        activity: activityScore,
        community: communityScore,
        velocity: velocityScore,
        issues: t('repoDetail.disabled')
      };
    } else {
      finalScore = Math.round(
        (activityScore * 0.30) + 
        (issueScore * 0.25) + 
        (communityScore * 0.25) + 
        (velocityScore * 0.20)
      );
      breakdown = {
        activity: activityScore,
        issues: issueScore,
        community: communityScore,
        velocity: velocityScore
      };
    }

    // Adjustments
    if (isNewProject) {
      // Yeni projelere kucuk bir bonus (henuz dagitilmamis potansiyel)
      finalScore = Math.round(finalScore * 1.05);
    }

    if (isArchived) {
      finalScore = Math.min(50, finalScore);
    }

    // Star tabani bonus (buyuk projeler daha stabil)
    if (stars > 10000) finalScore = Math.round(finalScore * 1.05);
    else if (stars > 1000) finalScore = Math.round(finalScore * 1.02);

    finalScore = Math.max(0, Math.min(100, finalScore));

    let grade = 'F';
    let color = 'text-rose-700 dark:text-rose-400 border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10';
    let statusText = t('repoDetail.statusInactive');

    if (finalScore >= 90) {
      grade = 'A';
      color = 'text-emerald-700 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10';
      statusText = t('repoDetail.statusExcellent');
    } else if (finalScore >= 75) {
      grade = 'B';
      color = 'text-blue-700 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10';
      statusText = t('repoDetail.statusHealthy');
    } else if (finalScore >= 55) {
      grade = 'C';
      color = 'text-amber-700 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10';
      statusText = t('repoDetail.statusModerate');
    } else if (finalScore >= 35) {
      grade = 'D';
      color = 'text-orange-700 dark:text-orange-400 border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10';
      statusText = t('repoDetail.statusLow');
    }

    // Status overrides
    if (isArchived) {
      statusText = t('repoDetail.statusArchived');
    } else if (isStableLegacy) {
      statusText = t('repoDetail.statusStable');
    } else if (isNewProject) {
      statusText = t('repoDetail.statusNew');
    }

    // Health Insights Generation
    const insights = [];
    if (isArchived) {
      insights.push({ type: 'error', text: t('repoDetail.insightArchived') });
    } else if (daysSincePush <= 7) {
      insights.push({ type: 'success', text: t('repoDetail.insightHighlyActive') });
    } else if (isStableLegacy) {
      insights.push({ type: 'info', text: t('repoDetail.insightStableCore') });
    } else if (daysSincePush > 60) {
      insights.push({ type: 'warning', text: t('repoDetail.insightStaleCommit') });
    }

    if (hasIssuesEnabled) {
      if (openIssues === 0 || issueScore >= 95) {
        insights.push({ type: 'success', text: t('repoDetail.insightHealthyBacklog') });
      } else if (issueScore < 50) {
        insights.push({ type: 'error', text: t('repoDetail.insightIssueLoad') });
      }
    } else {
      insights.push({ type: 'info', text: t('repoDetail.insightExternalTracker') });
    }

    if (isNewProject) {
      insights.push({ type: 'info', text: t('repoDetail.insightFreshProject').replace('{days}', repoAgeDays) });
    } else if (forkRatio >= 0.12) {
      insights.push({ type: 'success', text: t('repoDetail.insightStrongEngagement') });
    } else if (forkRatio < 0.03 && stars > 100) {
      insights.push({ type: 'warning', text: t('repoDetail.insightLowForks') });
    }

    return {
      grade,
      score: finalScore,
      color,
      statusText,
      breakdown,
      insights
    };
  };

  const { user, authFetch } = useAuth();
  const [voteCount, setVoteCount] = useState(0);
  const [userVote, setUserVote] = useState(0);
  const repoOwner = useParams().owner;
  const repoName = useParams().name;

  useEffect(() => {
    if (!repoData) return;
    const repoId = String(repoData.id);
    authFetch(`/api/votes/${repoId}`).then(r => r.json()).then(d => setVoteCount(d.net || 0)).catch(() => {});
    if (user) {
      authFetch(`/api/votes/${repoId}/user`).then(r => r.json()).then(d => setUserVote(d.vote_type || 0)).catch(() => {});
    }
  }, [repoData, user]);

  const vote = async (type) => {
    if (!user || !repoData) return;
    const repoId = String(repoData.id);
    const newType = userVote === type ? 0 : type;
    const res = await authFetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo_id: repoId, vote_type: newType }) });
    if (res.ok) {
      setUserVote(newType);
      setVoteCount(prev => prev + (newType === 0 ? (userVote === 1 ? -1 : userVote === -1 ? 1 : 0) : newType === 1 ? 1 : -1));
    }
  };

  const chartData = generateChartData();
  const health = calculateHealthScore();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Scroll Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 z-50 transition-all duration-100" 
        style={{ width: `${readingProgress}%` }}
      />

      {/* Offline caching fallback indicator */}
      {isOfflineCached && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
          <span className="size-2 bg-amber-500 rounded-full shrink-0" />
          <span>{t('offline.message')}</span>
        </div>
      )}

      {/* Back navigation */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--meta-text)] hover:text-[var(--text-color)]">
        <ArrowLeft className="size-4" />
        {t('repoDetail.backToDashboard')}
      </Link>

      {/* Main metadata block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          {repoData.owner?.avatar_url && (
            <img 
              src={repoData.owner.avatar_url} 
              alt={repoData.owner.login}
              className="size-16 rounded-xl border border-[var(--border-color)]"
            />
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-color)] leading-tight">
              {repoData.name}
            </h1>
            <p className="text-sm text-[var(--meta-text)]">
              {t('repoDetail.developedBy')} <span className="font-semibold text-[var(--text-color)]">{repoData.owner?.login}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <a href={repoData.html_url} target="_blank" rel="noopener noreferrer">
            <Button variant="default" className="flex items-center gap-2">
              {t('repoDetail.githubPage')}
              <ExternalLink className="size-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Health Scorecard Premium Section */}
      <Card className="border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-5">
                <div className={`size-16 rounded-xl border flex flex-col items-center justify-center font-black text-2xl shrink-0 ${health.color}`}>
                  {health.grade}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-color)] flex items-center gap-2">
                    <span>{t('repoDetail.healthScorecard')}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${health.color}`}>
                      {health.statusText}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--meta-text)] mt-0.5">{t('repoDetail.healthCalcDesc')}</p>
                </div>

                {/* Vote Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => vote(1)} className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${userVote === 1 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600' : 'border-[var(--border-color)] text-[var(--meta-text)] hover:border-emerald-500 hover:text-emerald-500'}`}>
                    ▲ {userVote === 1 ? 'Voted' : 'Upvote'}
                  </button>
                  <span className={`text-lg font-black min-w-[32px] text-center ${voteCount > 0 ? 'text-emerald-500' : voteCount < 0 ? 'text-rose-500' : 'text-[var(--meta-text)]'}`}>
                    {voteCount}
                  </span>
                  <button onClick={() => vote(-1)} className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${userVote === -1 ? 'bg-rose-500/20 border-rose-500 text-rose-600' : 'border-[var(--border-color)] text-[var(--meta-text)] hover:border-rose-500 hover:text-rose-500'}`}>
                    ▼ {userVote === -1 ? 'Voted' : 'Downvote'}
                  </button>
                  {!user && <span className="text-[10px] text-[var(--meta-text)] italic">{t('repoDetail.loginToVote')}</span>}
                </div>
              </div>

              {/* Health parameters breakdown list */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto text-xs shrink-0">
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--meta-text)] block">{t('repoDetail.commitActivity')}</span>
                  <div className="h-1.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${health.breakdown.activity}%` }} />
                  </div>
                  <span className="font-bold text-[var(--text-color)]">{health.breakdown.activity}%</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--meta-text)] block">{t('repoDetail.communitySupport')}</span>
                  <div className="h-1.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${health.breakdown.community}%` }} />
                  </div>
                  <span className="font-bold text-[var(--text-color)]">{health.breakdown.community}%</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--meta-text)] block">{t('repoDetail.issueResolution')}</span>
                  <div className="h-1.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${health.breakdown.issues}%` }} />
                  </div>
                  <span className="font-bold text-[var(--text-color)]">{health.breakdown.issues}%</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--meta-text)] block">{t('repoDetail.dailyTraction')}</span>
                  <div className="h-1.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${health.breakdown.velocity}%` }} />
                  </div>
                  <span className="font-bold text-[var(--text-color)]">{health.breakdown.velocity}%</span>
                </div>
              </div>
            </div>

            {/* Health insights segment */}
            {health.insights && health.insights.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('repoDetail.healthInsights')}</h4>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                  {health.insights.map((insight, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start p-3 rounded-lg border border-[var(--border-color)] bg-[var(--badge-bg)] text-xs text-[var(--text-color)]">
                      {insight.type === 'success' && <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />}
                      {insight.type === 'info' && <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />}
                      {insight.type === 'warning' && <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />}
                      {insight.type === 'error' && <ShieldAlert className="size-4 text-rose-500 shrink-0 mt-0.5" />}
                      <span>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[var(--border-color)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-[var(--badge-bg)] rounded-lg text-[var(--text-color)] border border-[var(--border-color)]">
              <Star className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--meta-text)]">{t('repoDetail.totalStars')}</p>
              <h3 className="text-xl font-bold text-[var(--text-color)] mt-0.5">{repoData.stargazers_count?.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border-color)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-[var(--badge-bg)] rounded-lg text-[var(--text-color)] border border-[var(--border-color)]">
              <GitFork className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--meta-text)]">{t('repoDetail.totalForks')}</p>
              <h3 className="text-xl font-bold text-[var(--text-color)] mt-0.5">{repoData.forks_count?.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border-color)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-[var(--badge-bg)] rounded-lg text-[var(--text-color)] border border-[var(--border-color)]">
              <Eye className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--meta-text)]">{t('repoDetail.watchers')}</p>
              <h3 className="text-xl font-bold text-[var(--text-color)] mt-0.5">{repoData.subscribers_count?.toLocaleString() || repoData.watchers_count?.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border-color)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-[var(--badge-bg)] rounded-lg text-[var(--text-color)] border border-[var(--border-color)]">
              <Globe className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--meta-text)]">{t('repoDetail.openIssues')}</p>
              <h3 className="text-xl font-bold text-[var(--text-color)] mt-0.5">{repoData.open_issues_count?.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Growth Chart */}
      <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-[15px] font-bold text-[var(--text-color)]">{t('repoDetail.growthTrajectory')}</h3>
              <button
                onClick={() => {
                  const embedUrl = `${window.location.origin}/embed/${owner}/${name}?theme=${document.documentElement.classList.contains('dark') ? 'dark' : 'light'}`;
                  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="300" style="border: 1px solid var(--border-color); border-radius: 8px;" allowfullscreen></iframe>`;
                  navigator.clipboard.writeText(iframeCode);
                  setEmbedCopied(true);
                  setTimeout(() => setEmbedCopied(false), 2000);
                }}
                className={`text-[10px] font-bold border border-[var(--border-color)] px-2.5 py-1 rounded bg-[var(--badge-bg)] inline-flex items-center gap-1 transition-all cursor-pointer ${
                  embedCopied ? 'text-emerald-500 border-emerald-500/30' : 'text-[var(--meta-text)] hover:text-[var(--text-color)]'
                }`}
                title={t('repoDetail.embedChartTitle')}
              >
                <Code className="size-3" />
                {embedCopied ? t('repoDetail.embedCopied') : t('repoDetail.copyEmbedCode')}
              </button>
            </div>
            <p className="text-xs text-[var(--meta-text)]">{t('repoDetail.chartDesc')}</p>
          </div>
          {/* Legend indicator */}
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1"><span className="size-2 bg-[var(--text-color)] rounded-full" /> {t('repoDetail.chartStars')}</span>
            <span className="flex items-center gap-1"><span className="size-2 bg-[var(--meta-text)] rounded-full" /> {t('repoDetail.chartForks')}</span>
            <span className="flex items-center gap-1"><span className="size-2 bg-blue-500 rounded-full" /> {t('repoDetail.chartVelocity')}</span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--meta-text)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="var(--meta-text)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-color)', fontSize: '11px' }} 
                itemStyle={{ color: 'var(--meta-text)' }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '4px' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="stars" stroke="var(--text-color)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--text-color)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line yAxisId="left" type="monotone" dataKey="forks" stroke="var(--meta-text)" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2, fill: 'var(--meta-text)', strokeWidth: 0 }} />
              <Line yAxisId="right" type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Description & Repository Details */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* Core parameters & README */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <h3 className="text-[15px] font-bold text-[var(--text-color)]">{t('repoDetail.aboutRepository')}</h3>
            <p className="text-sm leading-relaxed text-[var(--meta-text)]">
              {repoData.description || t('repo.noDescription')}
            </p>
          </div>

          {/* Tabs Selector */}
          <div className="flex gap-2 border-b border-[var(--border-color)] pb-px pt-2">
            <button
              onClick={() => setActiveTab('readme')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'readme'
                  ? 'border-[var(--text-color)] text-[var(--text-color)]'
                  : 'border-transparent text-[var(--meta-text)] hover:text-[var(--text-color)]'
              }`}
            >
              {t('repoDetail.readmeTab')}
            </button>
            <button
              onClick={() => {
                setActiveTab('code');
                if (contents.length === 0) {
                  fetchRepoContents('');
                }
              }}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'border-[var(--text-color)] text-[var(--text-color)]'
                  : 'border-transparent text-[var(--meta-text)] hover:text-[var(--text-color)]'
              }`}
            >
              {t('repoDetail.sourceExplorer')}
            </button>
          </div>

          {activeTab === 'readme' ? (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {/* Sticky TOC Sidebar */}
                {toc.length > 0 && (
                  <div className="md:col-span-1 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto hidden md:block border-r border-[var(--border-color)] pr-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('repoDetail.tableOfContents')}</h4>
                    <ul className="space-y-1.5 text-xs">
                      {toc.map((item) => (
                        <li 
                          key={item.id} 
                          style={{ paddingLeft: `${(item.level - 2) * 8}px` }}
                        >
                          <a 
                            href={`#${item.id}`} 
                            className="block py-0.5 text-[var(--meta-text)] hover:text-[var(--text-color)] transition-colors truncate"
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* README Content Panel */}
                <div className={toc.length > 0 ? "md:col-span-3 w-full" : "md:col-span-4 w-full"}>
                  {readmeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--text-color)]" />
                    </div>
                  ) : (
                    <div 
                      className="readme-container prose prose-zinc dark:prose-invert max-w-none text-sm text-[var(--text-color)] space-y-4 overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: readmeContent }} 
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {/* File list side */}
                <div className="md:col-span-1 border border-[var(--border-color)] rounded-lg bg-[var(--card-bg)] overflow-hidden">
                  <div className="p-3 bg-[var(--badge-bg)] border-b border-[var(--border-color)] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-color)]">{t('repoDetail.repositoryFiles')}</span>
                  </div>
                  
                  {/* Breadcrumbs */}
                  <div className="p-2 border-b border-[var(--border-color)] text-[10px] font-mono text-[var(--meta-text)] truncate flex flex-wrap gap-1 items-center bg-[var(--badge-bg)]/20">
                    <button onClick={() => fetchRepoContents('')} className="hover:underline text-[var(--text-color)] font-bold cursor-pointer">{t('repoDetail.root')}</button>
                    {currentPath.split('/').filter(Boolean).map((part, index, arr) => {
                      const pathSoFar = arr.slice(0, index + 1).join('/');
                      return (
                        <React.Fragment key={index}>
                          <span>/</span>
                          <button onClick={() => fetchRepoContents(pathSoFar)} className="hover:underline text-[var(--text-color)] font-bold cursor-pointer">{part}</button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* List items */}
                  {contentsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--text-color)]" />
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-color)] max-h-[400px] overflow-y-auto">
                      {currentPath && (
                        <button
                          onClick={() => {
                            const parts = currentPath.split('/');
                            parts.pop();
                            fetchRepoContents(parts.join('/'));
                          }}
                          className="w-full text-left p-2.5 text-xs text-[var(--meta-text)] hover:bg-[var(--badge-bg)] font-bold block cursor-pointer"
                        >
                          {t('repoDetail.goBack')}
                        </button>
                      )}
                      {contents.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => {
                            if (item.type === 'dir') {
                              fetchRepoContents(item.path);
                            } else {
                              fetchSingleFileContent(item);
                            }
                          }}
                          className={`w-full text-left p-2.5 text-xs flex items-center gap-2 hover:bg-[var(--badge-bg)] transition-colors cursor-pointer ${
                            selectedFile?.path === item.path ? 'bg-[var(--badge-bg)] font-semibold' : ''
                          }`}
                        >
                          {item.type === 'dir' ? (
                            <Folder className="size-4 text-blue-500 shrink-0" />
                          ) : (
                            getFileIcon(item.name)
                          )}
                          <span className="truncate text-[var(--text-color)]">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* File preview side */}
                <div className="md:col-span-3 border border-[var(--border-color)] rounded-lg bg-[var(--card-bg)] overflow-hidden h-[465px] flex flex-col justify-between">
                  <div className="p-3 bg-[var(--badge-bg)] border-b border-[var(--border-color)] text-xs font-mono text-[var(--text-color)] flex justify-between items-center truncate">
                    <span>{selectedFile ? selectedFile.name : t('repoDetail.selectFile')}</span>
                    {selectedFile && (
                      <span className="text-[10px] text-[var(--meta-text)]">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    )}
                  </div>
                  
                  <div className="overflow-hidden flex-1 font-mono text-xs bg-zinc-950 text-zinc-300">
                    {fileLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
                      </div>
                    ) : selectedFile ? (
                      isImageFile(selectedFile.name) ? (
                        <div className="flex items-center justify-center h-full bg-zinc-950 p-6 overflow-auto">
                          <img 
                            src={selectedFile.download_url} 
                            alt={selectedFile.name}
                            className="max-h-full max-w-full object-contain rounded-md border border-zinc-800 shadow-lg bg-zinc-900/50"
                          />
                        </div>
                      ) : (
                        <Editor
                          height="100%"
                          language={getFileLanguage(selectedFile.name)}
                          value={fileContent}
                          theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 12,
                            lineHeight: 18,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            wordWrap: 'on'
                          }}
                          loading={
                            <div className="flex items-center justify-center h-full text-zinc-400">
                              <span className="animate-pulse">{t('repoDetail.loadingCodeViewer')}</span>
                            </div>
                          }
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                        <Code className="size-8 opacity-40" />
                        <span>{t('repoDetail.chooseFile')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Metadata columns */}
        <div className="space-y-4">
          <Card className="bg-[var(--badge-bg)] border-[var(--border-color)]">
            <CardContent className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--meta-text)]">{t('repoDetail.timeline')}</h4>
              
              <div className="flex items-start gap-3">
                <Calendar className="size-4.5 text-[var(--meta-text)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--meta-text)] block">{t('repoDetail.createdOn')}</span>
                  <span className="text-xs text-[var(--text-color)] font-semibold">{new Date(repoData.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <GitCommit className="size-4.5 text-[var(--meta-text)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--meta-text)] block">{t('repoDetail.lastActive')}</span>
                  <span className="text-xs text-[var(--text-color)] font-semibold">{new Date(repoData.pushed_at).toLocaleDateString()}</span>
                </div>
              </div>

              {repoData.homepage && (
                <div className="flex items-start gap-3 pt-2 border-t border-[var(--border-color)]">
                  <Globe className="size-4.5 text-[var(--meta-text)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[var(--meta-text)] block">{t('repoDetail.website')}</span>
                    <a 
                      href={repoData.homepage} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-[var(--text-color)] font-bold hover:underline break-all"
                    >
                      {repoData.homepage}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Contributors Leaderboard */}
          <Card className="bg-[var(--card-bg)] border-[var(--border-color)]">
            <CardContent className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)] flex items-center justify-between">
                <span>{t('repoDetail.topContributors')}</span>
                <span className="text-[10px] text-[var(--meta-text)] font-normal">{t('repoDetail.leaderboard')}</span>
              </h4>
              
              {contributorsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--text-color)]" />
                </div>
              ) : contributors.length > 0 ? (
                <div className="space-y-3">
                  {contributors.map((c, index) => (
                    <div key={c.id || c.login} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-[var(--meta-text)] min-w-[12px]">{index + 1}</span>
                        {c.avatar_url && (
                          <img 
                            src={c.avatar_url} 
                            alt={c.login} 
                            className="size-6 rounded-full border border-[var(--border-color)] bg-[var(--badge-bg)] shrink-0"
                          />
                        )}
                        <a 
                          href={c.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-semibold text-[var(--text-color)] hover:underline truncate"
                        >
                          {c.login}
                        </a>
                      </div>
                      <span className="font-bold text-[var(--meta-text)] shrink-0 bg-[var(--badge-bg)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[10px]">
                        {c.contributions} {t('repoDetail.commits')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--meta-text)] italic">{t('repoDetail.noContributors')}</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
