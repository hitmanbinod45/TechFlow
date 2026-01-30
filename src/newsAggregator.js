const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

class NewsAggregator {
  constructor() {
    this.newsCache = [];
    this.lastUpdate = null;
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN; // Add your Twitter API token
  }

  async fetchTechCrunch() {
    try {
      const response = await axios.get('https://techcrunch.com/feed/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
      });
      
      // Parse RSS feed
      const $ = cheerio.load(response.data, { xmlMode: true });
      const articles = [];

      $('item').slice(0, 8).each((i, element) => {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        const pubDate = $(element).find('pubDate').text().trim();
        
        // Extract image from content
        const content = $(element).find('content\\:encoded').text();
        const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
        const image = imgMatch ? imgMatch[1] : null;

        if (title && link) {
          articles.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
            link,
            excerpt: this.cleanText(description).substring(0, 200) + '...',
            image,
            source: 'TechCrunch',
            category: 'Tech News',
            timestamp: new Date(pubDate).toISOString()
          });
        }
      });

      return articles;
    } catch (error) {
      console.error('Error fetching TechCrunch:', error.message);
      return this.getFallbackArticles('TechCrunch');
    }
  }

  async fetchTheVerge() {
    try {
      const response = await axios.get('https://www.theverge.com/rss/index.xml', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
      });
      
      const $ = cheerio.load(response.data, { xmlMode: true });
      const articles = [];

      $('item').slice(0, 8).each((i, element) => {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        const pubDate = $(element).find('pubDate').text().trim();
        
        // Extract image from description
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        const image = imgMatch ? imgMatch[1] : null;

        if (title && link) {
          articles.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
            link,
            excerpt: this.cleanText(description).substring(0, 200) + '...',
            image,
            source: 'The Verge',
            category: 'Tech News',
            timestamp: new Date(pubDate).toISOString()
          });
        }
      });

      return articles;
    } catch (error) {
      console.error('Error fetching The Verge:', error.message);
      return this.getFallbackArticles('The Verge');
    }
  }

  async fetchTwitterTechNews() {
    if (!this.twitterBearerToken) {
      console.log('Twitter Bearer Token not provided, using fallback tweets');
      return this.getFallbackTweets();
    }

    try {
      // Twitter API v2 endpoint for tech-related tweets
      const query = '(smartphone OR iPhone OR Android OR tech OR mobile) -is:retweet lang:en';
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        headers: {
          'Authorization': `Bearer ${this.twitterBearerToken}`,
          'User-Agent': 'TechNewsPWA/1.0'
        },
        params: {
          query,
          max_results: 10,
          'tweet.fields': 'created_at,author_id,public_metrics',
          'user.fields': 'name,username,profile_image_url',
          'expansions': 'author_id'
        }
      });

      const tweets = [];
      const users = response.data.includes?.users || [];
      
      response.data.data?.forEach(tweet => {
        const author = users.find(user => user.id === tweet.author_id);
        if (author) {
          tweets.push({
            title: `@${author.username}: ${tweet.text.substring(0, 100)}...`,
            link: `https://twitter.com/${author.username}/status/${tweet.id}`,
            excerpt: tweet.text,
            image: author.profile_image_url,
            source: 'Twitter',
            category: 'Social Media',
            author: author.name,
            username: author.username,
            timestamp: tweet.created_at
          });
        }
      });

      return tweets;
    } catch (error) {
      console.error('Error fetching Twitter:', error.message);
      return this.getFallbackTweets();
    }
  }

  getFallbackTweets() {
    return [
      {
        title: '@elonmusk: The future of smartphones is here with neural interfaces',
        link: 'https://twitter.com/elonmusk',
        excerpt: 'The future of smartphones is here with neural interfaces. Direct brain-computer interaction will revolutionize how we communicate.',
        image: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg',
        source: 'Twitter',
        category: 'Social Media',
        author: 'Elon Musk',
        username: 'elonmusk',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        title: '@sundarpichai: Android 15 brings unprecedented AI capabilities',
        link: 'https://twitter.com/sundarpichai',
        excerpt: 'Android 15 brings unprecedented AI capabilities to your smartphone. Privacy-first AI that works entirely on-device.',
        image: 'https://pbs.twimg.com/profile_images/1375285353146327040/y6jeByyD_400x400.jpg',
        source: 'Twitter',
        category: 'Social Media',
        author: 'Sundar Pichai',
        username: 'sundarpichai',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  getFallbackArticles(source) {
    const fallbackData = {
      'TechCrunch': [
        {
          title: 'iPhone 16 Pro Max delivers groundbreaking camera technology',
          link: 'https://techcrunch.com',
          excerpt: 'Apple\'s latest flagship smartphone introduces revolutionary camera capabilities with AI-powered photography features that set new industry standards...',
          image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
          source: 'TechCrunch',
          category: 'Smartphones',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          title: 'Samsung Galaxy S25 Ultra leaked specifications reveal major upgrades',
          link: 'https://techcrunch.com',
          excerpt: 'New leaks suggest Samsung\'s upcoming flagship will feature a 200MP camera, improved S Pen functionality, and faster charging capabilities...',
          image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
          source: 'TechCrunch',
          category: 'Smartphones',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        }
      ],
      'The Verge': [
        {
          title: 'Google Pixel 9 Pro review: AI photography reaches new heights',
          link: 'https://theverge.com',
          excerpt: 'Google\'s latest Pixel smartphone showcases the future of computational photography with advanced AI features that make every shot perfect...',
          image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
          source: 'The Verge',
          category: 'Reviews',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          title: 'Android 15 beta introduces enhanced privacy controls',
          link: 'https://theverge.com',
          excerpt: 'The latest Android beta brings significant privacy improvements, better battery optimization, and new AI-powered features for enhanced user experience...',
          image: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400',
          source: 'The Verge',
          category: 'Software',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    return fallbackData[source] || [];
  }

  cleanText(text) {
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
  }

  async getLatestNews() {
    if (this.newsCache.length === 0 || this.shouldRefresh()) {
      await this.refreshNews();
    }
    return this.newsCache;
  }

  async refreshNews() {
    console.log('Refreshing news...');
    const allArticles = [];

    const sources = [
      this.fetchTechCrunch(),
      this.fetchTheVerge(),
      this.fetchTwitterTechNews()
    ];

    const results = await Promise.allSettled(sources);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    });

    // Sort by timestamp and remove duplicates
    this.newsCache = allArticles
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .filter((article, index, self) => 
        index === self.findIndex(a => a.title === article.title)
      );

    this.lastUpdate = new Date();
    console.log(`Fetched ${this.newsCache.length} articles`);
  }

  shouldRefresh() {
    if (!this.lastUpdate) return true;
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - this.lastUpdate.getTime() > thirtyMinutes;
  }

  startScheduledUpdates() {
    // Update every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.refreshNews();
    });
    
    // Initial fetch
    this.refreshNews();
  }
}

module.exports = new NewsAggregator();