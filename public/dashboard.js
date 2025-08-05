// DOM elements
const dashboardPosts = document.getElementById('dashboardPosts');
const postModal = document.getElementById('postModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const modalImage = document.getElementById('modalImage');
const linkedinLink = document.getElementById('linkedinLink');

// Enhanced Global State Management
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

// Legacy variables for compatibility
let currentPost = null;
let linkedinConnected = false;
let postedPosts = [];
let personalizedVersion = null;
let isShowingPersonalized = false;

// Enhanced Utilities
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
            const spinner = '<span class="spinner"></span>';
            element.innerHTML = `<div class="loading">${spinner}Loading...</div>`;
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

// Enhanced API calls with caching
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

// Real-time updates
const realTime = {
    indicator: null,
    
    init() {
        this.indicator = document.getElementById('realTimeIndicator');
        this.updateStatus(true);
        
        // Check for updates every 30 seconds
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
            // Simple check - compare post count or timestamps
            const response = await fetch('/api/posts');
            if (response.ok) {
                const data = await response.json();
                if (data.length !== state.posts.length) {
                    await loadPosts(true);
                    showToast('New posts available!', 'info', 2000);
                }
            }
            this.updateStatus(true);
        } catch (error) {
            this.updateStatus(false);
        }
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
        const posts = state.posts.length > 0 ? state.posts : [];
        
        state.filteredPosts = posts.filter(post => {
            // Text search
            if (state.searchQuery) {
                const searchableText = `${post.title} ${post.content} ${post.author}`.toLowerCase();
                if (!searchableText.includes(state.searchQuery)) {
                    return false;
                }
            }
            
            // Status filter
            if (state.filters.status) {
                const isPosted = postedPosts.includes(post.id);
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
        if (authorFilter && state.posts.length > 0) {
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
        } else {
            bulkOps?.classList.remove('visible');
            if (bulkBtn) bulkBtn.textContent = 'Bulk Actions';
            state.selectedPosts.clear();
        }
        
        // Refresh display
        if (state.filteredPosts.length > 0) {
            displayPosts(state.filteredPosts);
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
            const response = await fetch('/api/linkedin/token-info');
            if (response.ok) {
                const tokenInfo = await response.json();
                this.displayTokenInfo(tokenInfo);
            } else {
                this.displayTokenError();
            }
        } catch (error) {
            this.displayTokenError();
        }
    },
    
    displayTokenInfo(tokenInfo) {
        const statusElement = document.querySelector('#tokenStatus .token-stat-value');
        const expiryElement = document.querySelector('#tokenExpiry');
        const usageElement = document.querySelector('#tokenUsage');
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
        const statusElement = document.querySelector('#tokenStatus .token-stat-value');
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
        postedPosts.push(postId);
        search.applyFilters();
        
    } catch (error) {
        showToast('Failed to mark as posted', 'error');
    }
}

// Global functions for HTML onclick handlers
window.clearAllFilters = function() {
    state.searchQuery = '';
    state.filters = { status: '', author: '' };
    
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const filterAuthor = document.getElementById('filterAuthor');
    
    if (searchInput) searchInput.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterAuthor) filterAuthor.value = '';
    
    search.applyFilters();
};

window.toggleBulkMode = function() {
    bulk.toggleMode();
};

window.bulkMarkAsPosted = function() {
    bulk.markAsPosted();
};

window.refreshTokenInfo = function() {
    tokenManager.refresh();
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Dashboard initializing...');
    
    // Initialize new modules
    realTime.init();
    search.init();
    bulk.init();
    tokenManager.init();
    
    // Load existing data
    loadPosts();
    checkAdminStatus();
    checkLinkedInStatus();
    loadPostedStatus();
    loadPersonalizationTemplates();
    loadUserScore();
    loadLeaderboard();
    
    // Add quick post form handler
    document.getElementById('quickPostForm').addEventListener('submit', handleQuickPost);
    
    console.log('✅ Dashboard enhanced features loaded');
});

// Enhanced load and display posts
async function loadPosts(forceRefresh = false) {
    if (state.isLoading && !forceRefresh) return;
    
    state.isLoading = true;
    
    if (!forceRefresh) {
        loading.show('dashboardPosts', 'skeleton');
    }
    
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        if (response.ok) {
            state.posts = posts;
            state.lastFetch = Date.now();
            
            // Update various UI components
            search.updateAuthorFilter();
            
            // Apply current filters
            search.applyFilters();
            
            if (!forceRefresh) {
                showToast('Posts loaded successfully', 'success', 2000);
            }
        } else {
            showToast('Error loading posts', 'error');
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

function displayPosts(posts) {
    const container = document.getElementById('dashboardPosts');
    if (!container) return;
    
    // Clear loading skeletons
    container.innerHTML = '';
    
    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px; font-style: italic;">No posts found matching your criteria</p>';
        return;
    }
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        fragment.appendChild(postElement);
    });
    
    container.appendChild(fragment);
}

