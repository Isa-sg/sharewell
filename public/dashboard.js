// Dashboard specific functionality
let currentPage = 1;
let totalPages = 1;
let currentPosts = [];

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded, initializing...');
    loadDashboardData();
    setupEventListeners();
    setupNavigationButtons();
});

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchPosts');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Sort functionality
    const sortSelect = document.getElementById('sortPosts');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }
}

function setupNavigationButtons() {
    // Home button
    const homeBtn = document.getElementById('dashboardHomeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dashboard Home button clicked');
            window.location.href = '/';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('dashboardLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dashboard Logout button clicked');
            handleLogout();
        });
    }
}

function setupPostButtonListeners() {
    const postsGrid = document.getElementById('postsGrid');
    if (!postsGrid) return;
    
    // Use event delegation to handle dynamically created buttons and post clicks
    postsGrid.addEventListener('click', function(e) {
        const postId = e.target.getAttribute('data-post-id');
        
        if (e.target.classList.contains('use-post-btn')) {
            e.preventDefault();
            if (postId) markPostAsUsed(parseInt(postId));
        } else if (e.target.classList.contains('linkedin-btn')) {
            e.preventDefault();
            if (postId) postToLinkedIn(parseInt(postId));
        } else if (e.target.classList.contains('post-card') || e.target.closest('.post-card')) {
            // Handle post card clicks (but not button clicks)
            if (!e.target.classList.contains('use-post-btn') && !e.target.classList.contains('linkedin-btn')) {
                e.preventDefault();
                const card = e.target.classList.contains('post-card') ? e.target : e.target.closest('.post-card');
                const cardPostId = card.getAttribute('data-post-id');
                if (cardPostId) openPostModal(parseInt(cardPostId));
            }
        }
    });
}

function setupPaginationListeners() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    pagination.addEventListener('click', function(e) {
        if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            if (page && page >= 1 && page <= totalPages) {
                goToPage(page);
            }
        }
    });
}

async function handleLogout() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out');
    }
}

async function loadDashboardData() {
    try {
        // Load user stats
        await loadUserStats();
        
        // Load posts
        await loadPosts();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showMessage('Error loading dashboard data', 'error');
    }
}

async function loadUserStats() {
    try {
        const response = await fetch('/api/user/score');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('userScore').textContent = data.score || 0;
            document.getElementById('userStreak').textContent = data.streak || 0;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadPosts(page = 1, search = '', sort = 'newest') {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '12',
            search,
            sort
        });
        
        const response = await fetch(`/api/posts?${params}`);
        if (response.ok) {
            const data = await response.json();
            currentPosts = data.posts || [];
            currentPage = data.currentPage || 1;
            totalPages = data.totalPages || 1;
            
            displayPosts(currentPosts);
            displayPagination();
            
            // Update total posts count
            document.getElementById('totalPosts').textContent = data.total || 0;
        } else {
            throw new Error('Failed to load posts');
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('postsGrid').innerHTML = '<div class="error">Error loading posts</div>';
    }
}

function displayPosts(posts) {
    const postsGrid = document.getElementById('postsGrid');
    
    if (posts.length === 0) {
        postsGrid.innerHTML = '<div class="no-posts">No posts available</div>';
        return;
    }
    
    // Debug: Log the actual post content to see if it's truncated
    console.log('First post content length:', posts[0]?.content?.length);
    console.log('First post content:', posts[0]?.content);
    
    // Clear the grid and create post cards one by one to ensure full content display
    postsGrid.innerHTML = '';
    
    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.setAttribute('data-post-id', post.id);
        
        // Create content div and set text content directly to avoid any HTML parsing issues
        const contentDiv = document.createElement('div');
        contentDiv.className = 'post-content';
        contentDiv.style.cssText = `
            display: block !important;
            -webkit-line-clamp: unset !important;
            -webkit-box-orient: unset !important;
            overflow: visible !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            text-overflow: unset !important;
            max-height: none !important;
            height: auto !important;
            line-height: 1.5;
            color: #333;
            margin-bottom: 15px;
        `;
        // Use textContent to ensure no HTML interpretation and full content display
        contentDiv.textContent = post.content;
        
        // Create actions div
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'post-actions';
        actionsDiv.innerHTML = `
            <div class="post-meta">
                Created: ${new Date(post.created_at).toLocaleDateString()}
            </div>
            <div>
                <button class="use-post-btn" data-post-id="${post.id}">
                    Mark as Used
                </button>
                <button class="linkedin-btn" data-post-id="${post.id}">
                    Post to LinkedIn
                </button>
            </div>
        `;
        
        postCard.appendChild(contentDiv);
        postCard.appendChild(actionsDiv);
        postsGrid.appendChild(postCard);
    });
    
    // Set up event listeners for post buttons using event delegation
    setupPostButtonListeners();
}

