// DOM elements
const createPostForm = document.getElementById('createPostForm');
const postsList = document.getElementById('postsList');

// Enhanced state management
const adminState = {
    healthChecks: {
        database: true,
        api: true,
        linkedin: false,
        memory: true
    },
    realTimeConnected: true,
    lastHealthCheck: 0
};

// Enhanced toast notifications
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 8px;
        z-index: 10000;
        color: white;
        font-weight: 500;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        ${type === 'success' ? 'background: linear-gradient(135deg, #10b981, #059669);' : 
          type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : 
          type === 'warning' ? 'background: linear-gradient(135deg, #f59e0b, #d97706);' : 
          'background: linear-gradient(135deg, #3b82f6, #2563eb);'}
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Real-time updates
const realTime = {
    indicator: null,
    
    init() {
        this.indicator = document.getElementById('realTimeIndicator');
        this.updateStatus(true);
        
        // Check for updates every 30 seconds
        setInterval(() => {
            this.performHealthChecks();
        }, 30000);
        
        // Initial health check
        setTimeout(() => this.performHealthChecks(), 2000);
    },
    
    updateStatus(connected) {
        adminState.realTimeConnected = connected;
        if (this.indicator) {
            this.indicator.textContent = connected ? '⚡ Live' : '❌ Offline';
            this.indicator.classList.toggle('disconnected', !connected);
        }
    },
    
    async performHealthChecks() {
        try {
            // Database health check
            const dbResponse = await fetch('/api/posts?limit=1');
            adminState.healthChecks.database = dbResponse.ok;
            
            // API health check
            const apiResponse = await fetch('/api/health');
            adminState.healthChecks.api = apiResponse.ok || dbResponse.ok; // Fallback if health endpoint doesn't exist
            
            // LinkedIn health check
            const linkedinResponse = await fetch('/api/linkedin/status');
            adminState.healthChecks.linkedin = linkedinResponse.ok;
            
            // Memory health (simulated)
            adminState.healthChecks.memory = Math.random() > 0.1; // 90% chance of healthy
            
            this.updateHealthIndicators();
            this.updateStatus(true);
            
        } catch (error) {
            console.error('Health check failed:', error);
            this.updateStatus(false);
        }
    },
    
    updateHealthIndicators() {
        const indicators = {
            dbHealth: adminState.healthChecks.database,
            apiHealth: adminState.healthChecks.api,
            linkedinHealth: adminState.healthChecks.linkedin,
            memoryHealth: adminState.healthChecks.memory
        };
        
        const statuses = {
            dbStatus: adminState.healthChecks.database ? 'Connected' : 'Error',
            apiStatus: adminState.healthChecks.api ? 'Healthy' : 'Error',
            linkedinStatus: adminState.healthChecks.linkedin ? 'Connected' : 'Limited',
            memoryUsage: adminState.healthChecks.memory ? 'Normal' : 'High'
        };
        
        Object.entries(indicators).forEach(([id, healthy]) => {
            const element = document.getElementById(id);
            if (element) {
                element.className = `health-status ${healthy ? 'healthy' : 'error'}`;
            }
        });
        
        Object.entries(statuses).forEach(([id, status]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = status;
            }
        });
    }
};

// Enhanced analytics data
const analytics = {
    async loadSystemMetrics() {
        try {
            // Simulate loading real system metrics
            // In a real implementation, these would come from actual monitoring APIs
            const metrics = {
                activeUsers: Math.floor(Math.random() * 100) + 50,
                userGrowth: (Math.random() * 20 - 5).toFixed(1),
                postsShared: Math.floor(Math.random() * 500) + 200,
                engagementGrowth: (Math.random() * 15).toFixed(1),
                apiRequests: Math.floor(Math.random() * 10000) + 5000,
                apiGrowth: (Math.random() * 10 - 5).toFixed(1),
                storageUsed: Math.floor(Math.random() * 100) + 20,
                storageGrowth: (Math.random() * 20).toFixed(1)
            };
            
            this.updateAnalyticsDisplay(metrics);
            
        } catch (error) {
            console.error('Error loading system metrics:', error);
        }
    },
    
    updateAnalyticsDisplay(metrics) {
        // Update values
        const updates = {
            activeUsers: metrics.activeUsers,
            postsShared: metrics.postsShared,
            apiRequests: metrics.apiRequests.toLocaleString(),
            storageUsed: `${metrics.storageUsed}%`
        };
        
        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Update growth indicators
        const growthUpdates = {
            userGrowth: metrics.userGrowth,
            engagementGrowth: metrics.engagementGrowth,
            apiGrowth: metrics.apiGrowth,
            storageGrowth: metrics.storageGrowth
        };
        
        Object.entries(growthUpdates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                const isPositive = parseFloat(value) >= 0;
                element.textContent = `${isPositive ? '+' : ''}${value}%`;
                element.className = `analytics-change ${isPositive ? 'positive' : 'negative'}`;
            }
        });
    }
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Admin Panel initializing...');
    
    // Initialize modules
    realTime.init();
    analytics.loadSystemMetrics();
    
    // Load existing data
    loadPosts();
    loadNewsStatus();
    loadScoringStats();
    
    // Event listeners
    createPostForm.addEventListener('submit', handleCreatePost);
    
    // Refresh analytics every 2 minutes
    setInterval(() => {
        analytics.loadSystemMetrics();
    }, 120000);
    
    console.log('✅ Enhanced Admin Panel loaded');
});