function createPostElement(post) {
    const isPosted = postedPosts.includes(post.id);
    const postDiv = document.createElement('div');
    
    postDiv.className = `dashboard-post ${isPosted ? 'posted' : ''} ${state.isBulkMode ? 'selectable' : ''}`;
    postDiv.setAttribute('data-post-id', post.id);
    
    if (!state.isBulkMode) {
        postDiv.onclick = () => {
            console.log('Post clicked:', post.title);
            openModal(post);
        };
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
                <button class="post-action-btn" onclick="event.stopPropagation(); openModal(findPostById(${post.id}))">👁️ View</button>
                ${!isPosted ? `<button class="post-action-btn" onclick="event.stopPropagation(); quickMarkAsPosted(${post.id})">✅ Mark Posted</button>` : ''}
            </div>
        ` : ''}
    `;
    
    return postDiv;
}

// Helper function to find post by ID
function findPostById(id) {
    return state.posts.find(post => post.id === id);
}

function openModal(post) {
    console.log('openModal called with post:', post);
    currentPost = post;
    
    modalTitle.textContent = post.title;
    modalContent.innerHTML = `
        <p>${post.content}</p>
        ${post.source_url ? `<p class="source-link"><a href="${post.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
    `;
    
    if (post.image_url) {
        modalImage.innerHTML = `<img src="${post.image_url}" alt="Post image" style="max-width: 100%; margin: 10px 0;">`;
    } else {
        modalImage.innerHTML = '';
    }
    
    // Update LinkedIn link
    const linkedinText = encodeURIComponent(post.content);
    linkedinLink.href = `https://www.linkedin.com/sharing/share-offsite/?url=&text=${linkedinText}`;
    
    // Update LinkedIn UI
    updateLinkedInUI();
    
    // Update posted status button
    updatePostedStatusUI();
    
    console.log('About to show modal');
    postModal.classList.remove('hidden');
    console.log('Modal classes after showing:', postModal.className);
}

function closeModal() {
    postModal.classList.add('hidden');
    currentPost = null;
    personalizedVersion = null;
    isShowingPersonalized = false;
    
    // Reset personalization UI
    document.getElementById('personalizationForm').classList.add('hidden');
    document.getElementById('personalizedContent').classList.add('hidden');
    document.getElementById('personalizeBtn').classList.remove('hidden');
    document.getElementById('postTypeIndicator').textContent = '📰 Original Post';
}

function copyToClipboard() {
    if (currentPost) {
        const contentToCopy = isShowingPersonalized ? personalizedVersion : currentPost.content;
        navigator.clipboard.writeText(contentToCopy).then(() => {
            showMessage('Post content copied to clipboard!', 'success');
        }).catch(err => {
            showMessage('Failed to copy to clipboard', 'error');
        });
    }
}

async function markAsUsed() {
    if (!currentPost) return;
    
    try {
        const response = await fetch(`/api/posts/${currentPost.id}/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Post marked as used!', 'success');
            closeModal();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function checkAdminStatus() {
    // This would normally check the user's role
    // For now, we'll just show the admin button
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.classList.remove('hidden');
    }
}

// Navigation functions
function goHome() {
    window.location.href = '/';
}

function goToAdmin() {
    window.location.href = '/admin';
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        showMessage('Error logging out', 'error');
    }
}

// LinkedIn functionality
async function checkLinkedInStatus() {
    try {
        const response = await fetch('/api/linkedin/status');
        const data = await response.json();
        
        if (response.ok) {
            linkedinConnected = data.connected;
            updateLinkedInUI();
        } else {
            linkedinConnected = false;
            updateLinkedInUI();
        }
    } catch (error) {
        console.error('Error checking LinkedIn status:', error);
        linkedinConnected = false;
        updateLinkedInUI();
    }
}

function updateLinkedInUI() {
    const statusText = document.getElementById('linkedinStatusText');
    const connectBtn = document.getElementById('connectLinkedInBtn');
    const postBtn = document.getElementById('linkedinPostBtn');
    
    if (linkedinConnected) {
        statusText.textContent = 'LinkedIn connected ✓';
        statusText.style.color = '#4CAF50';
        connectBtn.classList.add('hidden');
        postBtn.classList.remove('hidden');
    } else {
        statusText.textContent = 'LinkedIn not connected';
        statusText.style.color = '#f44336';
        connectBtn.classList.remove('hidden');
        postBtn.classList.add('hidden');
    }
}

function connectLinkedIn() {
    window.location.href = '/auth/linkedin';
}

async function postToLinkedIn() {
    if (!currentPost) return;
    
    if (!linkedinConnected) {
        showMessage('Please connect your LinkedIn account first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${currentPost.id}/linkedin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Successfully posted to LinkedIn!', 'success');
            postedPosts.push(currentPost.id);
            updatePostedStatusUI();
            loadPosts(); // Refresh posts display
            closeModal();
        } else {
            showMessage(data.error || 'Failed to post to LinkedIn', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Handle quick post creation
async function handleQuickPost(e) {
    e.preventDefault();
    
    const title = document.getElementById('quickTitle').value;
    const content = document.getElementById('quickContent').value;
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                content: content
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Post created successfully!', 'success');
            document.getElementById('quickPostForm').reset();
            loadPosts(); // Refresh posts list
        } else {
            showMessage(data.error || 'Failed to create post', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Load posted status for current user
async function loadPostedStatus() {
    try {
        const response = await fetch('/api/posts/status');
        const data = await response.json();
        
        if (response.ok) {
            postedPosts = data.postedPosts || [];
            state.postedPosts = postedPosts; // Update state as well
            
            // Refresh display if posts are already loaded
            if (state.posts.length > 0) {
                search.applyFilters();
            }
        }
    } catch (error) {
        console.error('Error loading posted status:', error);
    }
}

// Update posted status UI in modal
function updatePostedStatusUI() {
    const markPostedBtn = document.getElementById('markPostedBtn');
    
    if (currentPost && postedPosts.includes(currentPost.id)) {
        markPostedBtn.textContent = '✓ Already Posted';
        markPostedBtn.disabled = true;
        markPostedBtn.style.backgroundColor = '#4CAF50';
    } else {
        markPostedBtn.textContent = 'Mark as Posted';
        markPostedBtn.disabled = false;
        markPostedBtn.style.backgroundColor = '#FF9800';
    }
}

// Mark post as posted
async function markAsPosted() {
    if (!currentPost) return;
    
    try {
        const response = await fetch(`/api/posts/${currentPost.id}/mark-posted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Post marked as posted!', 'success');
            postedPosts.push(currentPost.id);
            updatePostedStatusUI();
            loadPosts(); // Refresh posts display
        } else {
            showMessage(data.error || 'Failed to mark as posted', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Load personalization templates
async function loadPersonalizationTemplates() {
    try {
        const response = await fetch('/api/personalization/templates');
        const data = await response.json();
        
        if (response.ok) {
            const templateSelect = document.getElementById('templateSelect');
            templateSelect.innerHTML = '<option value="">Select a template...</option>';
            
            data.templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                templateSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Template Personalization functions
function personalizePost() {
    document.getElementById('personalizeBtn').classList.add('hidden');
    document.getElementById('personalizationForm').classList.remove('hidden');
}

function cancelPersonalization() {
    document.getElementById('personalizeBtn').classList.remove('hidden');
    document.getElementById('personalizationForm').classList.add('hidden');
    document.getElementById('templateSelect').value = '';
}

async function generatePersonalization() {
    if (!currentPost) return;
    
    const template = document.getElementById('templateSelect').value;
    if (!template) {
        showMessage('Please select a template first', 'error');
        return;
    }
    
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.textContent;
    
    generateBtn.textContent = 'Applying...';
    generateBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/posts/${currentPost.id}/personalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                template: template
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            personalizedVersion = data.personalizedContent;
            showPersonalizedVersion();
            showMessage('Template applied successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to apply template', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        generateBtn.textContent = originalText;
        generateBtn.disabled = false;
    }
}

function showPersonalizedVersion() {
    // Hide original form
    document.getElementById('personalizationForm').classList.add('hidden');
    
    // Show personalized content
    document.getElementById('personalizedContent').classList.remove('hidden');
    document.getElementById('personalizedText').value = personalizedVersion;
    
    // Update modal content to show personalized version
    document.getElementById('modalContent').innerHTML = `
        <p>${personalizedVersion}</p>
        ${currentPost.source_url ? `<p class="source-link"><a href="${currentPost.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
    `;
    document.getElementById('postTypeIndicator').textContent = '✨ Personalized Version';
    
    isShowingPersonalized = true;
}

function usePersonalized() {
    personalizedVersion = document.getElementById('personalizedText').value;
    showMessage('Using personalized version!', 'success');
    // Update the display
    document.getElementById('modalContent').innerHTML = `
        <p>${personalizedVersion}</p>
        ${currentPost.source_url ? `<p class="source-link"><a href="${currentPost.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
    `;
}

function backToOriginal() {
    // Show original content
    document.getElementById('modalContent').innerHTML = `
        <p>${currentPost.content}</p>
        ${currentPost.source_url ? `<p class="source-link"><a href="${currentPost.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
    `;
    document.getElementById('postTypeIndicator').textContent = '📰 Original Post';
    
    // Hide personalized content, show personalize button
    document.getElementById('personalizedContent').classList.add('hidden');
    document.getElementById('personalizeBtn').classList.remove('hidden');
    document.getElementById('templateSelect').value = '';
    
    isShowingPersonalized = false;
    personalizedVersion = null;
}

function refinePost() {
    showMessage('Try a different template for more options!', 'info');
}

function tryDifferentTemplate() {
    // Hide personalized content and show template selection again
    document.getElementById('personalizedContent').classList.add('hidden');
    document.getElementById('personalizationForm').classList.remove('hidden');
    document.getElementById('personalizeBtn').classList.add('hidden');
    
    // Reset template selection
    document.getElementById('templateSelect').value = '';
    
    // Reset to showing original content
    document.getElementById('modalContent').innerHTML = `
        <p>${currentPost.content}</p>
        ${currentPost.source_url ? `<p class="source-link"><a href="${currentPost.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
    `;
    document.getElementById('postTypeIndicator').textContent = '📰 Original Post';
    
    isShowingPersonalized = false;
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === postModal) {
        closeModal();
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
        ${type === 'success' ? 'background-color: #4CAF50;' : type === 'info' ? 'background-color: #2196F3;' : 'background-color: #f44336;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// AI Post Generation Functions
async function generateAIPost(content, style = 'professional') {
    const generateBtn = document.getElementById('aiGenerateBtn');
    if (generateBtn) {
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
    }
    
    try {
        const response = await fetch('/api/posts/generate-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                style: style
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAIGeneratedContent(data.generatedContent, style);
            showMessage('AI post generated successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to generate AI post', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        if (generateBtn) {
            generateBtn.textContent = '🤖 Generate AI Version';
            generateBtn.disabled = false;
        }
    }
}

function showAIForm() {
    if (!currentPost) return;
    
    const aiForm = document.getElementById('aiForm');
    if (aiForm) {
        aiForm.classList.remove('hidden');
    }
}

function hideAIForm() {
    const aiForm = document.getElementById('aiForm');
    if (aiForm) {
        aiForm.classList.add('hidden');
    }
}

function showAIGeneratedContent(content, style) {
    const aiContent = document.getElementById('aiGeneratedContent');
    const aiContentText = document.getElementById('aiContentText');
    const aiStyleUsed = document.getElementById('aiStyleUsed');
    
    if (aiContentText) aiContentText.textContent = content;
    if (aiStyleUsed) aiStyleUsed.textContent = style;
    if (aiContent) aiContent.classList.remove('hidden');
    
    // Update modal indicator
    document.getElementById('postTypeIndicator').textContent = '🤖 AI Generated Post';
    
    // Store AI version for copying
    window.aiGeneratedVersion = content;
}

function useAIVersion() {
    if (window.aiGeneratedVersion) {
        // Replace the current post content display with AI version
        modalContent.innerHTML = `
            <p>${window.aiGeneratedVersion}</p>
            ${currentPost.source_url ? `<p class="source-link"><a href="${currentPost.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
        `;
        
        hideAIForm();
        document.getElementById('aiGeneratedContent').classList.add('hidden');
        showMessage('Now showing AI version', 'success');
    }
}

function copyAIContent() {
    if (window.aiGeneratedVersion) {
        navigator.clipboard.writeText(window.aiGeneratedVersion).then(() => {
            showMessage('AI content copied to clipboard!', 'success');
        }).catch(err => {
            showMessage('Failed to copy to clipboard', 'error');
        });
    }
}

// Custom AI Modification Functions
function showCustomAIForm() {
    if (!currentPost) return;
    
    const customForm = document.getElementById('customAIForm');
    if (customForm) {
        customForm.classList.remove('hidden');
    }
}

function hideCustomAIForm() {
    const customForm = document.getElementById('customAIForm');
    if (customForm) {
        customForm.classList.add('hidden');
    }
    // Clear the input
    const instructionInput = document.getElementById('aiInstruction');
    if (instructionInput) {
        instructionInput.value = '';
    }
}

async function modifyWithCustomAI() {
    const instruction = document.getElementById('aiInstruction').value.trim();
    if (!instruction) {
        showMessage('Please enter an instruction for how to modify the post', 'error');
        return;
    }

    const currentContent = isShowingPersonalized ? personalizedVersion : 
                          window.aiGeneratedVersion ? window.aiGeneratedVersion : 
                          currentPost.content;

    const modifyBtn = document.getElementById('customAIModifyBtn');
    const originalText = modifyBtn.textContent;
    
    modifyBtn.textContent = 'Modifying...';
    modifyBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/posts/${currentPost.id}/modify-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instruction: instruction,
                currentContent: currentContent
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showCustomAIResult(data.modifiedContent, instruction);
            showMessage('Post modified successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to modify post', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        modifyBtn.textContent = originalText;
        modifyBtn.disabled = false;
    }
}

function showCustomAIResult(content, instruction) {
    const resultDiv = document.getElementById('customAIResult');
    const resultText = document.getElementById('customAIResultText');
    const resultInstruction = document.getElementById('customAIResultInstruction');
    
    if (resultText) resultText.textContent = content;
    if (resultInstruction) resultInstruction.textContent = instruction;
    if (resultDiv) resultDiv.classList.remove('hidden');
    
    // Update modal indicator
    document.getElementById('postTypeIndicator').textContent = '🎯 Custom AI Modified';
    
    // Store custom AI version
    window.customAIVersion = content;
    
    // Hide the form
    hideCustomAIForm();
}

function useCustomAIVersion() {
    if (window.customAIVersion) {
        // Replace the current post content display with custom AI version
        modalContent.innerHTML = `
            <p>${window.customAIVersion}</p>
            ${currentPost.source_url ? `<p class="source-link"><a href="${currentPost.source_url}" target="_blank">📰 Read original article</a></p>` : ''}
        `;
        
        document.getElementById('customAIResult').classList.add('hidden');
        showMessage('Now showing custom AI version', 'success');
    }
}

function copyCustomAIContent() {
    if (window.customAIVersion) {
        navigator.clipboard.writeText(window.customAIVersion).then(() => {
            showMessage('Custom AI content copied to clipboard!', 'success');
        }).catch(err => {
            showMessage('Failed to copy to clipboard', 'error');
        });
    }
}

// Quick suggestions for AI modifications
function fillAIInstruction(suggestion) {
    const instructionInput = document.getElementById('aiInstruction');
    if (instructionInput) {
        instructionInput.value = suggestion;
    }
}

// SCORING SYSTEM FUNCTIONS

// Load user's score and ranking
async function loadUserScore() {
    try {
        const response = await fetch('/api/user/score');
        if (response.ok) {
            const data = await response.json();
            updateScoreDisplay(data);
        } else {
            console.error('Failed to load user score');
        }
    } catch (error) {
        console.error('Error loading user score:', error);
    }
}

// Update score display in UI
function updateScoreDisplay(scoreData) {
    document.getElementById('userPoints').textContent = scoreData.totalPoints || 0;
    document.getElementById('userRank').textContent = `#${scoreData.rank || 1}`;
    document.getElementById('userStreak').textContent = scoreData.currentStreak || 0;
    document.getElementById('userPosts').textContent = scoreData.postsCount || 0;
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard?limit=5');
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.leaderboard);
        } else {
            console.error('Failed to load leaderboard');
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Display leaderboard in UI
function displayLeaderboard(leaderboard) {
    const leaderboardElement = document.getElementById('leaderboard');
    
    if (!leaderboard || leaderboard.length === 0) {
        leaderboardElement.innerHTML = '<div class="loading">No users yet</div>';
        return;
    }
    
    leaderboardElement.innerHTML = leaderboard.map((user, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1);
        
        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">${rankIcon}</div>
                <div class="leaderboard-user">${user.username}</div>
                <div class="leaderboard-points">${user.total_points} pts</div>
                <div class="leaderboard-streak">${user.current_streak}🔥</div>
            </div>
        `;
    }).join('');
}

// Show achievements modal
async function showAchievements() {
    const modal = document.getElementById('achievementsModal');
    const achievementsList = document.getElementById('achievementsList');
    
    modal.classList.remove('hidden');
    achievementsList.innerHTML = '<div class="loading">Loading achievements...</div>';
    
    try {
        const response = await fetch('/api/user/achievements');
        if (response.ok) {
            const data = await response.json();
            displayAchievements(data.achievements);
        } else {
            achievementsList.innerHTML = '<div class="loading">Failed to load achievements</div>';
        }
    } catch (error) {
        achievementsList.innerHTML = '<div class="loading">Error loading achievements</div>';
    }
}

// Display achievements
function displayAchievements(achievements) {
    const achievementsList = document.getElementById('achievementsList');
    
    if (!achievements || achievements.length === 0) {
        achievementsList.innerHTML = '<div class="loading">No achievements yet. Keep posting to earn your first achievement!</div>';
        return;
    }
    
    const achievementIcons = {
        'FIRST_POST': '🎉',
        'STREAK_3': '🔥',
        'STREAK_7': '🌟',
        'STREAK_30': '👑',
        'POSTS_10': '📝',
        'POSTS_50': '📚',
        'POSTS_100': '💯',
        'WEEKLY_5': '⚡'
    };
    
    achievementsList.innerHTML = achievements.map(achievement => `
        <div class="achievement-item">
            <div class="achievement-icon">${achievementIcons[achievement.achievement_type] || '🏅'}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.achievement_name}</div>
                <div class="achievement-description">${achievement.achievement_description}</div>
                <div class="achievement-points">+${achievement.points_awarded} points</div>
                <div class="achievement-date">Earned: ${new Date(achievement.earned_at).toLocaleDateString()}</div>
            </div>
        </div>
    `).join('');
}

// Show full leaderboard modal
async function showFullLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const fullLeaderboard = document.getElementById('fullLeaderboard');
    
    modal.classList.remove('hidden');
    fullLeaderboard.innerHTML = '<div class="loading">Loading full leaderboard...</div>';
    
    try {
        const response = await fetch('/api/leaderboard?limit=50');
        if (response.ok) {
            const data = await response.json();
            displayFullLeaderboard(data.leaderboard);
        } else {
            fullLeaderboard.innerHTML = '<div class="loading">Failed to load leaderboard</div>';
        }
    } catch (error) {
        fullLeaderboard.innerHTML = '<div class="loading">Error loading leaderboard</div>';
    }
}

// Display full leaderboard
function displayFullLeaderboard(leaderboard) {
    const fullLeaderboard = document.getElementById('fullLeaderboard');
    
    if (!leaderboard || leaderboard.length === 0) {
        fullLeaderboard.innerHTML = '<div class="loading">No users yet</div>';
        return;
    }
    
    fullLeaderboard.innerHTML = leaderboard.map((user, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1);
        
        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">${rankIcon}</div>
                <div class="leaderboard-user">${user.username}</div>
                <div class="leaderboard-points">${user.total_points} pts</div>
                <div class="leaderboard-streak">${user.current_streak}🔥 (best: ${user.best_streak})</div>
                <div class="leaderboard-posts">${user.posts_count} posts</div>
            </div>
        `;
    }).join('');
}

// Show point notification
function showPointNotification(pointData) {
    const notification = document.getElementById('pointNotification');
    const pointsEarned = document.getElementById('pointsEarned');
    const pointsBreakdown = document.getElementById('pointsBreakdown');
    const newAchievements = document.getElementById('newAchievements');
    
    pointsEarned.textContent = `+${pointData.pointsAwarded} points`;
    pointsBreakdown.innerHTML = pointData.breakdown ? pointData.breakdown.join('<br>') : '';
    
    if (pointData.newAchievements && pointData.newAchievements.length > 0) {
        newAchievements.innerHTML = `🏅 New Achievement${pointData.newAchievements.length > 1 ? 's' : ''}: ${pointData.newAchievements.join(', ')}`;
        newAchievements.style.display = 'block';
    } else {
        newAchievements.style.display = 'none';
    }
    
    notification.classList.remove('hidden');
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 5000);
    
    // Refresh user score and leaderboard
    setTimeout(() => {
        loadUserScore();
        loadLeaderboard();
    }, 1000);
}

// Close modals
function closeAchievementsModal() {
    document.getElementById('achievementsModal').classList.add('hidden');
}

function closeLeaderboardModal() {
    document.getElementById('leaderboardModal').classList.add('hidden');
}

// Override the existing markAsPosted function to include scoring
const originalMarkAsPosted = window.markAsPosted;
window.markAsPosted = async function() {
    if (!currentPost) return;
    
    try {
        const response = await fetch(`/api/posts/${currentPost.id}/mark-posted`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Post marked as posted successfully!', 'success');
            
            // Show scoring notification if available
            if (result.scoring) {
                showPointNotification(result.scoring);
            }
            
            // Refresh posted status
            loadPostedStatus();
            
            // Update UI
            const postElement = document.querySelector(`[data-post-id="${currentPost.id}"]`);
            if (postElement) {
                postElement.classList.add('posted');
            }
            
            closeModal();
        } else {
            showMessage(result.error || 'Failed to mark as posted', 'error');
        }
    } catch (error) {
        showMessage('Network error', 'error');
    }
};