function displayPagination() {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHtml = '';
    
    // Previous button
    paginationHtml += `
        <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHtml += `<button class="current-page">${i}</button>`;
        } else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            paginationHtml += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += '<span>...</span>';
        }
    }
    
    // Next button
    paginationHtml += `
        <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
    `;
    
    pagination.innerHTML = paginationHtml;
    
    // Set up pagination button listeners
    setupPaginationListeners();
}

async function markPostAsUsed(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            showMessage('Post marked as used!', 'success');
            // Reload user stats to reflect any score changes
            await loadUserStats();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error marking post as used', 'error');
        }
    } catch (error) {
        console.error('Error marking post as used:', error);
        showMessage('Network error', 'error');
    }
}

async function postToLinkedIn(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/linkedin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            showMessage('Posted to LinkedIn successfully!', 'success');
            // Reload user stats to reflect any score changes
            await loadUserStats();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error posting to LinkedIn', 'error');
        }
    } catch (error) {
        console.error('Error posting to LinkedIn:', error);
        showMessage('Network error', 'error');
    }
}

async function modifyPostWithAI(postId) {
    const instructionTextarea = document.getElementById('aiInstruction');
    const instruction = instructionTextarea.value.trim();
    
    if (!instruction) {
        showMessage('Please enter an instruction for AI modification', 'error');
        return;
    }
    
    const aiModifyBtn = document.querySelector('.ai-modify-btn');
    const originalText = aiModifyBtn.textContent;
    
    try {
        aiModifyBtn.textContent = 'Modifying...';
        aiModifyBtn.disabled = true;
        
        const response = await fetch(`/api/posts/${postId}/modify-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instruction })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update the modal content with modified text
            const contentElement = document.querySelector('.modal-content-text');
            contentElement.textContent = data.modifiedContent;
            
            // Clear the instruction textarea
            instructionTextarea.value = '';
            
            showMessage('Post modified successfully!', 'success');
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error modifying post with AI', 'error');
        }
    } catch (error) {
        console.error('Error modifying post with AI:', error);
        showMessage('Network error', 'error');
    } finally {
        aiModifyBtn.textContent = originalText;
        aiModifyBtn.disabled = false;
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value;
    const sortValue = document.getElementById('sortPosts').value;
    loadPosts(1, searchTerm, sortValue);
}

function handleSort(event) {
    const sortValue = event.target.value;
    const searchTerm = document.getElementById('searchPosts').value;
    loadPosts(1, searchTerm, sortValue);
}

function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
        const searchTerm = document.getElementById('searchPosts').value;
        const sortValue = document.getElementById('sortPosts').value;
        loadPosts(page, searchTerm, sortValue);
    }
}

// Utility functions
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

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Post modal functionality
function openPostModal(postId) {
    const post = currentPosts.find(p => p.id === postId);
    if (!post) return;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('postModal');
    if (!modal) {
        modal = createPostModal();
    }
    
    // Populate modal with post data
    const title = modal.querySelector('.modal-title');
    const content = modal.querySelector('.modal-content-text');
    const meta = modal.querySelector('.modal-meta');
    const sourceUrl = modal.querySelector('.modal-source');
    
    title.textContent = post.title || 'Untitled Post';
    // Ensure full content is displayed in modal
    content.textContent = post.content;
    content.style.cssText = `
        line-height: 1.6;
        color: #333;
        margin-bottom: 20px;
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        display: block !important;
        -webkit-line-clamp: unset !important;
        -webkit-box-orient: unset !important;
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
    `;
    
    const createdDate = new Date(post.created_at).toLocaleString();
    meta.innerHTML = `
        <strong>Created:</strong> ${createdDate}<br>
        <strong>Author:</strong> ${post.author || 'Unknown'}
    `;
    
    if (post.source_url) {
        sourceUrl.style.display = 'block';
        sourceUrl.querySelector('a').href = post.source_url;
    } else {
        sourceUrl.style.display = 'none';
    }
    
    // Update action buttons
    const useBtn = modal.querySelector('.modal-use-btn');
    const linkedinBtn = modal.querySelector('.modal-linkedin-btn');
    const aiModifyBtn = modal.querySelector('.ai-modify-btn');
    
    useBtn.onclick = () => {
        markPostAsUsed(postId);
        closePostModal();
    };
    
    linkedinBtn.onclick = () => {
        postToLinkedIn(postId);
        closePostModal();
    };
    
    aiModifyBtn.onclick = () => {
        modifyPostWithAI(postId);
    };
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function createPostModal() {
    const modal = document.createElement('div');
    modal.id = 'postModal';
    modal.className = 'post-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title"></h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-content-text"></div>
                <div class="modal-meta"></div>
                <div class="modal-source" style="display: none;">
                    <strong>Source:</strong> <a href="#" target="_blank">View Original</a>
                </div>
                <div class="ai-section">
                    <details class="ai-personalization">
                        <summary>🤖 Personalize with AI</summary>
                        <div class="ai-options">
                            <textarea id="aiInstruction" placeholder="Tell the AI how to modify this post... (e.g., 'make it more professional', 'add emojis', 'make it shorter')"></textarea>
                            <button class="ai-modify-btn">Modify with AI</button>
                        </div>
                    </details>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-use-btn use-post-btn">Mark as Used</button>
                <button class="modal-linkedin-btn linkedin-btn">Post to LinkedIn</button>
                <button class="modal-cancel">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for close functionality
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    
    overlay.addEventListener('click', closePostModal);
    closeBtn.addEventListener('click', closePostModal);
    cancelBtn.addEventListener('click', closePostModal);
    
    return modal;
}

function closePostModal() {
    const modal = document.getElementById('postModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Functions are now handled by event listeners, no need to expose globally
