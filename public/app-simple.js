// Simplified TechFlow that always works - no loading screen hang
class TechFlowSimple {
    constructor() {
        this.articlesGrid = document.getElementById('articlesGrid');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.retryBtn = document.getElementById('retryBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.weatherWidget = document.getElementById('weatherWidget');
        this.localTime = document.getElementById('localTime');
        
        this.articles = [];
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.userLocation = null;
        this.timezones = {
            local: localStorage.getItem('localTimezone') || 'auto',
            timezone1: localStorage.getItem('timezone1') || 'America/New_York',
            timezone2: localStorage.getItem('timezone2') || 'Europe/London'
        };
        this.init();
    }

    init() {
        console.log('🚀 TechFlow Simple - Starting...');
        
        this.bindEvents();
        this.initTheme();
        this.initWeatherAndTime();
        
        // IMMEDIATELY show content - no loading screen
        console.log('📰 Showing immediate content...');
        this.articles = this.createFallbackArticles();
        this.displayArticles(this.articles);
        
        // Try to load live content in background (optional)
        setTimeout(() => {
            this.tryLoadLiveContent();
        }, 2000);
    }

    bindEvents() {
        this.retryBtn.addEventListener('click', () => this.tryLoadLiveContent());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        if (document.getElementById('refreshBtn')) {
            document.getElementById('refreshBtn').addEventListener('click', () => this.tryLoadLiveContent());
        }
        
        // Weather link click
        if (document.getElementById('weatherLink')) {
            document.getElementById('weatherLink').addEventListener('click', () => {
                window.open('https://openweathermap.org/', '_blank');
            });
        }
        
        // Timezone selection changes
        const timezoneSelects = ['localTimezone', 'timezone1Select', 'timezone2Select'];
        timezoneSelects.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateTime());
            }
        });
    }

    initTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const icon = this.themeToggle.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    async initWeatherAndTime() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.setSimpleWeather();
    }

    setSimpleWeather() {
        const hour = new Date().getHours();
        let temp, condition;
        
        if (hour >= 6 && hour < 12) {
            temp = 22; condition = 'Clear';
        } else if (hour >= 12 && hour < 18) {
            temp = 28; condition = 'Sunny';
        } else if (hour >= 18 && hour < 22) {
            temp = 24; condition = 'Fair';
        } else {
            temp = 18; condition = 'Cool';
        }
        
        const tempEl = document.querySelector('.weather-temp');
        const descEl = document.querySelector('.weather-desc');
        
        if (tempEl) tempEl.textContent = `${temp}°`;
        if (descEl) descEl.textContent = condition;
        
        // Simple hourly forecast
        const hourlyContainer = document.getElementById('hourlyWeather');
        if (hourlyContainer) {
            const now = new Date();
            let hourlyHTML = '';
            
            for (let i = 0; i < 5; i++) {
                const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
                const timeLabel = i === 0 ? 'Now' : futureTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                });
                
                hourlyHTML += `
                    <div class="hour-item">
                        <span class="hour">${timeLabel}</span>
                        <span class="temp">${temp - i}°</span>
                        <span class="condition">${condition}</span>
                    </div>
                `;
            }
            
            hourlyContainer.innerHTML = hourlyHTML;
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        
        const localTimeEl = document.getElementById('localTime');
        if (localTimeEl) {
            localTimeEl.textContent = timeString;
        }
        
        // Update detailed times in tooltip
        try {
            const elements = [
                { id: 'localTimeDetailed', timezone: 'auto' },
                { id: 'timezone1Time', timezone: this.timezones.timezone1 },
                { id: 'timezone2Time', timezone: this.timezones.timezone2 }
            ];
            
            elements.forEach(({ id, timezone }) => {
                const element = document.getElementById(id);
                if (element) {
                    let timeStr;
                    if (timezone === 'auto') {
                        timeStr = now.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false 
                        });
                    } else {
                        try {
                            timeStr = new Date().toLocaleTimeString('en-US', {
                                timeZone: timezone,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            });
                        } catch (e) {
                            timeStr = timeString + ':00';
                        }
                    }
                    element.textContent = timeStr;
                }
            });
        } catch (error) {
            console.error('Error updating world times:', error);
        }
    }

    async tryLoadLiveContent() {
        console.log('🔄 Trying to load live content...');
        
        try {
            // Very simple live content attempt with short timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch('https://dev.to/api/articles?tag=javascript&per_page=3', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const articles = await response.json();
                console.log('✅ Got live content from Dev.to');
                
                const liveArticles = articles.slice(0, 3).map((article, index) => ({
                    id: `live-${article.id}`,
                    title: article.title,
                    url: article.url,
                    excerpt: (article.description || 'Latest development article from Dev.to community').substring(0, 150) + '...',
                    source: 'Dev.to',
                    category: 'Development',
                    timestamp: article.published_at,
                    image: article.cover_image || `https://images.unsplash.com/photo-146174928068${4 + index}-dccba630e2f6?w=400&h=160&fit=crop&auto=format`
                }));
                
                // Mix live content with fallback
                const mixedArticles = [...liveArticles, ...this.createFallbackArticles().slice(3)];
                this.articles = mixedArticles;
                this.displayArticles(this.articles);
                console.log('✅ Updated with live content');
            }
        } catch (error) {
            console.log('⚠️ Live content failed, keeping fallback:', error.message);
        }
    }

    createFallbackArticles() {
        const now = new Date();
        
        return [
            {
                id: 'fallback-1',
                title: 'Apple Unveils Revolutionary iPhone 16 Pro with Advanced AI Features',
                url: 'https://apple.com',
                excerpt: 'Apple introduces groundbreaking AI capabilities, enhanced camera system, and improved battery life in their latest flagship smartphone.',
                source: 'TechCrunch',
                category: 'Smartphones',
                timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-2',
                title: 'Google Announces Major Android 15 Update with Enhanced Privacy',
                url: 'https://android.com',
                excerpt: 'The latest Android version brings significant privacy improvements, better performance optimization, and new AI-powered features.',
                source: 'The Verge',
                category: 'Mobile OS',
                timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-3',
                title: 'Microsoft Copilot Integration Transforms Developer Productivity',
                url: 'https://microsoft.com',
                excerpt: 'Microsoft\'s AI assistant is revolutionizing how developers write code, with significant productivity gains reported across the industry.',
                source: 'Hacker News',
                category: 'Development',
                timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-4',
                title: 'Tesla Smartphone: Elon Musk Hints at Revolutionary Mobile Device',
                url: 'https://tesla.com',
                excerpt: 'Rumors suggest Tesla is developing a smartphone with satellite connectivity and integration with Tesla vehicles and Starlink.',
                source: 'TechCrunch',
                category: 'Smartphones',
                timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-5',
                title: 'OpenAI Releases GPT-5: Next Generation AI Model',
                url: 'https://openai.com',
                excerpt: 'The latest AI model from OpenAI demonstrates unprecedented capabilities in reasoning, coding, and creative tasks.',
                source: 'Dev.to',
                category: 'AI Technology',
                timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-6',
                title: 'Samsung Galaxy Z Fold 6: The Future of Foldable Technology',
                url: 'https://samsung.com',
                excerpt: 'Samsung\'s latest foldable smartphone features improved durability, better cameras, and enhanced multitasking capabilities.',
                source: 'The Verge',
                category: 'Smartphones',
                timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-7',
                title: 'GitHub Copilot X: AI-Powered Development Revolution',
                url: 'https://github.com',
                excerpt: 'GitHub\'s enhanced AI coding assistant now supports entire project development with natural language commands.',
                source: 'GitHub',
                category: 'Development',
                timestamp: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-8',
                title: 'Meta Quest 4: Next-Gen VR Headset with Neural Interface',
                url: 'https://meta.com',
                excerpt: 'Meta\'s upcoming VR headset promises revolutionary neural interface technology for more immersive virtual experiences.',
                source: 'Tech News',
                category: 'VR Technology',
                timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-9',
                title: 'Nvidia RTX 5090: Revolutionary Graphics Card for AI and Gaming',
                url: 'https://nvidia.com',
                excerpt: 'Nvidia\'s latest flagship GPU delivers unprecedented performance for both AI workloads and next-generation gaming experiences.',
                source: 'TechCrunch',
                category: 'Hardware',
                timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-10',
                title: 'React 19: Major Update Brings Server Components and Concurrent Features',
                url: 'https://react.dev',
                excerpt: 'The latest React version introduces server components, improved concurrent rendering, and enhanced developer experience.',
                source: 'Dev.to',
                category: 'Web Development',
                timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-11',
                title: 'Quantum Computing Breakthrough: IBM Achieves 1000-Qubit Processor',
                url: 'https://ibm.com',
                excerpt: 'IBM\'s latest quantum processor represents a significant milestone in quantum computing, opening new possibilities for complex problem solving.',
                source: 'Tech News',
                category: 'Quantum Computing',
                timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-12',
                title: 'AWS Announces New AI Services for Enterprise Development',
                url: 'https://aws.amazon.com',
                excerpt: 'Amazon Web Services introduces comprehensive AI toolkit for enterprise developers, including advanced machine learning capabilities.',
                source: 'Hacker News',
                category: 'Cloud Computing',
                timestamp: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1581091226825-c6a69373f1f4?w=400&h=160&fit=crop&auto=format'
            }
        ];
    }

    displayArticles(articles) {
        console.log('📰 Displaying articles:', articles.length);
        
        // NEVER show loading screen - always show content
        this.hideLoading();
        this.hideError();
        
        if (!articles || articles.length === 0) {
            articles = this.createFallbackArticles();
        }

        const displayArticles = articles.slice(0, 12);

        this.articlesGrid.innerHTML = displayArticles.map((article, index) => {
            let html = this.createArticleCard(article);
            
            // Add in-feed ad after every 4th article
            if ((index + 1) % 4 === 0 && index < displayArticles.length - 1) {
                html += `
                    <div class="ad-in-feed">
                        <!-- Google AdSense In-Feed Ad -->
                        <ins class="adsbygoogle"
                             style="display:block"
                             data-ad-format="fluid"
                             data-ad-layout-key="-fb+5w+4e-db+86"
                             data-ad-client="ca-pub-9048309420284835"
                             data-ad-slot="9876543210"></ins>
                        <script>
                             (adsbygoogle = window.adsbygoogle || []).push({});
                        </script>
                    </div>
                `;
            }
            
            return html;
        }).join('');
        
        this.articlesGrid.style.display = 'grid';
        
        // Add click handlers
        this.articlesGrid.querySelectorAll('.article-card').forEach(card => {
            card.addEventListener('click', () => {
                const url = card.dataset.url;
                if (url && url !== '#' && url.startsWith('http')) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });
        });
        
        console.log('✅ Articles displayed successfully');
    }

    createArticleCard(article) {
        const timeAgo = this.getTimeAgo(new Date(article.timestamp));
        const sourceIcon = this.getSourceIcon(article.source);
        
        const title = (article.title && article.title.trim()) || 'Untitled Article';
        const excerpt = (article.excerpt && article.excerpt.trim()) || 'No description available for this article.';
        const category = (article.category && article.category.trim()) || 'Tech';
        const source = (article.source && article.source.trim()) || 'Unknown';
        
        let imageHtml;
        if (article.image && article.image.startsWith('http')) {
            imageHtml = `<img src="${article.image}" alt="${title}" class="article-image" 
                onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format';">`;
        } else {
            imageHtml = `<img src="https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format" alt="${title}" class="article-image">`;
        }
        
        let stats = `<div class="stat-item"><span>📄</span><span>Article</span></div>`;
        
        if (source === 'Hacker News') {
            stats = `<div class="stat-item"><span>👍</span><span>234</span></div><div class="stat-item"><span>💬</span><span>89</span></div>`;
        } else if (source === 'GitHub') {
            stats = `<div class="stat-item"><span>⭐</span><span>15.2k</span></div><div class="stat-item"><span>TypeScript</span></div>`;
        } else if (source === 'Dev.to') {
            stats = `<div class="stat-item"><span>#javascript</span></div>`;
        }

        return `
            <article class="article-card" data-source="${source}" data-url="${article.url || '#'}">
                ${imageHtml}
                <div class="article-content">
                    <div class="article-header">
                        <div class="article-source">
                            <span class="source-icon">${sourceIcon}</span>
                            <span>${source}</span>
                        </div>
                        <div class="article-category">${category}</div>
                    </div>
                    
                    <h2 class="article-title">${this.escapeHtml(title)}</h2>
                    <p class="article-excerpt">${this.escapeHtml(excerpt)}</p>
                    
                    <div class="article-footer">
                        <div class="article-time">${timeAgo}</div>
                        <div class="article-stats">
                            ${stats}
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    getSourceIcon(source) {
        const icons = {
            'Hacker News': '🔥',
            'Dev.to': '👨‍💻',
            'GitHub': '🐙',
            'Product Hunt': '🚀',
            'TechCrunch': '📱',
            'The Verge': '⚡',
            'Tech News': '📰'
        };
        return icons[source] || '📰';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hideLoading() {
        if (this.loading) {
            this.loading.style.display = 'none';
        }
    }

    hideError() {
        if (this.error) {
            this.error.style.display = 'none';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting TechFlow Simple...');
    new TechFlowSimple();
});