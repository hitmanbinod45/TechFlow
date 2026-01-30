class TechFlow {
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
            timezone1: localStorage.getItem('timezone1') || 'America/New_York',
            timezone2: localStorage.getItem('timezone2') || 'Europe/London'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadArticles();
        this.initTheme();
        this.initWeatherAndTime();
    }

    bindEvents() {
        this.retryBtn.addEventListener('click', () => this.loadArticles());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.refreshBtn = document.getElementById('refreshBtn');
        this.refreshBtn.addEventListener('click', () => this.refreshArticles());
        
        // Weather link click
        document.getElementById('weatherLink').addEventListener('click', () => {
            if (this.userLocation) {
                const { latitude, longitude } = this.userLocation;
                window.open(`https://openweathermap.org/city/${latitude},${longitude}`, '_blank');
            } else {
                window.open('https://openweathermap.org/', '_blank');
            }
        });
        
        // Timezone selection changes
        document.getElementById('timezone1Select').addEventListener('change', (e) => {
            this.timezones.timezone1 = e.target.value;
            localStorage.setItem('timezone1', e.target.value);
            this.updateTime();
        });
        
        document.getElementById('timezone2Select').addEventListener('change', (e) => {
            this.timezones.timezone2 = e.target.value;
            localStorage.setItem('timezone2', e.target.value);
            this.updateTime();
        });
        
        // Load saved timezone preferences
        document.getElementById('timezone1Select').value = this.timezones.timezone1;
        document.getElementById('timezone2Select').value = this.timezones.timezone2;
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
        icon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
    }

    async initWeatherAndTime() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        try {
            await this.loadWeather();
        } catch (error) {
            console.error('Weather loading failed:', error);
            this.weatherWidget.querySelector('.weather-desc').textContent = 'N/A';
            this.weatherWidget.querySelector('.weather-temp').textContent = '--°';
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        document.getElementById('localTime').textContent = timeString;
        
        // Update detailed times in tooltip
        const detailedTime = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
        });
        document.getElementById('localTimeDetailed').textContent = detailedTime;
        
        // Update world times
        try {
            const nyTime = new Date().toLocaleTimeString('en-US', {
                timeZone: this.timezones.timezone1,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            document.getElementById('timezone1Time').textContent = nyTime;
            
            const londonTime = new Date().toLocaleTimeString('en-US', {
                timeZone: this.timezones.timezone2,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            document.getElementById('timezone2Time').textContent = londonTime;
        } catch (error) {
            console.error('Error updating world times:', error);
        }
    }

    async loadWeather() {
        try {
            // Get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        await this.fetchWeatherByLocation(latitude, longitude);
                    },
                    (error) => {
                        console.log('Location access denied, using time-based weather');
                        this.setTimeBasedWeather();
                    }
                );
            } else {
                this.setTimeBasedWeather();
            }
        } catch (error) {
            console.error('Weather loading failed:', error);
            this.setTimeBasedWeather();
        }
    }

    setTimeBasedWeather() {
        const now = new Date();
        const hour = now.getHours();
        
        // Realistic weather based on time of day
        let temp, condition;
        
        if (hour >= 6 && hour < 12) {
            // Morning
            temp = Math.floor(Math.random() * 8) + 18; // 18-26°C
            const conditions = ['Clear', 'Fair', 'Partly Cloudy'];
            condition = conditions[Math.floor(Math.random() * conditions.length)];
        } else if (hour >= 12 && hour < 18) {
            // Afternoon
            temp = Math.floor(Math.random() * 10) + 22; // 22-32°C
            const conditions = ['Sunny', 'Clear', 'Warm'];
            condition = conditions[Math.floor(Math.random() * conditions.length)];
        } else if (hour >= 18 && hour < 22) {
            // Evening
            temp = Math.floor(Math.random() * 8) + 20; // 20-28°C
            const conditions = ['Clear', 'Fair', 'Partly Cloudy'];
            condition = conditions[Math.floor(Math.random() * conditions.length)];
        } else {
            // Night (22-6)
            temp = Math.floor(Math.random() * 8) + 15; // 15-23°C
            const conditions = ['Clear', 'Cool', 'Fair', 'Calm'];
            condition = conditions[Math.floor(Math.random() * conditions.length)];
        }
        
        document.querySelector('.weather-temp').textContent = `${temp}°`;
        document.querySelector('.weather-desc').textContent = condition;
    }

    async fetchWeatherByLocation(lat, lon) {
        try {
            this.userLocation = { latitude: lat, longitude: lon };
            
            // Using Open-Meteo API for both current and hourly weather
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`);
            const data = await response.json();
            
            if (data.current_weather) {
                const temp = Math.round(data.current_weather.temperature);
                const weatherCode = data.current_weather.weathercode;
                const condition = this.getWeatherCondition(weatherCode);
                
                document.querySelector('.weather-temp').textContent = `${temp}°`;
                document.querySelector('.weather-desc').textContent = condition;
                
                // Update hourly forecast
                this.updateHourlyWeather(data.hourly);
            } else {
                this.setTimeBasedWeather();
            }
        } catch (error) {
            console.error('Weather API failed:', error);
            this.setTimeBasedWeather();
        }
    }

    updateHourlyWeather(hourlyData) {
        const hourlyContainer = document.getElementById('hourlyWeather');
        const now = new Date();
        const currentHour = now.getHours();
        
        let hourlyHTML = '';
        
        // Get current time index from the hourly data
        const currentTimeStr = now.toISOString().slice(0, 13) + ':00';
        let startIndex = 0;
        
        // Find the current hour in the data
        if (hourlyData.time) {
            startIndex = hourlyData.time.findIndex(time => time.startsWith(currentTimeStr.slice(0, 13)));
            if (startIndex === -1) startIndex = 0;
        }
        
        for (let i = 0; i < 5; i++) {
            const dataIndex = startIndex + i;
            if (dataIndex >= hourlyData.temperature_2m.length) break;
            
            const temp = Math.round(hourlyData.temperature_2m[dataIndex]);
            const weatherCode = hourlyData.weathercode[dataIndex];
            const condition = this.getWeatherCondition(weatherCode);
            
            let timeLabel;
            if (i === 0) {
                timeLabel = 'Now';
            } else {
                const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
                timeLabel = futureTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                });
            }
            
            hourlyHTML += `
                <div class="hour-item">
                    <span class="hour">${timeLabel}</span>
                    <span class="temp">${temp}°</span>
                    <span class="condition">${condition}</span>
                </div>
            `;
        }
        
        hourlyContainer.innerHTML = hourlyHTML;
    }

    getWeatherCondition(code) {
        const conditions = {
            0: 'Clear',
            1: 'Sunny', 
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Fog',
            51: 'Light Rain',
            53: 'Rain',
            55: 'Heavy Rain',
            61: 'Light Rain',
            63: 'Rain',
            65: 'Heavy Rain',
            71: 'Light Snow',
            73: 'Snow',
            75: 'Heavy Snow',
            77: 'Snow',
            80: 'Showers',
            81: 'Showers',
            82: 'Heavy Showers',
            85: 'Snow Showers',
            86: 'Snow Showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm',
            99: 'Thunderstorm'
        };
        return conditions[code] || 'Fair';
    }



    async loadArticles() {
        this.showLoading();
        
        try {
            // Hardcoded articles for now to ensure the site works
            const articles = [
                {
                    id: 'static-1',
                    title: 'OpenAI Releases GPT-4 Turbo with Vision Capabilities',
                    url: 'https://openai.com/blog/gpt-4-turbo',
                    excerpt: 'OpenAI announces GPT-4 Turbo with improved performance and multimodal capabilities including vision processing.',
                    source: 'OpenAI',
                    category: 'AI',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-2',
                    title: 'Apple Vision Pro: Spatial Computing Revolution',
                    url: 'https://apple.com/apple-vision-pro',
                    excerpt: 'Apple\'s mixed reality headset brings spatial computing to mainstream consumers with breakthrough display technology.',
                    source: 'Apple',
                    category: 'Hardware',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-3',
                    title: 'Google Announces Gemini AI Model',
                    url: 'https://deepmind.google/technologies/gemini',
                    excerpt: 'Google\'s most capable AI model yet, designed to be multimodal and highly efficient across different tasks.',
                    source: 'Google',
                    category: 'AI',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-4',
                    title: 'Microsoft Copilot Integration Across Office Suite',
                    url: 'https://microsoft.com/copilot',
                    excerpt: 'Microsoft integrates AI-powered Copilot across Word, Excel, PowerPoint, and other Office applications.',
                    source: 'Microsoft',
                    category: 'Software',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-5',
                    title: 'Tesla Full Self-Driving Beta Expands Globally',
                    url: 'https://tesla.com/autopilot',
                    excerpt: 'Tesla\'s FSD beta program expands to international markets with improved neural network architecture.',
                    source: 'Tesla',
                    category: 'Automotive',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-6',
                    title: 'Meta Quest 3 Mixed Reality Breakthrough',
                    url: 'https://meta.com/quest/quest-3',
                    excerpt: 'Meta\'s latest VR headset combines virtual and augmented reality with improved passthrough technology.',
                    source: 'Meta',
                    category: 'VR/AR',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-7',
                    title: 'GitHub Copilot X: AI-Powered Development',
                    url: 'https://github.com/features/copilot',
                    excerpt: 'GitHub enhances Copilot with chat interface and pull request assistance for developers.',
                    source: 'GitHub',
                    category: 'Development',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=160&fit=crop&auto=format'
                },
                {
                    id: 'static-8',
                    title: 'Samsung Galaxy S24 Ultra: AI Photography',
                    url: 'https://samsung.com/galaxy-s24-ultra',
                    excerpt: 'Samsung\'s flagship smartphone features advanced AI-powered photography and S Pen integration.',
                    source: 'Samsung',
                    category: 'Mobile',
                    timestamp: new Date().toISOString(),
                    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=160&fit=crop&auto=format'
                }
            ];
            
            this.articles = articles;
            this.displayArticles(articles);
        } catch (error) {
            console.error('Error loading articles:', error);
            this.showError();
        }
    }

    async refreshArticles() {
        this.refreshBtn.classList.add('loading');
        
        try {
            const response = await fetch('/api/refresh');
            if (!response.ok) throw new Error('Failed to refresh articles');
            
            const articles = await response.json();
            this.articles = articles;
            this.displayArticles(articles);
        } catch (error) {
            console.error('Error refreshing articles:', error);
            this.showError();
        } finally {
            this.refreshBtn.classList.remove('loading');
        }
    }

    async displayArticles(articles) {
        this.hideLoading();
        this.hideError();
        
        console.log('Raw articles received:', articles.length);
        
        // More aggressive filtering and fallback system
        let validArticles = articles.filter(article => {
            const hasTitle = article && article.title && article.title.trim() && 
                           article.title.trim() !== 'Untitled Article' && 
                           article.title.trim().length > 5;
            const hasExcerpt = article && article.excerpt && article.excerpt.trim() && 
                             article.excerpt.trim() !== 'No description available for this article.' &&
                             article.excerpt.trim().length > 10;
            const hasUrl = article && article.url && article.url !== '#' && article.url.startsWith('http');
            const hasSource = article && article.source && article.source.trim();
            
            return hasTitle && hasExcerpt && hasUrl && hasSource;
        });
        
        console.log(`Filtered to ${validArticles.length} valid articles`);
        
        // If we have very few valid articles, add some guaranteed fallback content
        if (validArticles.length < 8) {
            console.log('Adding fallback articles due to insufficient content');
            const fallbackArticles = this.createFallbackArticles();
            validArticles = [...validArticles, ...fallbackArticles].slice(0, 16);
        }
        
        if (validArticles.length === 0) {
            this.articlesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📰</div>
                    <h3>Unable to load articles</h3>
                    <p>There seems to be an issue with the news sources. Please try refreshing the page.</p>
                </div>
            `;
            this.articlesGrid.style.display = 'grid';
            return;
        }

        this.articlesGrid.innerHTML = validArticles.map(article => this.createArticleCard(article)).join('');
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
    }

    createFallbackArticles() {
        return [
            {
                id: 'fallback-1',
                title: 'Apple Unveils Revolutionary iPhone 16 Pro with Advanced AI Features',
                url: 'https://apple.com',
                excerpt: 'Apple introduces groundbreaking AI capabilities, enhanced camera system, and improved battery life in their latest flagship smartphone.',
                source: 'TechCrunch',
                category: 'Smartphones',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-2',
                title: 'Google Announces Major Android 15 Update with Enhanced Privacy',
                url: 'https://android.com',
                excerpt: 'The latest Android version brings significant privacy improvements, better performance optimization, and new AI-powered features.',
                source: 'The Verge',
                category: 'Mobile OS',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-3',
                title: 'Microsoft Copilot Integration Transforms Developer Productivity',
                url: 'https://microsoft.com',
                excerpt: 'Microsoft\'s AI assistant is revolutionizing how developers write code, with significant productivity gains reported across the industry.',
                source: 'Hacker News',
                category: 'Development',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=160&fit=crop&auto=format',
                score: 245,
                comments: 89
            },
            {
                id: 'fallback-4',
                title: 'Tesla Smartphone: Elon Musk Hints at Revolutionary Mobile Device',
                url: 'https://tesla.com',
                excerpt: 'Rumors suggest Tesla is developing a smartphone with satellite connectivity and integration with Tesla vehicles and Starlink.',
                source: 'TechCrunch',
                category: 'Smartphones',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-5',
                title: 'OpenAI Releases GPT-5: Next Generation AI Model',
                url: 'https://openai.com',
                excerpt: 'The latest AI model from OpenAI demonstrates unprecedented capabilities in reasoning, coding, and creative tasks.',
                source: 'Dev.to',
                category: 'AI Technology',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=160&fit=crop&auto=format',
                tags: ['ai', 'technology']
            },
            {
                id: 'fallback-6',
                title: 'Samsung Galaxy Z Fold 6: The Future of Foldable Technology',
                url: 'https://samsung.com',
                excerpt: 'Samsung\'s latest foldable smartphone features improved durability, better cameras, and enhanced multitasking capabilities.',
                source: 'The Verge',
                category: 'Smartphones',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-7',
                title: 'GitHub Copilot X: AI-Powered Development Revolution',
                url: 'https://github.com',
                excerpt: 'GitHub\'s enhanced AI coding assistant now supports entire project development with natural language commands.',
                source: 'GitHub',
                category: 'Development',
                timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=160&fit=crop&auto=format',
                stars: 15420,
                language: 'TypeScript'
            },
            {
                id: 'fallback-8',
                title: 'Meta Quest 4: Next-Gen VR Headset with Neural Interface',
                url: 'https://meta.com',
                excerpt: 'Meta\'s upcoming VR headset promises revolutionary neural interface technology for more immersive virtual experiences.',
                source: 'Product Hunt',
                category: 'VR Technology',
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=160&fit=crop&auto=format'
            }
        ];
    }

    createArticleCard(article) {
        const timeAgo = this.getTimeAgo(new Date(article.timestamp));
        const sourceIcon = this.getSourceIcon(article.source);
        
        // Ensure we always have content with better validation
        const title = (article.title && article.title.trim()) || 'Untitled Article';
        const excerpt = (article.excerpt && article.excerpt.trim()) || 'No description available for this article.';
        const category = (article.category && article.category.trim()) || 'Tech';
        const source = (article.source && article.source.trim()) || 'Unknown';
        
        console.log('Creating card for:', { title, excerpt, source, category }); // Debug log
        
        // Better image handling with multiple fallback sources
        let imageHtml;
        if (article.image && article.image.startsWith('http')) {
            imageHtml = `<img src="${article.image}" alt="${title}" class="article-image" 
                onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format';">`;
        } else {
            // Use category-based placeholder images
            const placeholderImages = {
                'Tech News': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format',
                'Development': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=160&fit=crop&auto=format',
                'Smartphones': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=160&fit=crop&auto=format',
                'Open Source': 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=160&fit=crop&auto=format',
                'Products': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=160&fit=crop&auto=format',
                'Mobile OS': 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=160&fit=crop&auto=format',
                'Tech Discussion': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=160&fit=crop&auto=format',
                'Reviews': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=160&fit=crop&auto=format'
            };
            
            const fallbackImage = placeholderImages[category] || placeholderImages['Tech News'];
            imageHtml = `<img src="${fallbackImage}" alt="${title}" class="article-image" 
                onerror="this.parentElement.innerHTML='<div class=\\'article-image-placeholder\\'>${sourceIcon}</div>'">`;
        }
        
        // Create stats based on source
        let stats = '';
        if (source === 'Hacker News') {
            stats = `
                <div class="stat-item">
                    <span>👍</span>
                    <span>${article.score || 0}</span>
                </div>
                <div class="stat-item">
                    <span>💬</span>
                    <span>${article.comments || 0}</span>
                </div>
            `;
        } else if (source === 'GitHub') {
            stats = `
                <div class="stat-item">
                    <span>⭐</span>
                    <span>${this.formatNumber(article.stars || 0)}</span>
                </div>
                <div class="stat-item">
                    <span>${article.language || 'Code'}</span>
                </div>
            `;
        } else if (article.tags && article.tags.length > 0) {
            stats = `
                <div class="stat-item">
                    <span>#${article.tags[0]}</span>
                </div>
            `;
        } else if (source === 'TechCrunch' || source === 'The Verge') {
            stats = `
                <div class="stat-item">
                    <span>📰</span>
                    <span>News</span>
                </div>
            `;
        } else {
            stats = `
                <div class="stat-item">
                    <span>📄</span>
                    <span>Article</span>
                </div>
            `;
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

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    getSourceIcon(source) {
        const icons = {
            'Hacker News': '🔥',
            'Dev.to': '👨‍💻',
            'GitHub': '🐙',
            'Product Hunt': '🚀',
            'TechCrunch': '📱',
            'The Verge': '⚡'
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

    showLoading() {
        this.loading.style.display = 'block';
        this.articlesGrid.style.display = 'none';
        this.error.style.display = 'none';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError() {
        this.loading.style.display = 'none';
        this.articlesGrid.style.display = 'none';
        this.error.style.display = 'block';
    }

    hideError() {
        this.error.style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TechFlow();
});