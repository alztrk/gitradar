import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Main radar trend endpoint
app.get('/api/trends', async (req, res) => {
  try {
    const { lang, time, sort, stars } = req.query;
    let queryParts = [];

    // Time constraints (1, 7, 30 days)
    const days = parseInt(time || '7', 10);
    if (days > 0) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      const dateString = date.toISOString().split('T')[0];
      queryParts.push(`created:>${dateString}`);
    }

    // Language constraint
    if (lang) {
      queryParts.push(`language:${lang}`);
    }

    // Stars threshold
    if (stars) {
      queryParts.push(`stars:>=${stars}`);
    } else {
      queryParts.push('stars:>=0');
    }

    const q = queryParts.join(' ');
    const activeSort = sort || 'stars';
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${activeSort}&order=desc&per_page=12`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GitRadar-API'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API rate limit or invalid search request.' });
    }

    const data = await response.json();
    
    // Process items, calculate velocity scores
    const items = data.items.map(item => {
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
        html_url: item.html_url,
        created_at: item.created_at,
        velocity_score: velocity
      };
    });

    res.json({
      total_results: data.total_count,
      results: items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`GitRadar API server running on http://localhost:${PORT}`);
});
