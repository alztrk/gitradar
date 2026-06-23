import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function EmbedChart() {
  const { owner, name } = useParams();
  const [searchParams] = useSearchParams();
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read theme from URL query param, default to light
  const embedTheme = searchParams.get('theme') || 'light';

  useEffect(() => {
    // Add/remove dark class specifically for embed styling compatibility
    const root = window.document.documentElement;
    if (embedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [embedTheme]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}`);
        if (!response.ok) {
          throw new Error('Repository details could not be retrieved.');
        }
        const data = await response.json();
        setRepoData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [owner, name]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-color)] text-[var(--text-color)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--text-color)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center bg-[var(--bg-color)] text-xs text-red-500 border border-red-500/20">
        Error: {error}
      </div>
    );
  }

  const generateChartData = () => {
    if (!repoData) return [];
    const createdDate = new Date(repoData.created_at);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalStars = repoData.stargazers_count;
    const totalForks = repoData.forks_count;
    const intervals = 8;
    const chartData = [];

    if (diffDays <= 1) {
      return [
        { date: 'Created', stars: 0, forks: 0, velocity: 0 },
        { date: 'Now', stars: totalStars, forks: totalForks, velocity: totalStars }
      ];
    }

    const isRecent = diffDays <= 30;
    const timeStep = diffTime / intervals;

    for (let i = 0; i <= intervals; i++) {
      const isLastStep = i === intervals;
      const stepDate = isLastStep ? currentDate : new Date(createdDate.getTime() + (i * timeStep));
      
      let formattedDate = stepDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!isRecent) {
        formattedDate = stepDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      }

      const factor = i / intervals;
      const starsAtStep = isLastStep ? totalStars : Math.round(totalStars * factor);
      const forksAtStep = isLastStep ? totalForks : Math.round(totalForks * factor);
      const stepDiff = Math.max(1, Math.ceil((stepDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      const velocityAtStep = parseFloat((starsAtStep / stepDiff).toFixed(1));

      chartData.push({
        date: isLastStep ? 'Now' : formattedDate,
        stars: starsAtStep,
        forks: forksAtStep,
        velocity: velocityAtStep
      });
    }
    return chartData;
  };

  const chartData = generateChartData();

  return (
    <div className="h-screen w-screen bg-[var(--bg-color)] p-4 flex flex-col justify-between font-sans text-[var(--text-color)] overflow-hidden">
      <div className="flex justify-between items-center text-xs border-b border-[var(--border-color)] pb-2 mb-2">
        <span className="font-bold">{owner} / {name}</span>
        <span className="text-[10px] text-[var(--meta-text)]">⚡ {repoData.stargazers_count?.toLocaleString()} Stars</span>
      </div>
      <div className="flex-1 w-full h-full relative min-h-0">
        <ResponsiveContainer width="100%" height="95%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--meta-text)" fontSize={8} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="var(--meta-text)" fontSize={8} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={8} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-color)', fontSize: '9px' }}
              itemStyle={{ padding: 0 }}
            />
            <Line yAxisId="left" type="monotone" dataKey="stars" stroke="var(--text-color)" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="forks" stroke="var(--meta-text)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between items-center text-[8px] text-[var(--meta-text)] pt-1 border-t border-[var(--border-color)]">
        <span>GitRadar Interactive Chart</span>
        <a href={`https://github.com/${owner}/${name}`} target="_blank" rel="noopener noreferrer" className="hover:underline">View Repository</a>
      </div>
    </div>
  );
}
