// Enhanced Dashboard with Performance Optimizations and New Features

// Global state management
const state = {
    posts: [],
    filteredPosts: [],
    postedPosts: [],
    selectedPosts: new Set(),
    isBulkMode: false,
    isLoading: false,
    searchQuery: '',
    filters: {
        status: '',
        author: ''
    },
    cache: new Map(),
    lastFetch: 0,
    realTimeConnected: true
};

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Cache management
const cache = {
    set(key, data, ttl = 300000) { // 5 minutes default TTL
        state.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    },
    
    get(key) {
        const cached = state.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            state.cache.delete(key);
            return null;
        }
        
        return cached.data;
    },
    
    clear() {
        state.cache.clear();
    }
};

// Performance monitoring
const performance = {
    start(operation) {
        console.time(operation);
    },
    
    end(operation) {
        console.timeEnd(operation);
    },
    
    async measure(operation, func) {
        this.start(operation);
        const result = await func();
        this.end(operation);
        return result;
    }
};

// Real-time updates with WebSocket simulation
const realTime = {
    indicator: null,
    
    init() {
        this.indicator = document.getElementById('realTimeIndicator');
        this.updateStatus(true);
        
        // Simulate real-time updates every 30 seconds
        setInterval(() => {
            this.checkForUpdates();
        }, 30000);
    },
    
    updateStatus(connected) {
        state.realTimeConnected = connected;
        if (this.indicator) {
            this.indicator.textContent = connected ? '⚡ Live' : '❌ Offline';
            this.indicator.classList.toggle('disconnected', !connected);
        }
    },
    
    async checkForUpdates() {
        try {
            const lastModified = new Date(state.lastFetch).toISOString();
            const response = await fetch(`/api/posts?since=${lastModified}`, {
                method: 'HEAD'
            });
            
            if (response.status === 200) {
                const newLastModified = response.headers.get('Last-Modified');
                if (newLastModified && new Date(newLastModified) > state.lastFetch) {
                    await loadPosts(true); // Refresh posts silently
                    showToast('New posts available!', 'info');
                }
            }
            
            this.updateStatus(true);
        } catch (error) {
            this.updateStatus(false);
            console.error('Real-time update check failed:', error);
        }
    }
};

// Enhanced loading states
const loading = {
    show(element, type = 'spinner') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        if (type === 'skeleton') {
            element.innerHTML = this.createSkeleton();
        } else {
            element.innerHTML = `<div class="loading"><span class="spinner"></span>Loading...</div>`;
        }
    },
    
    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.innerHTML = '';
        }
    },
    
    createSkeleton() {
        return Array(3).fill(0).map(() => 
            `<div class="skeleton skeleton-post"></div>`
        ).join('');
    },
    
    showProgress(percentage) {
        const existing = document.querySelector('.progress-bar');
        if (existing) existing.remove();
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = `<div class="progress-fill" style="width: ${percentage}%"></div>`;
        
        document.body.appendChild(progressBar);
        
        if (percentage >= 100) {
            setTimeout(() => progressBar.remove(), 1000);
        }
        
        return progressBar;
    }
};

