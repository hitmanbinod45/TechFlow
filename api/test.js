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
    // Simple test data
    const testArticles = [
      {
        id: 'test-1',
        title: 'Test Article 1 - API is Working!',
        url: 'https://example.com',
        excerpt: 'This is a test article to verify the API is working',
        source: 'Test Source',
        category: 'Test',
        timestamp: new Date().toISOString(),
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format'
      },
      {
        id: 'test-2',
        title: 'Test Article 2 - Vercel Deployment Success',
        url: 'https://example.com',
        excerpt: 'Another test article to confirm everything is working',
        source: 'Test Source',
        category: 'Test',
        timestamp: new Date().toISOString(),
        image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=160&fit=crop&auto=format'
      }
    ];
    
    res.status(200).json(testArticles);
  } catch (error) {
    console.error('Error in test API:', error);
    res.status(500).json({ error: 'Test API failed', details: error.message });
  }
};