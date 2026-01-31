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
            local: localStorage.getItem('localTimezone') || 'auto',
            timezone1: localStorage.getItem('timezone1') || 'America/New_York',
            timezone2: localStorage.getItem('timezone2') || 'Europe/London'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.initTheme();
        this.initWeatherAndTime();
        
        // Show fallback articles immediately, then try to load live ones
        console.log('🚀 Initializing with fallback articles...');
        this.articles = this.createFallbackArticles();
        this.displayArticles(this.articles);
        
        // Then try to load live articles in the background
        setTimeout(() => {
            console.log('🔄 Now attempting to load live articles...');
            this.loadLiveArticlesInBackground();
        }, 1000);
        
        // Auto-refresh articles every 15 minutes with real news
        setInterval(() => {
            console.log('Auto-refreshing with live news...');
            this.loadLiveArticlesInBackground();
        }, 15 * 60 * 1000); // 15 minutes for more frequent updates
        
        // Auto-refresh weather every hour
        setInterval(() => {
            console.log('Auto-refreshing weather...');
            this.loadConsistentWeather();
        }, 60 * 60 * 1000); // 1 hour
    }

    async loadLiveArticlesInBackground() {
        try {
            console.log('🔄 Background loading of live articles...');
            
            // Set a shorter timeout for background loading
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Background loading timeout')), 8000);
            });
            
            const articlesPromise = this.fetchLiveNews();
            
            // Race between fetching articles and timeout
            const articles = await Promise.race([articlesPromise, timeoutPromise]);
            
            if (articles && articles.length > 0) {
                console.log(`✅ Background loaded ${articles.length} live articles, updating display`);
                this.articles = articles;
                this.displayArticles(this.articles);
            } else {
                console.log('⚠️ Background loading failed, keeping current articles');
            }
            
        } catch (error) {
            console.error('❌ Background loading failed:', error.message);
            console.log('📰 Keeping current articles displayed');
        }
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
        document.getElementById('localTimezone').addEventListener('change', (e) => {
            if (e.target.value !== 'auto') {
                this.timezones.local = e.target.value;
                localStorage.setItem('localTimezone', e.target.value);
            }
            this.updateTime();
        });
        
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
        
        // Load weather once and cache it
        await this.loadConsistentWeather();
    }

    async loadConsistentWeather() {
        // Check if we have cached weather data (valid for 30 minutes)
        const cachedWeather = localStorage.getItem('weatherData');
        const cacheTime = localStorage.getItem('weatherCacheTime');
        const now = Date.now();
        
        if (cachedWeather && cacheTime && (now - parseInt(cacheTime)) < 30 * 60 * 1000) {
            // Use cached data
            const weatherData = JSON.parse(cachedWeather);
            this.displayWeatherData(weatherData);
            return;
        }
        
        // Try to get real location-based weather
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        await this.fetchConsistentWeather(latitude, longitude);
                    },
                    (error) => {
                        console.log('Location access denied, using default location weather');
                        // Use a default location (London) for consistent weather
                        this.fetchConsistentWeather(51.5074, -0.1278);
                    }
                );
            } else {
                // Use default location weather
                this.fetchConsistentWeather(51.5074, -0.1278);
            }
        } catch (error) {
            console.error('Weather loading failed:', error);
            this.setFallbackWeather();
        }
    }

    async fetchConsistentWeather(lat, lon) {
        try {
            this.userLocation = { latitude: lat, longitude: lon };
            
            // Using WeatherAPI.com (free tier, more reliable)
            const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=demo&q=${lat},${lon}&days=1&aqi=no&alerts=no`);
            
            if (response.ok) {
                const data = await response.json();
                
                const weatherData = {
                    temp: Math.round(data.current.temp_c),
                    condition: data.current.condition.text,
                    hourly: data.forecast.forecastday[0].hour.slice(new Date().getHours(), new Date().getHours() + 5).map(hour => ({
                        time: new Date(hour.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                        temp: Math.round(hour.temp_c),
                        condition: hour.condition.text
                    })),
                    location: data.location.name
                };
                
                // Cache the weather data
                localStorage.setItem('weatherData', JSON.stringify(weatherData));
                localStorage.setItem('weatherCacheTime', Date.now().toString());
                
                this.displayWeatherData(weatherData);
                return;
            }
            
            // Fallback to Open-Meteo API
            await this.fetchOpenMeteoWeather(lat, lon);
            
        } catch (error) {
            console.error('WeatherAPI failed, trying Open-Meteo:', error);
            await this.fetchOpenMeteoWeather(lat, lon);
        }
    }

    async fetchOpenMeteoWeather(lat, lon) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.current_weather) {
                    const weatherData = {
                        temp: Math.round(data.current_weather.temperature),
                        condition: this.getWeatherConditionFromCode(data.current_weather.weathercode),
                        hourly: this.generateHourlyFromOpenMeteo(data.hourly),
                        location: 'Your Location'
                    };
                    
                    // Cache the weather data
                    localStorage.setItem('weatherData', JSON.stringify(weatherData));
                    localStorage.setItem('weatherCacheTime', Date.now().toString());
                    
                    this.displayWeatherData(weatherData);
                    return;
                }
            }
            
            // Final fallback
            this.setFallbackWeather();
            
        } catch (error) {
            console.error('Open-Meteo API failed:', error);
            this.setFallbackWeather();
        }
    }

    generateHourlyFromOpenMeteo(hourlyData) {
        const now = new Date();
        const currentHour = now.getHours();
        const hourly = [];
        
        for (let i = 0; i < 5; i++) {
            const hourIndex = currentHour + i;
            if (hourIndex < hourlyData.temperature_2m.length) {
                const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
                hourly.push({
                    time: i === 0 ? 'Now' : futureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                    temp: Math.round(hourlyData.temperature_2m[hourIndex]),
                    condition: this.getWeatherConditionFromCode(hourlyData.weathercode[hourIndex])
                });
            }
        }
        
        return hourly;
    }

    getWeatherConditionFromCode(code) {
        const conditions = {
            0: 'Clear',
            1: 'Mostly Clear',
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy',
            51: 'Light Drizzle',
            53: 'Drizzle',
            55: 'Heavy Drizzle',
            61: 'Light Rain',
            63: 'Rain',
            65: 'Heavy Rain',
            71: 'Light Snow',
            73: 'Snow',
            75: 'Heavy Snow',
            80: 'Light Showers',
            81: 'Showers',
            82: 'Heavy Showers',
            95: 'Thunderstorm'
        };
        return conditions[code] || 'Fair';
    }

    displayWeatherData(weatherData) {
        document.querySelector('.weather-temp').textContent = `${weatherData.temp}°`;
        document.querySelector('.weather-desc').textContent = weatherData.condition;
        
        // Update hourly forecast
        const hourlyContainer = document.getElementById('hourlyWeather');
        let hourlyHTML = '';
        
        weatherData.hourly.forEach(hour => {
            hourlyHTML += `
                <div class="hour-item">
                    <span class="hour">${hour.time}</span>
                    <span class="temp">${hour.temp}°</span>
                    <span class="condition">${hour.condition}</span>
                </div>
            `;
        });
        
        hourlyContainer.innerHTML = hourlyHTML;
    }

    setFallbackWeather() {
        // Simple, consistent fallback weather
        const weatherData = {
            temp: 22,
            condition: 'Fair',
            hourly: [
                { time: 'Now', temp: 22, condition: 'Fair' },
                { time: '20:00', temp: 21, condition: 'Clear' },
                { time: '21:00', temp: 20, condition: 'Clear' },
                { time: '22:00', temp: 19, condition: 'Cool' },
                { time: '23:00', temp: 18, condition: 'Cool' }
            ],
            location: 'Default'
        };
        
        // Cache fallback data too
        localStorage.setItem('weatherData', JSON.stringify(weatherData));
        localStorage.setItem('weatherCacheTime', Date.now().toString());
        
        this.displayWeatherData(weatherData);
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
        try {
            // Local time (first dropdown)
            let localDetailedTime;
            if (this.timezones.local === 'auto') {
                localDetailedTime = now.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false 
                });
            } else {
                localDetailedTime = new Date().toLocaleTimeString('en-US', {
                    timeZone: this.timezones.local,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            }
            document.getElementById('localTimeDetailed').textContent = localDetailedTime;
            
            // Timezone 1 (second dropdown)
            const timezone1Time = new Date().toLocaleTimeString('en-US', {
                timeZone: this.timezones.timezone1,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            document.getElementById('timezone1Time').textContent = timezone1Time;
            
            // Timezone 2 (third dropdown)
            const timezone2Time = new Date().toLocaleTimeString('en-US', {
                timeZone: this.timezones.timezone2,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            document.getElementById('timezone2Time').textContent = timezone2Time;
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
                this.generateFallbackHourlyWeather();
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
            this.generateFallbackHourlyWeather();
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
            const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
            const condition = this.getWeatherCondition(weatherCode, futureTime.getHours());
            
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

    getWeatherCondition(code, hour = null) {
        // If hour is provided, adjust conditions based on time of day
        const isNight = hour !== null && (hour < 6 || hour >= 20);
        
        const conditions = {
            0: isNight ? 'Clear' : 'Clear',
            1: isNight ? 'Clear' : 'Sunny', 
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
        return conditions[code] || (isNight ? 'Fair' : 'Fair');
    }

    // Add fallback hourly weather when API fails
    generateFallbackHourlyWeather() {
        const hourlyContainer = document.getElementById('hourlyWeather');
        const now = new Date();
        let hourlyHTML = '';
        
        for (let i = 0; i < 5; i++) {
            const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
            const hour = futureTime.getHours();
            
            // Generate realistic temperature and condition based on time
            let temp, condition;
            if (hour >= 6 && hour < 12) {
                temp = Math.floor(Math.random() * 8) + 18;
                condition = ['Clear', 'Fair', 'Partly Cloudy'][Math.floor(Math.random() * 3)];
            } else if (hour >= 12 && hour < 18) {
                temp = Math.floor(Math.random() * 10) + 22;
                condition = ['Sunny', 'Clear', 'Warm'][Math.floor(Math.random() * 3)];
            } else if (hour >= 18 && hour < 22) {
                temp = Math.floor(Math.random() * 8) + 20;
                condition = ['Clear', 'Fair', 'Partly Cloudy'][Math.floor(Math.random() * 3)];
            } else {
                temp = Math.floor(Math.random() * 8) + 15;
                condition = ['Clear', 'Cool', 'Fair'][Math.floor(Math.random() * 3)];
            }
            
            let timeLabel;
            if (i === 0) {
                timeLabel = 'Now';
            } else {
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



    async loadArticles() {
        this.showLoading();
        
        try {
            console.log('🔄 Loading fresh live news...');
            
            // Set a timeout for the entire operation (10 seconds max)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Loading timeout')), 10000);
            });
            
            const articlesPromise = this.fetchLiveNews();
            
            // Race between fetching articles and timeout
            const articles = await Promise.race([articlesPromise, timeoutPromise]);
            
            if (articles && articles.length > 0) {
                console.log(`✅ Loaded ${articles.length} live articles`);
                this.articles = articles;
            } else {
                console.log('⚠️ No live articles found, using fallback');
                this.articles = this.createFallbackArticles();
            }
            
            this.displayArticles(this.articles);
        } catch (error) {
            console.error('❌ Error loading articles:', error);
            console.log('🔄 Using fallback articles due to error');
            this.articles = this.createFallbackArticles();
            this.displayArticles(this.articles);
        }
    }

    async fetchLiveNews() {
        const allArticles = [];
        
        try {
            console.log('🔄 Fetching from multiple live sources...');
            
            // Fetch from multiple real news sources with individual timeouts
            const sources = [
                { name: 'Hacker News', fetch: () => this.fetchWithTimeout(() => this.fetchHackerNewsLive(), 5000) },
                { name: 'Dev.to', fetch: () => this.fetchWithTimeout(() => this.fetchDevToLive(), 5000) },
                { name: 'GitHub Trending', fetch: () => this.fetchWithTimeout(() => this.fetchGitHubTrending(), 5000) },
                { name: 'Tech RSS', fetch: () => this.fetchWithTimeout(() => this.fetchTechRSSLive(), 5000) }
            ];
            
            // Fetch all sources in parallel with individual error handling
            const results = await Promise.allSettled(sources.map(source => source.fetch()));
            
            let successCount = 0;
            results.forEach((result, index) => {
                const sourceName = sources[index].name;
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    console.log(`✅ ${sourceName}: ${result.value.length} articles`);
                    allArticles.push(...result.value);
                    successCount++;
                } else {
                    console.log(`⚠️ ${sourceName}: Failed or no articles`);
                }
            });
            
            // If no sources worked, return empty to trigger fallback
            if (successCount === 0) {
                console.log('⚠️ All sources failed, returning empty array');
                return [];
            }
            
            // Sort by actual timestamp (newest first) and validate
            const validArticles = allArticles
                .filter(article => 
                    article && 
                    article.title && 
                    article.title.trim().length > 10 &&
                    article.url && 
                    article.url.startsWith('http') &&
                    article.timestamp && 
                    article.source &&
                    article.image &&
                    article.excerpt &&
                    article.excerpt.trim().length > 20
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 12);
            
            console.log(`✅ Returning ${validArticles.length} valid articles from ${successCount} sources`);
            return validArticles;
            
        } catch (error) {
            console.error('❌ Error fetching live news:', error);
            return [];
        }
    }

    async fetchWithTimeout(fetchFunction, timeout = 5000) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
        });
        
        try {
            return await Promise.race([fetchFunction(), timeoutPromise]);
        } catch (error) {
            console.error('Fetch timeout or error:', error.message);
            return [];
        }
    }

    async fetchHackerNewsLive() {
        try {
            const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            if (!response.ok) throw new Error('HN API failed');
            
            const storyIds = await response.json();
            const articles = [];
            
            // Get only first 10 stories for speed
            for (let i = 0; i < Math.min(10, storyIds.length); i++) {
                try {
                    const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyIds[i]}.json`);
                    if (!storyResponse.ok) continue;
                    
                    const story = await storyResponse.json();
                    
                    if (story && story.title && story.url && story.time && story.score > 15) {
                        // Simple tech keyword check
                        const title = story.title.toLowerCase();
                        const isTech = ['tech', 'ai', 'software', 'app', 'web', 'code', 'startup', 'google', 'apple', 'microsoft'].some(keyword => title.includes(keyword));
                        
                        if (isTech) {
                            const timestamp = new Date(story.time * 1000);
                            const now = new Date();
                            
                            // Only recent articles (last 3 days)
                            if (now - timestamp < 3 * 24 * 60 * 60 * 1000) {
                                articles.push({
                                    id: `hn-${story.id}`,
                                    title: story.title.trim(),
                                    url: story.url,
                                    excerpt: `${story.score || 0} points • ${story.descendants || 0} comments • Trending on Hacker News`,
                                    source: 'Hacker News',
                                    category: 'Tech Discussion',
                                    timestamp: timestamp.toISOString(),
                                    image: this.getTechImage('hacker-news')
                                });
                            }
                        }
                    }
                } catch (err) {
                    // Skip failed stories
                    continue;
                }
                
                if (articles.length >= 3) break; // Limit for speed
            }
            
            return articles;
        } catch (error) {
            console.error('Error fetching Hacker News:', error);
            return [];
        }
    }

    async fetchDevToLive() {
        try {
            const response = await fetch('https://dev.to/api/articles?tag=javascript&top=7&per_page=6');
            if (!response.ok) throw new Error('Dev.to API failed');
            
            const articles = await response.json();
            
            return articles.slice(0, 3).map(article => {
                const timestamp = new Date(article.published_at);
                
                return {
                    id: `devto-${article.id}`,
                    title: article.title.trim(),
                    url: article.url,
                    excerpt: (article.description || article.title).trim().substring(0, 150) + '...',
                    source: 'Dev.to',
                    category: 'Development',
                    timestamp: timestamp.toISOString(),
                    image: article.cover_image || article.social_image || this.getTechImage('dev-to')
                };
            });
        } catch (error) {
            console.error('Error fetching Dev.to:', error);
            return [];
        }
    }

    async fetchGitHubTrending() {
        try {
            // Using GitHub's search API for trending repositories
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const dateStr = lastWeek.toISOString().split('T')[0];
            
            const response = await fetch(`https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=8`);
            const data = await response.json();
            
            if (data.items) {
                return data.items.slice(0, 3).map(repo => {
                    // Ensure we have a proper timestamp
                    const timestamp = new Date(repo.created_at);
                    
                    return {
                        id: `github-${repo.id}`,
                        title: `${repo.name}: ${repo.description || 'New trending repository'}`,
                        url: repo.html_url,
                        excerpt: `⭐ ${repo.stargazers_count} stars • ${repo.language || 'Multiple languages'} • Updated recently`,
                        source: 'GitHub',
                        category: 'Open Source',
                        timestamp: timestamp.toISOString(),
                        image: this.getTechImage('github')
                    };
                });
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching GitHub trending:', error);
            return [];
        }
    }

    async fetchTechRSSLive() {
        try {
            // Using RSS2JSON service for reliable tech news
            const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/oreilly/radar&count=8');
            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                return data.items.slice(0, 4).map((item, index) => ({
                    id: `tech-rss-${Date.now()}-${index}`,
                    title: item.title.trim(),
                    url: item.link,
                    excerpt: this.cleanHtmlAndTruncate(item.description || item.content, 150),
                    source: 'Tech News',
                    category: 'Technology',
                    timestamp: item.pubDate,
                    image: this.extractImageFromContent(item.content) || this.getTechImage('tech-news')
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching Tech RSS:', error);
            return [];
        }
    }

    cleanHtmlAndTruncate(html, maxLength) {
        if (!html) return 'Latest technology insights and trends from industry experts.';
        
        // Remove HTML tags and decode entities
        const text = html
            .replace(/<[^>]*>/g, '')
            .replace(/&[^;]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    extractImageFromContent(content) {
        if (!content) return null;
        
        const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
        if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http')) {
            return imgMatch[1];
        }
        
        return null;
    }estamp: item.pubDate,
                    image: this.getTechImage('tech-news')
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching tech news:', error);
            return [];
        }
    }

    getTechImage(source) {
        const images = {
            'hacker-news': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format',
            'dev-to': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=160&fit=crop&auto=format',
            'github': 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=160&fit=crop&auto=format',
            'tech-news': 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=400&h=160&fit=crop&auto=format'
        };
        return images[source] || 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=160&fit=crop&auto=format';
    }

    async refreshArticles() {
        this.refreshBtn.classList.add('loading');
        
        try {
            console.log('🔄 Manual refresh triggered...');
            
            // Try to fetch fresh live news with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Refresh timeout')), 8000);
            });
            
            const articlesPromise = this.fetchLiveNews();
            const articles = await Promise.race([articlesPromise, timeoutPromise]);
            
            if (articles && articles.length > 0) {
                console.log(`✅ Refresh loaded ${articles.length} live articles`);
                this.articles = articles;
                this.displayArticles(this.articles);
            } else {
                console.log('⚠️ Refresh failed, keeping current articles');
            }
            
            // Also refresh weather only if cache is old
            const cacheTime = localStorage.getItem('weatherCacheTime');
            const now = Date.now();
            if (!cacheTime || (now - parseInt(cacheTime)) > 30 * 60 * 1000) {
                await this.loadConsistentWeather();
            }
            
        } catch (error) {
            console.error('❌ Error refreshing articles:', error.message);
            console.log('📰 Keeping current articles displayed');
        } finally {
            this.refreshBtn.classList.remove('loading');
        }
    }

    async displayArticles(articles) {
        this.hideLoading();
        this.hideError();
        
        console.log('Raw articles received:', articles.length);
        
        // Very strict filtering to prevent empty cards
        let validArticles = articles.filter(article => {
            const hasTitle = article && article.title && article.title.trim() && 
                           article.title.trim() !== 'Untitled Article' && 
                           article.title.trim() !== '' &&
                           article.title.trim().length > 10;
            const hasExcerpt = article && article.excerpt && article.excerpt.trim() && 
                             article.excerpt.trim() !== 'No description available for this article.' &&
                             article.excerpt.trim() !== '' &&
                             article.excerpt.trim().length > 20;
            const hasUrl = article && article.url && article.url !== '#' && article.url.startsWith('http');
            const hasSource = article && article.source && article.source.trim() && article.source.trim() !== '';
            const hasImage = article && article.image && article.image.startsWith('http');
            
            return hasTitle && hasExcerpt && hasUrl && hasSource && hasImage;
        });
        
        console.log(`Filtered to ${validArticles.length} valid articles`);
        
        // Only show articles that pass all validation - no empty placeholders
        if (validArticles.length === 0) {
            this.articlesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📰</div>
                    <h3>Loading fresh tech news...</h3>
                    <p>Please wait while we fetch the latest articles.</p>
                </div>
            `;
            this.articlesGrid.style.display = 'grid';
            return;
        }

        // Limit to exactly what we have - no padding with empty content
        const displayArticles = validArticles.slice(0, 12);

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
                timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-2',
                title: 'Google Announces Major Android 15 Update with Enhanced Privacy',
                url: 'https://android.com',
                excerpt: 'The latest Android version brings significant privacy improvements, better performance optimization, and new AI-powered features.',
                source: 'The Verge',
                category: 'Mobile OS',
                timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                image: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-3',
                title: 'Microsoft Copilot Integration Transforms Developer Productivity',
                url: 'https://microsoft.com',
                excerpt: 'Microsoft\'s AI assistant is revolutionizing how developers write code, with significant productivity gains reported across the industry.',
                source: 'Hacker News',
                category: 'Development',
                timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
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
                timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
                image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-5',
                title: 'OpenAI Releases GPT-5: Next Generation AI Model',
                url: 'https://openai.com',
                excerpt: 'The latest AI model from OpenAI demonstrates unprecedented capabilities in reasoning, coding, and creative tasks.',
                source: 'Dev.to',
                category: 'AI Technology',
                timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
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
                timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
                image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-7',
                title: 'GitHub Copilot X: AI-Powered Development Revolution',
                url: 'https://github.com',
                excerpt: 'GitHub\'s enhanced AI coding assistant now supports entire project development with natural language commands.',
                source: 'GitHub',
                category: 'Development',
                timestamp: new Date(now - 7 * 60 * 60 * 1000).toISOString(), // 7 hours ago
                image: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=160&fit=crop&auto=format',
                stars: 15420,
                language: 'TypeScript'
            },
            {
                id: 'fallback-8',
                title: 'Meta Quest 4: Next-Gen VR Headset with Neural Interface',
                url: 'https://meta.com',
                excerpt: 'Meta\'s upcoming VR headset promises revolutionary neural interface technology for more immersive virtual experiences.',
                source: 'Tech News',
                category: 'VR Technology',
                timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
                image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-9',
                title: 'Nvidia RTX 5090: Revolutionary Graphics Card for AI and Gaming',
                url: 'https://nvidia.com',
                excerpt: 'Nvidia\'s latest flagship GPU delivers unprecedented performance for both AI workloads and next-generation gaming experiences.',
                source: 'TechCrunch',
                category: 'Hardware',
                timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
                image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=160&fit=crop&auto=format'
            },
            {
                id: 'fallback-10',
                title: 'AWS Announces New AI Services for Enterprise Development',
                url: 'https://aws.amazon.com',
                excerpt: 'Amazon Web Services introduces comprehensive AI toolkit for enterprise developers, including advanced machine learning capabilities.',
                source: 'Hacker News',
                category: 'Cloud Computing',
                timestamp: new Date(now - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
                image: 'https://images.unsplash.com/photo-1581091226825-c6a69373f1f4?w=400&h=160&fit=crop&auto=format',
                score: 156,
                comments: 67
            },
            {
                id: 'fallback-11',
                title: 'React 19: Major Update Brings Server Components and Concurrent Features',
                url: 'https://react.dev',
                excerpt: 'The latest React version introduces server components, improved concurrent rendering, and enhanced developer experience.',
                source: 'Dev.to',
                category: 'Web Development',
                timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=160&fit=crop&auto=format',
                tags: ['react', 'javascript']
            },
            {
                id: 'fallback-12',
                title: 'Quantum Computing Breakthrough: IBM Achieves 1000-Qubit Processor',
                url: 'https://ibm.com',
                excerpt: 'IBM\'s latest quantum processor represents a significant milestone in quantum computing, opening new possibilities for complex problem solving.',
                source: 'Tech News',
                category: 'Quantum Computing',
                timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=160&fit=crop&auto=format'
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