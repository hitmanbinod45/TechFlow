const newsService = require('../services/newsService');

// Create a single instance
const service = new (require('../services/newsService'))();

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await service.refreshArticles();
    const articles = await service.getAllArticles();
    res.status(200).json(articles);
  } catch (error) {
    console.error('Error refreshing articles:', error);
    res.status(500).json({ error: 'Failed to refresh articles' });
  }
};