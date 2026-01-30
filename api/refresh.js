const axios = require('axios');
const cheerio = require('cheerio');

// Import the NewsService class directly
class NewsService {
  constructor() {
    this.articles = [];
    this.lastUpdate = null;
  }

  async fetchHackerNews() {
    try {
      const topStoriesResponse = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
      const topStoryIds = topStoriesResponse.data.slice(0, 30);
      
      const articles = [];
      
      for (const id of topStoryIds) {
        if (articles.length >= 8) break;
        
        try {
          const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const story = storyResponse.data;
          
          if (story && story.url && story.title && story.score > 30 && story.title.trim()) {
            const techKeywords = ['tech', 'software', 'programming', 'ai', 'startup', 'mobile', 'app', 'web', 'code', 'developer', 'google', 'apple', 'microsoft', 'amazon', 'facebook', 'meta', 'twitter', 'github', 'javascript', 'python', 'react', 'node', 'api', 'database', 'cloud'];
            const isTechRelated = techKeywords.some(keyword => 
              story.title.toLowerCase().includes(keyword) || 
              (story.url && story.url.toLowerCase().includes(keyword))
            );
            
            if (isTechRelated) {
              articles.push({
                id: story.id,
                title: story.title.trim(),
                url: story.url,
                excerpt: `${story.score} points • ${story.descendants || 0} comments • Trending on Hacker News`,
                source: 'Hacker News',
                category: 'Tech Discussion',
                timestamp: new Date(story.time * 1000).toISOString(),
                score: story.score,
                comments: story.descendants || 0,
                image: `https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format`
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching story ${id}:`, error.message);
        }
      }
      
      return articles;
    } catch (error) {
      console.error('Error fetching Hacker News:', error);
      return [];
    }
  }

  async fetchDevTo() {
    try {
      const response = await axios.get('https://dev.to/api/articles?tag=javascript&top=7');
      return response.data.slice(0, 6).map(article => ({
        id: `devto-${article.id}`,
        title: article.title,
        url: article.url,
        excerpt: article.description || 'Read more on Dev.to',
        source: 'Dev.to',
        category: 'Development',
        timestamp: article.published_at,
        image: article.cover_image || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=160&fit=crop&auto=format`
      }));
    } catch (error) {
      console.error('Error fetching Dev.to:', error);
      return [];
    }
  }

  async getAllArticles() {
    try {
      const [hackerNews, devTo] = await Promise.all([
        this.fetchHackerNews(),
        this.fetchDevTo()
      ]);
      
      const allArticles = [...hackerNews, ...devTo];
      
      // Sort by timestamp (newest first)
      allArticles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      this.articles = allArticles;
      this.lastUpdate = new Date();
      
      return allArticles;
    } catch (error) {
      console.error('Error getting all articles:', error);
      return [];
    }
  }

  async refreshArticles() {
    return this.getAllArticles();
  }
}

// Create a single instance
const service = new NewsService();

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
    res.status(500).json({ error: 'Failed to refresh articles', details: error.message });
  }
};