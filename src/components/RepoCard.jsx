import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Star, GitFork, ArrowUpRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RepoCard({ repo, isBookmarked, onToggleBookmark }) {
  const { id, name, owner, description, stars, forks, language, languageColor, velocity_score } = repo;

  const calculateQuickHealth = () => {
    const forkRatio = forks / (stars + 1);
    let score = 40;

    // Velocity: star kazanma hizi (max +25)
    if (velocity_score > 15) score += 25;
    else if (velocity_score > 8) score += 20;
    else if (velocity_score > 4) score += 15;
    else if (velocity_score > 1.5) score += 10;
    else if (velocity_score > 0.3) score += 5;

    // Fork/Star orani: topluluk katilimi (max +20)
    if (forkRatio >= 0.15) score += 20;
    else if (forkRatio >= 0.08) score += 14;
    else if (forkRatio >= 0.03) score += 8;
    else if (forkRatio >= 0.01) score += 4;

    // Star sayisi: projenin oturmuslugu (max +15)
    if (stars >= 5000) score += 15;
    else if (stars >= 1000) score += 12;
    else if (stars >= 100) score += 8;
    else if (stars >= 10) score += 4;

    // Star basi fork: gercek katilim (max +10, ceza -5)
    const forksPerStar = stars > 0 ? forks / stars : 0;
    if (forksPerStar >= 0.3) score += 10;
    else if (forksPerStar >= 0.1) score += 5;
    else if (stars > 100 && forksPerStar < 0.02) score -= 5;

    // Dil cesitliligi bonusu (language varsa +5)
    if (language) score += 5;

    score = Math.max(0, Math.min(100, score));

    let grade = 'F';
    let color = 'text-rose-700 dark:text-rose-400 border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10';
    if (score >= 85) {
      grade = 'A';
      color = 'text-emerald-700 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10';
    } else if (score >= 70) {
      grade = 'B';
      color = 'text-blue-700 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10';
    } else if (score >= 55) {
      grade = 'C';
      color = 'text-amber-700 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10';
    } else if (score >= 40) {
      grade = 'D';
      color = 'text-orange-700 dark:text-orange-400 border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10';
    }
    return { grade, color };
  };

  const health = calculateQuickHealth();

  return (
    <Card className="rounded-xl border-[var(--border-color)] hover:border-[var(--hover-border)] bg-[var(--card-bg)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative">
      
      {/* Bookmark Action Button */}
      <button
        onClick={() => onToggleBookmark(id)}
        className="absolute top-4.5 right-4 text-[var(--meta-text)] hover:text-[var(--text-color)] transition-colors z-10 cursor-pointer"
        title={isBookmarked ? "Remove bookmark" : "Bookmark repository"}
      >
        {isBookmarked ? (
          <BookmarkCheck className="size-4.5 text-[var(--text-color)] fill-[var(--text-color)]/10" />
        ) : (
          <Bookmark className="size-4.5" />
        )}
      </button>

      <CardContent className="p-5">
        <div className="flex flex-col h-full justify-between gap-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5 pr-6">
                {/* Repository / Org Avatar Logo */}
                {owner?.avatar_url ? (
                  <img 
                    src={owner.avatar_url} 
                    alt={`${owner.login} avatar`}
                    className="size-5 rounded-md object-cover border border-[var(--border-color)] bg-[var(--badge-bg)] shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="size-5 rounded-md border border-[var(--border-color)] bg-[var(--badge-bg)] shrink-0 mt-0.5" />
                )}
                
                <Link 
                  to={`/repo/${owner?.login}/${name}`}
                  className="group flex min-w-0 items-center gap-1 text-[var(--text-color)] hover:opacity-80"
                >
                  <h3 className="truncate text-[15px] font-semibold group-hover:underline text-[var(--text-color)]">
                    {owner?.login} / <span className="font-bold">{name}</span>
                  </h3>
                  <ArrowUpRight className="size-3.5 shrink-0 text-[var(--meta-text)]" />
                </Link>
              </div>
            </div>

            {/* Language, Velocity & Health Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {language && (
                <Badge variant="subtle" className="shrink-0 flex items-center gap-1.5 border-[var(--border-color)] bg-[var(--badge-bg)] text-[var(--text-color)]">
                  <span 
                    className="size-1.5 rounded-full" 
                    style={{ backgroundColor: languageColor || '#71717a' }}
                  />
                  {language}
                </Badge>
              )}

              {/* Velocity Score Badge */}
              {velocity_score !== undefined && (
                <Badge variant="default" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold border-[var(--border-color)]">
                  ⚡ {velocity_score}/day
                </Badge>
              )}

              {/* Health Score Badge */}
              <Badge className={`border text-[10px] font-bold ${health.color}`}>
                Health: {health.grade}
              </Badge>
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-[var(--meta-text)] leading-normal">
              {description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 text-xs text-[var(--meta-text)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-medium">
                <Star className="size-3.5 text-[var(--meta-text)]" />
                {stars?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <GitFork className="size-3.5 text-[var(--meta-text)]" />
                {forks?.toLocaleString() || 0}
              </span>
            </div>
            
            <Link
              to={`/repo/${owner?.login}/${name}`}
              className="font-medium text-[var(--text-color)] hover:underline"
            >
              Analyze Repo
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
