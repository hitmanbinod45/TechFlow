const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

class NewsService {
  constructor() {
    this.articles = [];
    this.lastUpdate = null;
  }

  async fetchHackerNews() {
    try {
      // Get top stories from Hacker News
      const topStoriesResponse = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
      const topStoryIds = topStoriesResponse.data.slice(0, 30); // Get more to filter better
      
      const articles = [];
      
      for (const id of topStoryIds) {
        if (articles.length >= 8) break; // Stop when we have enough
        
        try {
          const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const story = storyResponse.data;
          
          if (story && story.url && story.title && story.score > 30 && story.title.trim()) {
            // Filter for tech-related content
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
                image: `https://images.unsplash.com/photo-${this.getHackerNewsImageId(articles.length)}?w=400&h=160&fit=crop&auto=format`
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching story ${id}:`, error.message);
        }
      }
      
      console.log(`Hacker News: Fetched ${articles.length} valid articles`);
      return articles;
    } catch (error) {
      console.error('Error fetching Hacker News:', error.message);
      return this.getFallbackArticles('Hacker News');
    }
  }

  getHackerNewsImageId(index) {
    const imageIds = [
      '1611224923853-80b023f02d71', // Tech discussion
      '1517077304055-6e89abbf09b0', // Web development
      '1551288049-7f46c0db25d9', // Programming
      '1504639725590-c3b570f17899', // Startup
      '1460925895917-afdab827c52f', // Business tech
      '1519389950473-47ba0277781c', // Innovation
      '1581091226825-c6a69373f1f4', // Digital
      '1563206767-f8fcfa3e742c'  // Technology
    ];
    return imageIds[index % imageIds.length];
  }

  async fetchDevTo() {
    try {
      const response = await axios.get('https://dev.to/api/articles?top=7&per_page=10', {
        headers: { 'User-Agent': 'TechFlow/1.0' }
      });
      
      const articles = response.data
        .filter(article => article.title && article.description && article.url)
        .slice(0, 8)
        .map(article => ({
          id: article.id,
          title: article.title.trim(),
          url: article.url,
          excerpt: (article.description || article.title).trim().substring(0, 150) + '...',
          source: 'Dev.to',
          category: 'Development',
          timestamp: new Date(article.published_at).toISOString(),
          author: article.user.name,
          tags: article.tag_list,
          image: article.cover_image || article.social_image
        }));
      
      console.log(`Dev.to: Fetched ${articles.length} valid articles`);
      return articles;
    } catch (error) {
      console.error('Error fetching Dev.to:', error.message);
      return this.getFallbackArticles('Dev.to');
    }
  }

  async fetchGitHubTrending() {
    try {
      const response = await axios.get('https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=10', {
        headers: { 'User-Agent': 'TechFlow/1.0' }
      });
      
      const articles = response.data.items.slice(0, 6).map((repo, index) => ({
        id: repo.id,
        title: `${repo.name}: ${repo.description || 'GitHub Repository'}`,
        url: repo.html_url,
        excerpt: `⭐ ${repo.stargazers_count} stars • ${repo.language || 'Multiple languages'} • ${repo.forks_count} forks`,
        source: 'GitHub',
        category: 'Open Source',
        timestamp: new Date(repo.created_at).toISOString(),
        author: repo.owner.login,
        language: repo.language,
        stars: repo.stargazers_count,
        // Use different placeholder images for each repo
        image: `https://images.unsplash.com/photo-${this.getGitHubImageId(index)}?w=400&h=160&fit=crop&auto=format`
      }));
      
      return articles;
    } catch (error) {
      console.error('Error fetching GitHub:', error.message);
      return this.getFallbackArticles('GitHub');
    }
  }

  getGitHubImageId(index) {
    const imageIds = [
      '1618477388954-7852f32655ec', // Code/programming
      '1461749280684-dccba630e2f6', // Code editor
      '1555949963-aa79dcee981c', // Tech/AI
      '1518709268805-4e9042af2176', // Technology
      '1627398242454-45a1465c2479', // Web development
      '1507003211169-0a1dd7228f2d'  // CSS/Design
    ];
    return imageIds[index % imageIds.length];
  }

