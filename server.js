const express = require('express');
const cors = require('cors');
const path = require('path');
const newsService = require('./services/newsService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await newsService.getAllArticles();
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

app.get('/api/articles/refresh', async (req, res) => {
  try {
    await newsService.refreshArticles();
    const articles = await newsService.getAllArticles();
    res.json(articles);
  } catch (error) {
    console.error('Error refreshing articles:', error);
    res.status(500).json({ error: 'Failed to refresh articles' });
  }
});

// Serve the blog
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TechBlog running on http://localhost:${PORT}`);
  newsService.startAutoRefresh();
});