// Enhanced API calls with caching and error handling
const api = {
    async request(url, options = {}) {
        const cacheKey = `${url}-${JSON.stringify(options)}`;
        
        // Check cache for GET requests
        if (!options.method || options.method === 'GET') {
            const cached = cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache successful GET requests
            if (!options.method || options.method === 'GET') {
                cache.set(cacheKey, data);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error: ${url}`, error);
            throw error;
        }
    },
    
    // Specific API methods
    async getPosts() {
        return this.request('/api/posts');
    },
    
    async getPostedStatus() {
        return this.request('/api/posts/status');
    },
    
    async getUserScore() {
        return this.request('/api/user/score');
    },
    
    async getLeaderboard(limit = 5) {
        return this.request(`/api/leaderboard?limit=${limit}`);
    },
    
    async schedulePost(postId, dateTime) {
        return this.request('/api/posts/schedule', {
            method: 'POST',
            body: JSON.stringify({ postId, dateTime })
        });
    },
    
    async getScheduledPosts() {
        return this.request('/api/posts/scheduled');
    },
    
    async getTokenInfo() {
        return this.request('/api/linkedin/token-info');
    }
};

// Enhanced search and filtering
const search = {
    input: null,
    
    init() {
        this.input = document.getElementById('searchInput');
        if (this.input) {
            this.input.addEventListener('input', debounce((e) => {
                state.searchQuery = e.target.value.toLowerCase();
                this.applyFilters();
            }, 300));
        }
        
        // Filter dropdowns
        const statusFilter = document.getElementById('filterStatus');
        const authorFilter = document.getElementById('filterAuthor');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                state.filters.status = e.target.value;
                this.applyFilters();
            });
        }
        
        if (authorFilter) {
            authorFilter.addEventListener('change', (e) => {
                state.filters.author = e.target.value;
                this.applyFilters();
            });
        }
    },
    
    applyFilters() {
        performance.start('filter-posts');
        
        state.filteredPosts = state.posts.filter(post => {
            // Text search
            if (state.searchQuery) {
                const searchableText = `${post.title} ${post.content} ${post.author}`.toLowerCase();
                if (!searchableText.includes(state.searchQuery)) {
                    return false;
                }
            }
            
            // Status filter
            if (state.filters.status) {
                const isPosted = state.postedPosts.includes(post.id);
                if (state.filters.status === 'posted' && !isPosted) return false;
                if (state.filters.status === 'available' && isPosted) return false;
            }
            
            // Author filter
            if (state.filters.author && post.author !== state.filters.author) {
                return false;
            }
            
            return true;
        });
        
        this.updateResultsInfo();
        displayPosts(state.filteredPosts);
        
        performance.end('filter-posts');
    },
    
    updateResultsInfo() {
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            const total = state.posts.length;
            const filtered = state.filteredPosts.length;
            
            if (total === filtered) {
                resultsInfo.textContent = `Showing all ${total} posts`;
            } else {
                resultsInfo.textContent = `Showing ${filtered} of ${total} posts`;
            }
        }
    },
    
    updateAuthorFilter() {
        const authorFilter = document.getElementById('filterAuthor');
        if (authorFilter) {
            const authors = [...new Set(state.posts.map(post => post.author))].sort();
            authorFilter.innerHTML = '<option value="">All Authors</option>' +
                authors.map(author => `<option value="${author}">${author}</option>`).join('');
        }
    }
};

// Bulk operations
const bulk = {
    init() {
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('post-checkbox')) {
                this.handleSelectionChange(e.target);
            }
        });
    },
    
    handleSelectionChange(checkbox) {
        const postId = parseInt(checkbox.value);
        
        if (checkbox.checked) {
            state.selectedPosts.add(postId);
        } else {
            state.selectedPosts.delete(postId);
        }
        
        this.updateSelectedCount();
    },
    
    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = state.selectedPosts.size;
        }
    },
    
    toggleMode() {
        state.isBulkMode = !state.isBulkMode;
        const bulkOps = document.getElementById('bulkOperations');
        const bulkBtn = document.getElementById('bulkModeBtn');
        
        if (state.isBulkMode) {
            bulkOps?.classList.add('visible');
            if (bulkBtn) bulkBtn.textContent = 'Exit Bulk Mode';
            displayPosts(state.filteredPosts); // Refresh to show checkboxes
        } else {
            bulkOps?.classList.remove('visible');
            if (bulkBtn) bulkBtn.textContent = 'Bulk Actions';
            state.selectedPosts.clear();
            displayPosts(state.filteredPosts); // Refresh to hide checkboxes
        }
    },
    
    async markAsPosted() {
        if (state.selectedPosts.size === 0) {
            showToast('No posts selected', 'error');
            return;
        }
        
        const selectedArray = Array.from(state.selectedPosts);
        const progressBar = loading.showProgress(0);
        
        try {
            for (let i = 0; i < selectedArray.length; i++) {
                await api.request(`/api/posts/${selectedArray[i]}/mark-posted`, {
                    method: 'POST'
                });
                
                loading.showProgress(((i + 1) / selectedArray.length) * 100);
            }
            
            showToast(`${selectedArray.length} posts marked as posted`, 'success');
            await loadPostedStatus();
            search.applyFilters();
            
        } catch (error) {
            showToast('Error marking posts as posted', 'error');
        }
    },
    
    async delete() {
        if (state.selectedPosts.size === 0) {
            showToast('No posts selected', 'error');
            return;
        }
        
        if (!confirm(`Delete ${state.selectedPosts.size} posts? This cannot be undone.`)) {
            return;
        }
        
        const selectedArray = Array.from(state.selectedPosts);
        
        try {
            for (const postId of selectedArray) {
                await api.request(`/api/posts/${postId}`, {
                    method: 'DELETE'
                });
            }
            
            showToast(`${selectedArray.length} posts deleted`, 'success');
            await loadPosts(true);
            
        } catch (error) {
            showToast('Error deleting posts', 'error');
        }
    },
    
    export() {
        if (state.selectedPosts.size === 0) {
            showToast('No posts selected', 'error');
            return;
        }
        
        const selectedPosts = state.posts.filter(post => 
            state.selectedPosts.has(post.id)
        );
        
        const csvContent = this.generateCSV(selectedPosts);
        this.downloadCSV(csvContent, 'selected-posts.csv');
        
        showToast(`${selectedPosts.length} posts exported`, 'success');
    },
    
    generateCSV(posts) {
        const headers = ['Title', 'Content', 'Author', 'Created At', 'Source URL'];
        const rows = posts.map(post => [
            post.title,
            post.content,
            post.author,
            new Date(post.created_at).toISOString(),
            post.source_url || ''
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            .join('\n');
    },
    
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.click();
        
        window.URL.revokeObjectURL(url);
    }
};

// Post scheduling
const scheduler = {
    init() {
        const dateInput = document.getElementById('scheduleDateTime');
        if (dateInput) {
            // Set minimum date to current time
            const now = new Date();
            now.setMinutes(now.getMinutes() + 15); // Minimum 15 minutes from now
            dateInput.min = now.toISOString().slice(0, 16);
        }
        
        this.loadScheduledPosts();
    },
    
    async schedulePost() {
        const dateTime = document.getElementById('scheduleDateTime').value;
        const postSelect = document.getElementById('schedulePostSelect');
        const postId = postSelect.value;
        
        if (!dateTime || !postId) {
            showToast('Please select a post and date/time', 'error');
            return;
        }
        
        try {
            await api.schedulePost(postId, dateTime);
            showToast('Post scheduled successfully!', 'success');
            
            // Reset form
            document.getElementById('scheduleDateTime').value = '';
            postSelect.value = '';
            
            this.loadScheduledPosts();
            
        } catch (error) {
            showToast('Error scheduling post', 'error');
        }
    },
    
    async loadScheduledPosts() {
        try {
            const data = await api.getScheduledPosts();
            this.displayScheduledPosts(data.scheduledPosts || []);
        } catch (error) {
            console.error('Error loading scheduled posts:', error);
        }
    },
    
    displayScheduledPosts(scheduledPosts) {
        const container = document.getElementById('scheduledPostsList');
        if (!container) return;
        
        if (scheduledPosts.length === 0) {
            container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No scheduled posts</p>';
            return;
        }
        
        container.innerHTML = scheduledPosts.map(item => `
            <div class="scheduled-post-item">
                <div class="schedule-info">
                    <div class="schedule-time">${new Date(item.scheduled_for).toLocaleString()}</div>
                    <div class="schedule-title">${item.title}</div>
                </div>
                <div class="schedule-actions">
                    <button onclick="scheduler.editSchedule(${item.id})" class="edit-schedule-btn">Edit</button>
                    <button onclick="scheduler.cancelSchedule(${item.id})" class="cancel-schedule-btn">Cancel</button>
                </div>
            </div>
        `).join('');
    },
    
    updatePostSelect() {
        const postSelect = document.getElementById('schedulePostSelect');
        if (postSelect && state.posts) {
            const availablePosts = state.posts.filter(post => 
                !state.postedPosts.includes(post.id)
            );
            
            postSelect.innerHTML = '<option value="">Select a post to schedule...</option>' +
                availablePosts.map(post => 
                    `<option value="${post.id}">${post.title}</option>`
                ).join('');
        }
    },
    
    async cancelSchedule(scheduleId) {
        if (!confirm('Cancel this scheduled post?')) return;
        
        try {
            await api.request(`/api/posts/scheduled/${scheduleId}`, {
                method: 'DELETE'
            });
            
            showToast('Scheduled post cancelled', 'success');
            this.loadScheduledPosts();
            
        } catch (error) {
            showToast('Error cancelling scheduled post', 'error');
        }
    }
};

// Token management
const tokenManager = {
    async init() {
        await this.loadTokenInfo();
        
        // Check token status every 5 minutes
        setInterval(() => {
            this.loadTokenInfo();
        }, 300000);
    },
    
    async loadTokenInfo() {
        try {
            const tokenInfo = await api.getTokenInfo();
            this.displayTokenInfo(tokenInfo);
        } catch (error) {
            this.displayTokenError();
        }
    },
    
    displayTokenInfo(tokenInfo) {
        const statusElement = document.getElementById('tokenStatus');
        const expiryElement = document.getElementById('tokenExpiry');
        const usageElement = document.getElementById('tokenUsage');
        const warningElement = document.getElementById('tokenWarning');
        const errorElement = document.getElementById('tokenError');
        
        if (statusElement) {
            statusElement.textContent = tokenInfo.connected ? 'Connected' : 'Disconnected';
            statusElement.style.color = tokenInfo.connected ? '#22c55e' : '#ef4444';
        }
        
        if (expiryElement && tokenInfo.expiresAt) {
            const expiryDate = new Date(tokenInfo.expiresAt);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            expiryElement.textContent = `${daysUntilExpiry} days`;
            
            // Show warnings based on expiry time
            if (daysUntilExpiry <= 0) {
                errorElement?.classList.remove('hidden');
                warningElement?.classList.add('hidden');
            } else if (daysUntilExpiry <= 7) {
                warningElement?.classList.remove('hidden');
                errorElement?.classList.add('hidden');
            } else {
                warningElement?.classList.add('hidden');
                errorElement?.classList.add('hidden');
            }
        }
        
        if (usageElement && tokenInfo.usage) {
            usageElement.textContent = `${tokenInfo.usage.used}/${tokenInfo.usage.limit}`;
        }
    },
    
    displayTokenError() {
        const statusElement = document.getElementById('tokenStatus');
        const errorElement = document.getElementById('tokenError');
        
        if (statusElement) {
            statusElement.textContent = 'Error';
            statusElement.style.color = '#ef4444';
        }
        
        errorElement?.classList.remove('hidden');
    },
    
    async refresh() {
        const spinner = document.getElementById('tokenSpinner');
        spinner?.classList.remove('hidden');
        
        try {
            await this.loadTokenInfo();
            showToast('Token info refreshed', 'success');
        } catch (error) {
            showToast('Error refreshing token info', 'error');
        } finally {
            spinner?.classList.add('hidden');
        }
    }
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

// Enhanced post display with virtual scrolling for large lists
function displayPosts(posts) {
    const container = document.getElementById('dashboardPosts');
    if (!container) return;
    
    // Clear loading skeletons
    container.innerHTML = '';
    
    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px; font-style: italic;">No posts found matching your criteria</p>';
        return;
    }
    
    // For very large lists, implement virtual scrolling
    if (posts.length > 100) {
        implementVirtualScrolling(container, posts);
        return;
    }
    
    // Regular rendering for smaller lists
    renderPosts(container, posts);
}

function renderPosts(container, posts) {
    const fragment = document.createDocumentFragment();
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        fragment.appendChild(postElement);
    });
    
    container.appendChild(fragment);
}

function createPostElement(post) {
    const isPosted = state.postedPosts.includes(post.id);
    const postDiv = document.createElement('div');
    
    postDiv.className = `dashboard-post ${isPosted ? 'posted' : ''} ${state.isBulkMode ? 'selectable' : ''}`;
    postDiv.setAttribute('data-post-id', post.id);
    
    if (!state.isBulkMode) {
        postDiv.onclick = () => openModal(post);
    }
    
    const createdDate = new Date(post.created_at).toLocaleDateString();
    
    postDiv.innerHTML = `
        ${state.isBulkMode ? `<input type="checkbox" class="post-checkbox" value="${post.id}">` : ''}
        <h3>${post.title}</h3>
        <p>${post.content}</p>
        <div class="post-meta">
            <small>By: ${post.author} • ${createdDate}${post.source_url ? ` • <a href="${post.source_url}" target="_blank" onclick="event.stopPropagation()">Read original</a>` : ''}</small>
            ${isPosted ? '<div class="posted-badge">✓ Posted</div>' : ''}
        </div>
        ${!state.isBulkMode ? `
            <div class="post-actions">
                <button class="post-action-btn" onclick="event.stopPropagation(); copyPostContent('${post.content.replace(/'/g, "\\'")}')">📋 Copy</button>
                <button class="post-action-btn" onclick="event.stopPropagation(); openModal(${JSON.stringify(post).replace(/"/g, '&quot;')})">👁️ View</button>
                ${!isPosted ? `<button class="post-action-btn" onclick="event.stopPropagation(); quickMarkAsPosted(${post.id})">✅ Mark Posted</button>` : ''}
            </div>
        ` : ''}
    `;
    
    return postDiv;
}

// Virtual scrolling implementation for large lists
function implementVirtualScrolling(container, posts) {
    const itemHeight = 120; // Approximate height of each post
    const containerHeight = 600; // Visible container height
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const buffer = 5; // Extra items to render for smooth scrolling
    
    let scrollTop = 0;
    let startIndex = 0;
    let endIndex = Math.min(posts.length, visibleItems + buffer);
    
    container.style.height = `${containerHeight}px`;
    container.style.overflowY = 'auto';
    
    const scrollableContent = document.createElement('div');
    scrollableContent.style.height = `${posts.length * itemHeight}px`;
    scrollableContent.style.position = 'relative';
    
    const visibleContent = document.createElement('div');
    visibleContent.style.position = 'absolute';
    visibleContent.style.top = '0';
    visibleContent.style.width = '100%';
    
    function renderVisibleItems() {
        visibleContent.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        for (let i = startIndex; i < endIndex; i++) {
            if (i >= posts.length) break;
            
            const postElement = createPostElement(posts[i]);
            postElement.style.position = 'absolute';
            postElement.style.top = `${i * itemHeight}px`;
            postElement.style.width = '100%';
            
            fragment.appendChild(postElement);
        }
        
        visibleContent.appendChild(fragment);
    }
    
    container.addEventListener('scroll', debounce(() => {
        scrollTop = container.scrollTop;
        const newStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const newEndIndex = Math.min(posts.length, newStartIndex + visibleItems + buffer * 2);
        
        if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
            startIndex = newStartIndex;
            endIndex = newEndIndex;
            renderVisibleItems();
        }
    }, 16)); // 60fps
    
    scrollableContent.appendChild(visibleContent);
    container.appendChild(scrollableContent);
    
    renderVisibleItems();
}

// Enhanced data loading with progressive enhancement
async function loadPosts(forceRefresh = false) {
    if (state.isLoading && !forceRefresh) return;
    
    state.isLoading = true;
    
    if (!forceRefresh) {
        loading.show('dashboardPosts', 'skeleton');
    }
    
    try {
        const data = await performance.measure('load-posts', async () => {
            return await api.getPosts();
        });
        
        state.posts = data;
        state.lastFetch = Date.now();
        
        // Update various UI components
        search.updateAuthorFilter();
        scheduler.updatePostSelect();
        
        // Apply current filters
        search.applyFilters();
        
        if (!forceRefresh) {
            showToast('Posts loaded successfully', 'success', 2000);
        }
        
    } catch (error) {
        console.error('Error loading posts:', error);
        
        const container = document.getElementById('dashboardPosts');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <p>❌ Failed to load posts</p>
                    <button onclick="loadPosts(true)" style="margin-top: 10px; padding: 8px 16px; background: #ea580c; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
        
        showToast('Failed to load posts. Please try again.', 'error');
        
    } finally {
        state.isLoading = false;
    }
}

async function loadPostedStatus() {
    try {
        const data = await api.getPostedStatus();
        state.postedPosts = data.postedPosts || [];
        
        // Refresh display if posts are already loaded
        if (state.posts.length > 0) {
            search.applyFilters();
        }
        
    } catch (error) {
        console.error('Error loading posted status:', error);
    }
}

// Quick actions
async function copyPostContent(content) {
    try {
        await navigator.clipboard.writeText(content);
        showToast('Content copied to clipboard!', 'success', 2000);
    } catch (error) {
        showToast('Failed to copy to clipboard', 'error');
    }
}

async function quickMarkAsPosted(postId) {
    try {
        await api.request(`/api/posts/${postId}/mark-posted`, {
            method: 'POST'
        });
        
        showToast('Post marked as posted!', 'success', 2000);
        state.postedPosts.push(postId);
        search.applyFilters();
        
    } catch (error) {
        showToast('Failed to mark as posted', 'error');
    }
}

// Global functions for HTML onclick handlers
window.clearAllFilters = function() {
    state.searchQuery = '';
    state.filters = { status: '', author: '' };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterAuthor').value = '';
    
    search.applyFilters();
};

window.toggleBulkMode = function() {
    bulk.toggleMode();
};

window.exitBulkMode = function() {
    if (state.isBulkMode) {
        bulk.toggleMode();
    }
};

window.bulkMarkAsPosted = function() {
    bulk.markAsPosted();
};

window.bulkDelete = function() {
    bulk.delete();
};

window.exportSelected = function() {
    bulk.export();
};

window.schedulePost = function() {
    scheduler.schedulePost();
};

window.refreshTokenInfo = function() {
    tokenManager.refresh();
};

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Dashboard initializing...');
    
    // Initialize all modules
    realTime.init();
    search.init();
    bulk.init();
    scheduler.init();
    tokenManager.init();
    
    // Load initial data with progress indicators
    const initPromises = [
        loadPosts(),
        loadPostedStatus(),
        loadUserScore(),
        loadLeaderboard()
    ];
    
    Promise.all(initPromises).then(() => {
        console.log('✅ Dashboard fully initialized');
        showToast('Dashboard ready!', 'success', 2000);
    }).catch(error => {
        console.error('❌ Dashboard initialization failed:', error);
        showToast('Some features may not work properly', 'warning');
    });
    
    // Add quick post form handler
    const quickPostForm = document.getElementById('quickPostForm');
    if (quickPostForm) {
        quickPostForm.addEventListener('submit', handleQuickPost);
    }
    
    // Check admin status
    checkAdminStatus();
    checkLinkedInStatus();
    loadPersonalizationTemplates();
    
    console.log('📊 Performance monitoring enabled');
    console.log('🔄 Real-time updates enabled');
    console.log('💾 Caching enabled');
});

// Export performance metrics for debugging
window.dashboardMetrics = {
    state,
    cache,
    performance
};