  async fetchProductHunt() {
    try {
      // Using a simple RSS-to-JSON service for Product Hunt
      const response = await axios.get('https://www.producthunt.com/feed', {
        headers: { 'User-Agent': 'TechFlow/1.0' }
      });
      
      const $ = cheerio.load(response.data, { xmlMode: true });
      const articles = [];
      
      $('item').slice(0, 6).each((i, element) => {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        const pubDate = $(element).find('pubDate').text().trim();
        
        if (title && link) {
          articles.push({
            id: `ph-${i}`,
            title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
            url: link,
            excerpt: this.cleanText(description).substring(0, 150) + '...',
            source: 'Product Hunt',
            category: 'Products',
            timestamp: new Date(pubDate).toISOString(),
            image: `https://images.unsplash.com/photo-${this.getProductHuntImageId(i)}?w=400&h=160&fit=crop&auto=format`
          });
        }
      });
      
      return articles;
    } catch (error) {
      console.error('Error fetching Product Hunt:', error.message);
      return this.getFallbackArticles('Product Hunt');
    }
  }

  getProductHuntImageId(index) {
    const imageIds = [
      '1555949963-aa79dcee981c', // AI/Products
      '1551288049-7f46c0db25d9', // Tech products
      '1460925895917-afdab827c52f', // Business
      '1519389950473-47ba0277781c', // Innovation
      '1581091226825-c6a69373f1f4', // Digital products
      '1563206767-f8fcfa3e742c'  // Technology
    ];
    return imageIds[index % imageIds.length];
  }

  async fetchTechCrunch() {
    try {
      // Try multiple TechCrunch RSS feeds
      const feeds = [
        'https://techcrunch.com/feed/',
        'https://feeds.feedburner.com/TechCrunch'
      ];
      
      for (const feedUrl of feeds) {
        try {
          const response = await axios.get(feedUrl, {
            headers: { 'User-Agent': 'TechFlow/1.0' },
            timeout: 10000
          });
          
          const $ = cheerio.load(response.data, { xmlMode: true });
          const articles = [];

          $('item').slice(0, 10).each((i, element) => {
            const title = $(element).find('title').text().trim();
            const link = $(element).find('link').text().trim();
            const description = $(element).find('description').text().trim();
            const pubDate = $(element).find('pubDate').text().trim();
            
            // Better content extraction
            let cleanDescription = this.cleanText(description);
            if (cleanDescription.length < 50) {
              // Try content:encoded for better description
              const content = $(element).find('content\\:encoded').text();
              cleanDescription = this.cleanText(content).substring(0, 200);
            }
            
            // Extract image with multiple methods
            let image = null;
            const content = $(element).find('content\\:encoded').text();
            const imgMatches = [
              content.match(/<img[^>]+src="([^">]+)"/),
              description.match(/<img[^>]+src="([^">]+)"/),
              content.match(/https:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/i)
            ];
            
            for (const match of imgMatches) {
              if (match && match[1] && match[1].startsWith('http')) {
                image = match[1];
                break;
              }
            }

            if (title && title.trim().length > 10 && link && cleanDescription.length > 20) {
              articles.push({
                id: `tc-${i}`,
                title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                url: link,
                excerpt: cleanDescription.substring(0, 200) + '...',
                source: 'TechCrunch',
                category: this.categorizeArticle(title, 'Tech News'),
                timestamp: new Date(pubDate).toISOString(),
                image: image || `https://images.unsplash.com/photo-${this.getTechCrunchImageId(i)}?w=400&h=160&fit=crop&auto=format`
              });
            }
          });

          if (articles.length > 0) {
            console.log(`TechCrunch: Successfully fetched ${articles.length} articles from ${feedUrl}`);
            return articles.slice(0, 8);
          }
        } catch (feedError) {
          console.log(`TechCrunch feed ${feedUrl} failed:`, feedError.message);
          continue;
        }
      }
      