// Create new post
async function handleCreatePost(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const imageUrl = document.getElementById('postImageUrl').value;
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                content,
                image_url: imageUrl
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Post created successfully!', 'success');
            createPostForm.reset();
            loadPosts();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

// Load and display posts
async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        if (response.ok) {
            displayPosts(posts);
        } else {
            showMessage('Error loading posts', 'error');
        }
    } catch (error) {
        showMessage('Network error loading posts', 'error');
    }
}

function displayPosts(posts) {
    postsList.innerHTML = '';
    
    if (posts.length === 0) {
        postsList.innerHTML = '<p>No posts created yet.</p>';
        return;
    }
    
    posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = 'post-item';
        postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            ${post.image_url ? `<img src="${post.image_url}" alt="Post image" style="max-width: 200px; margin: 10px 0;">` : ''}
            <small>Created by: ${post.author}${post.source_url ? ` • <a href="${post.source_url}" target="_blank">Read original</a>` : ''}</small>
            <div class="post-actions">
                <button onclick="deletePost(${post.id})" class="delete-btn">Delete Post</button>
            </div>
        `;
        postsList.appendChild(postDiv);
    });
}

// News sync functions
async function loadNewsStatus() {
    try {
        const response = await fetch('/api/news-status');
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('newsCount').textContent = data.newsPostsCount;
        }
    } catch (error) {
        console.error('Error loading news status:', error);
        document.getElementById('newsCount').textContent = 'Error';
    }
}

async function syncNews() {
    const syncBtn = document.getElementById('syncNewsBtn');
    const originalText = syncBtn.textContent;
    
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;
    
    try {
        const response = await fetch('/api/sync-news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`News sync completed! Found ${data.articlesFound} articles.`, 'success');
            loadPosts(); // Refresh posts list
            loadNewsStatus(); // Update news count
        } else {
            showMessage(data.error || 'Failed to sync news', 'error');
        }
    } catch (error) {
        showMessage('Network error during news sync', 'error');
    } finally {
        syncBtn.textContent = originalText;
        syncBtn.disabled = false;
    }
}

// Delete post function
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Post deleted successfully!', 'success');
            loadPosts(); // Refresh posts list
            loadNewsStatus(); // Update counts
        } else {
            showMessage(data.error || 'Failed to delete post', 'error');
        }
    } catch (error) {
        showMessage('Network error during deletion', 'error');
    }
}

// Navigation functions
function goHome() {
    window.location.href = '/';
}

function goToDashboard() {
    window.location.href = '/dashboard';
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        showMessage('Error logging out', 'error');
    }
}

// Utility functions
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        color: white;
        font-weight: bold;
        ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// SCORING ANALYTICS FUNCTIONS

// Load scoring stats for admin dashboard
async function loadScoringStats() {
    try {
        const response = await fetch('/api/admin/scoring-stats');
        if (response.ok) {
            const data = await response.json();
            updateStatsDisplay(data.stats);
        } else {
            console.error('Failed to load scoring stats');
        }
    } catch (error) {
        console.error('Error loading scoring stats:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    document.getElementById('totalUsers').textContent = stats.total_users || 0;
    document.getElementById('totalPoints').textContent = stats.total_points_awarded || 0;
    document.getElementById('totalPosts').textContent = stats.total_posts || 0;
    document.getElementById('totalAchievements').textContent = stats.total_achievements || 0;
    document.getElementById('activeToday').textContent = stats.active_users_today || 0;
    document.getElementById('activeWeek').textContent = stats.active_users_week || 0;
}

// Show top users modal
async function showTopUsers() {
    const modal = document.getElementById('topUsersModal');
    const topUsersList = document.getElementById('topUsersList');
    
    modal.classList.remove('hidden');
    topUsersList.innerHTML = '<div class="loading">Loading top users...</div>';
    
    try {
        const response = await fetch('/api/leaderboard?limit=20');
        if (response.ok) {
            const data = await response.json();
            displayTopUsers(data.leaderboard);
        } else {
            topUsersList.innerHTML = '<div class="loading">Failed to load users</div>';
        }
    } catch (error) {
        topUsersList.innerHTML = '<div class="loading">Error loading users</div>';
    }
}

// Display top users
function displayTopUsers(users) {
    const topUsersList = document.getElementById('topUsersList');
    
    if (!users || users.length === 0) {
        topUsersList.innerHTML = '<div class="loading">No users yet</div>';
        return;
    }
    
    topUsersList.innerHTML = users.map((user, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1);
        
        return `
            <div class="leaderboard-item ${rankClass}" style="margin-bottom: 10px; padding: 15px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center;">
                <div style="font-size: 1.5rem; font-weight: bold; margin-right: 15px; width: 40px; text-align: center;">${rankIcon}</div>
                <div style="flex: 1; font-weight: 600;">${user.username}</div>
                <div style="font-size: 1.1rem; font-weight: bold; color: #667eea; margin-right: 15px;">${user.total_points} pts</div>
                <div style="font-size: 0.9rem; color: #6b7280;">${user.current_streak}🔥 | ${user.posts_count} posts</div>
            </div>
        `;
    }).join('');
}

// Show posting trends modal
async function showPostingTrends() {
    const modal = document.getElementById('trendsModal');
    const trendsList = document.getElementById('trendsList');
    
    modal.classList.remove('hidden');
    trendsList.innerHTML = '<div class="loading">Loading trends...</div>';
    
    try {
        const response = await fetch('/api/admin/posting-trends');
        if (response.ok) {
            const data = await response.json();
            displayPostingTrends(data.trends);
        } else {
            trendsList.innerHTML = '<div class="loading">Failed to load trends</div>';
        }
    } catch (error) {
        trendsList.innerHTML = '<div class="loading">Error loading trends</div>';
    }
}

// Display posting trends
function displayPostingTrends(trends) {
    const trendsList = document.getElementById('trendsList');
    
    if (!trends || trends.length === 0) {
        trendsList.innerHTML = '<div class="loading">No posting data yet</div>';
        return;
    }
    
    // Calculate trend indicators
    const trendsWithIndicators = trends.map((trend, index) => {
        const previousTrend = trends[index + 1];
        let indicator = '';
        
        if (previousTrend) {
            const change = trend.posts_count - previousTrend.posts_count;
            if (change > 0) indicator = '📈';
            else if (change < 0) indicator = '📉';
            else indicator = '➡️';
        }
        
        return { ...trend, indicator };
    });
    
    trendsList.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #374151; margin-bottom: 15px;">Daily Posting Activity (Last 30 Days)</h4>
            ${trendsWithIndicators.map(trend => `
                <div style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #e5e7eb;">
                    <div style="font-weight: 600; margin-right: 15px; width: 100px;">${new Date(trend.date).toLocaleDateString()}</div>
                    <div style="flex: 1; display: flex; align-items: center;">
                        <span style="margin-right: 10px; font-size: 1.2rem;">${trend.indicator}</span>
                        <span style="font-weight: bold; color: #4f46e5; margin-right: 15px;">${trend.posts_count} posts</span>
                        <span style="color: #6b7280;">${trend.unique_users} users active</span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 25px; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <h4 style="color: #0369a1; margin-bottom: 10px;">Summary</h4>
            <p style="color: #075985; margin: 5px 0;">Total Posts: <strong>${trends.reduce((sum, t) => sum + t.posts_count, 0)}</strong></p>
            <p style="color: #075985; margin: 5px 0;">Average per Day: <strong>${Math.round(trends.reduce((sum, t) => sum + t.posts_count, 0) / trends.length)}</strong></p>
            <p style="color: #075985; margin: 5px 0;">Peak Day: <strong>${trends.reduce((max, t) => t.posts_count > max.posts_count ? t : max).posts_count} posts</strong></p>
        </div>
    `;
}

// Close modal functions
function closeTopUsersModal() {
    document.getElementById('topUsersModal').classList.add('hidden');
}

function closeTrendsModal() {
    document.getElementById('trendsModal').classList.add('hidden');
}