      console.log('All TechCrunch feeds failed, using fallback');
      return this.getFallbackArticles('TechCrunch');
    } catch (error) {
      console.error('Error fetching TechCrunch:', error.message);
      return this.getFallbackArticles('TechCrunch');
    }
  }

  async fetchTheVerge() {
    try {
      const response = await axios.get('https://www.theverge.com/rss/index.xml', {
        headers: { 'User-Agent': 'TechFlow/1.0' }
      });
      
      const $ = cheerio.load(response.data, { xmlMode: true });
      const articles = [];

      $('item').slice(0, 8).each((i, element) => {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        const pubDate = $(element).find('pubDate').text().trim();
        
        // Extract image from description with better parsing
        let image = null;
        const imgMatches = [
          description.match(/<img[^>]+src="([^">]+)"/),
          description.match(/https:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/i)
        ];
        
        for (const match of imgMatches) {
          if (match && match[1]) {
            image = match[1];
            break;
          }
        }

        if (title && link) {
          articles.push({
            id: `verge-${i}`,
            title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
            url: link,
            excerpt: this.cleanText(description).substring(0, 200) + '...',
            source: 'The Verge',
            category: this.categorizeArticle(title, 'Tech News'),
            timestamp: new Date(pubDate).toISOString(),
            image
          });
        }
      });

      return articles;
    } catch (error) {
      console.error('Error fetching The Verge:', error.message);
      return this.getFallbackArticles('The Verge');
    }
  }

  getTechCrunchImageId(index) {
    const imageIds = [
      '1611224923853-80b023f02d71', // Tech discussion
      '1592750475338-74b7b21085ab', // iPhone/smartphone
      '1610945265064-0e34e5519bbf', // Samsung/Android
      '1607252650355-f7fd0460ccdb', // Mobile OS
      '1560472354-b33ff0c44a43', // Tech reviews
      '1518709268805-4e9042af2176', // Technology
      '1556656793-08538906a9f8', // Tesla/automotive tech
      '1593508512255-86ab42a8e620', // VR/AR tech
      '1555949963-aa79dcee981c', // AI/ML
      '1581091226825-c6a69373f1f4'  // Digital tech
    ];
    return imageIds[index % imageIds.length];
  }

  categorizeArticle(title, defaultCategory) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('iphone') || titleLower.includes('android') || 
        titleLower.includes('smartphone') || titleLower.includes('mobile') ||
        titleLower.includes('pixel') || titleLower.includes('galaxy')) {
      return 'Smartphones';
    }
    
    if (titleLower.includes('review') || titleLower.includes('hands-on') ||
        titleLower.includes('tested') || titleLower.includes('vs')) {
      return 'Reviews';
    }
    
    return defaultCategory;
  }

  getFallbackArticles(source) {
    const fallbackData = {
      'Hacker News': [
        {
          id: 'hn-1',
          title: 'Show HN: I built a minimalist tech news aggregator',
          url: 'https://news.ycombinator.com',
          excerpt: '234 points • 89 comments',
          source: 'Hacker News',
          category: 'Tech Discussion',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop'
        },
        {
          id: 'hn-2',
          title: 'The future of web development in 2026',
          url: 'https://news.ycombinator.com',
          excerpt: '156 points • 67 comments',
          source: 'Hacker News',
          category: 'Tech Discussion',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=200&fit=crop'
        }
      ],
      'Dev.to': [
        {
          id: 'dev-1',
          title: 'Building Modern Web Apps with Vanilla JavaScript',
          url: 'https://dev.to',
          excerpt: 'Learn how to create powerful web applications without heavy frameworks using modern JavaScript features and best practices.',
          source: 'Dev.to',
          category: 'Development',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=200&fit=crop'
        },
        {
          id: 'dev-2',
          title: 'CSS Grid vs Flexbox: When to Use Which',
          url: 'https://dev.to',
          excerpt: 'A comprehensive guide to understanding the differences between CSS Grid and Flexbox and when to use each layout method.',
          source: 'Dev.to',
          category: 'Development',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop'
        }
      ],
      'GitHub': [
        {
          id: 'gh-1',
          title: 'awesome-ai-tools: Curated list of AI development tools',
          url: 'https://github.com',
          excerpt: '⭐ 15,234 stars • JavaScript • 2,456 forks',
          source: 'GitHub',
          category: 'Open Source',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=200&fit=crop'
        }
      ],
      'Product Hunt': [
        {
          id: 'ph-1',
          title: 'AI Code Assistant - Your intelligent coding companion',
          url: 'https://producthunt.com',
          excerpt: 'Revolutionary AI-powered code assistant that helps developers write better code faster with intelligent suggestions and automated refactoring.',
          source: 'Product Hunt',
          category: 'Products',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=200&fit=crop'
        }
      ],
      'TechCrunch': [
        {
          id: 'tc-1',
          title: 'iPhone 16 Pro Max Review: Revolutionary Camera Technology',
          url: 'https://techcrunch.com',
          excerpt: 'Apple\'s latest flagship brings unprecedented camera improvements with AI-powered photography, faster A18 Pro chip, and enhanced battery life.',
          source: 'TechCrunch',
          category: 'Smartphones',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=200&fit=crop'
        },
        {
          id: 'tc-2',
          title: 'Samsung Galaxy S25 Ultra: 200MP Camera Leaked Specs',
          url: 'https://techcrunch.com',
          excerpt: 'New leaks reveal Samsung\'s upcoming flagship will feature a revolutionary 200MP main camera, improved S Pen functionality, and faster charging.',
          source: 'TechCrunch',
          category: 'Smartphones',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=200&fit=crop'
        }
      ],
      'The Verge': [
        {
          id: 'verge-1',
          title: 'Google Pixel 9 Pro: AI Photography Reaches New Heights',
          url: 'https://theverge.com',
          excerpt: 'Google\'s latest Pixel smartphone showcases the future of computational photography with advanced AI features that make every shot perfect.',
          source: 'The Verge',
          category: 'Smartphones',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=200&fit=crop'
        },
        {
          id: 'verge-2',
          title: 'Android 15 Beta: Enhanced Privacy and AI Integration',
          url: 'https://theverge.com',
          excerpt: 'The latest Android beta brings significant privacy improvements, better battery optimization, and new AI-powered features for enhanced user experience.',
          source: 'The Verge',
          category: 'Mobile OS',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          image: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=200&fit=crop'
        }
      ]
    };

    return fallbackData[source] || [];
  }

  cleanText(text) {
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
  }

  async getAllArticles() {
    if (this.articles.length === 0 || this.shouldRefresh()) {
      await this.refreshArticles();
    }
    return this.articles;
  }

  async refreshArticles() {
    console.log('🔄 Refreshing articles...');
    const allArticles = [];

    const sources = [
      this.fetchHackerNews(),
      this.fetchDevTo(),
      this.fetchGitHubTrending(),
      this.fetchProductHunt(),
      this.fetchTechCrunch(),
      this.fetchTheVerge()
    ];

    const results = await Promise.allSettled(sources);
    
    results.forEach((result, index) => {
      const sourceName = ['Hacker News', 'Dev.to', 'GitHub', 'Product Hunt', 'TechCrunch', 'The Verge'][index];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${sourceName}: ${result.value.length} articles`);
        allArticles.push(...result.value);
      } else {
        console.error(`❌ ${sourceName} failed:`, result.reason);
        // Add fallback articles for failed sources
        allArticles.push(...this.getFallbackArticles(sourceName));
      }
    });

    // Sort by timestamp and remove duplicates
    this.articles = allArticles
      .filter(article => article && article.title && article.title.trim()) // Filter out empty articles
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .filter((article, index, self) => 
        index === self.findIndex(a => a.title === article.title)
      );

    this.lastUpdate = new Date();
    console.log(`✅ Total: ${this.articles.length} articles from ${results.length} sources`);
  }

  shouldRefresh() {
    if (!this.lastUpdate) return true;
    const oneHour = 60 * 60 * 1000;
    return Date.now() - this.lastUpdate.getTime() > oneHour;
  }

  startAutoRefresh() {
    // Refresh every hour
    cron.schedule('0 * * * *', () => {
      this.refreshArticles();
    });
    
    // Initial fetch
    this.refreshArticles();
  }
}

module.exports = new NewsService();