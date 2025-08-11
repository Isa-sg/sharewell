// Admin panel specific functionality
let currentTab = 'posts';

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel loaded, initializing...');
    loadAdminData();
    setupEventListeners();
    setupNavigationButtons();
    setupTabButtons();
});

function setupEventListeners() {
    // Create post form
    const createPostForm = document.getElementById('createPostFormElement');
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);
    }
    
    // Show create post form button
    const showCreatePostBtn = document.getElementById('showCreatePostBtn');
    if (showCreatePostBtn) {
        showCreatePostBtn.addEventListener('click', showCreatePostForm);
    }
    
    // Hide create post form button
    const hideCreatePostBtn = document.getElementById('hideCreatePostBtn');
    if (hideCreatePostBtn) {
        hideCreatePostBtn.addEventListener('click', hideCreatePostForm);
    }
    
    // Sync news button
    const syncNewsBtn = document.getElementById('syncNewsBtn');
    if (syncNewsBtn) {
        syncNewsBtn.addEventListener('click', syncNews);
    }
}

function setupNavigationButtons() {
    // Home button
    const homeBtn = document.getElementById('adminHomeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Admin Home button clicked');
            window.location.href = '/';
        });
    }
    
    // Dashboard button
    const dashboardBtn = document.getElementById('adminDashboardBtn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Admin Dashboard button clicked');
            window.location.href = '/dashboard';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Admin Logout button clicked');
            handleLogout();
        });
    }
}

function setupTabButtons() {
    const tabButtons = document.querySelectorAll('.admin-tabs .tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                showTab(tabName, this);
            }
        });
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

function setupPostActionListeners() {
    const postsList = document.getElementById('adminPostsList');
    if (!postsList) return;
    
    // Use event delegation for dynamically created buttons
    postsList.addEventListener('click', function(e) {
        const postId = e.target.getAttribute('data-post-id');
        if (!postId) return;
        
        if (e.target.classList.contains('edit-btn')) {
            e.preventDefault();
            editPost(parseInt(postId));
        } else if (e.target.classList.contains('delete-btn')) {
            e.preventDefault();
            deletePost(parseInt(postId));
        }
    });
}

async function loadAdminData() {
    try {
        // Load data based on current tab
        switch (currentTab) {
            case 'posts':
                await loadAdminPosts();
                break;
            case 'news':
                await loadNewsStatus();
                break;
            case 'stats':
                await loadAdminStats();
                break;
            case 'users':
                await loadUsers();
                break;
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
        showMessage('Error loading admin data', 'error');
    }
}

function showTab(tabName, buttonElement) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Add active class to selected tab button
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    // Update current tab and load data
    currentTab = tabName;
    loadAdminData();
}

// Posts Management
async function loadAdminPosts() {
    try {
        const response = await fetch('/api/posts?limit=50', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            displayAdminPosts(data.posts || []);
        } else {
            throw new Error('Failed to load posts');
        }
    } catch (error) {
        console.error('Error loading admin posts:', error);
        document.getElementById('adminPostsList').innerHTML = '<div class="error">Error loading posts</div>';
    }
}

function displayAdminPosts(posts) {
    const postsList = document.getElementById('adminPostsList');
    
    if (posts.length === 0) {
        postsList.innerHTML = '<div class="no-posts">No posts available</div>';
        return;
    }
    
    postsList.innerHTML = posts.map(post => `
        <div class="admin-post-item" data-post-id="${post.id}">
            <div class="admin-post-content">
                <div class="admin-post-content">${escapeHtml(post.content)}</div>
                <div class="admin-post-meta">
                    Created: ${new Date(post.created_at).toLocaleDateString()} | 
                    Used: ${post.usage_count || 0} times
                </div>
            </div>
            <div class="admin-post-actions">
                <button class="edit-btn" data-post-id="${post.id}">Edit</button>
                <button class="delete-btn" data-post-id="${post.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Set up event listeners for post action buttons
    setupPostActionListeners();
}

function showCreatePostForm() {
    document.getElementById('createPostForm').classList.remove('hidden');
}

function hideCreatePostForm() {
    document.getElementById('createPostForm').classList.add('hidden');
    document.getElementById('createPostFormElement').reset();
}

async function handleCreatePost(event) {
    event.preventDefault();
    
    const content = document.getElementById('postContent').value.trim();
    if (!content) {
        showMessage('Post content is required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });
        
        if (response.ok) {
            showMessage('Post created successfully!', 'success');
            hideCreatePostForm();
            loadAdminPosts();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error creating post', 'error');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showMessage('Network error', 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('Post deleted successfully!', 'success');
            loadAdminPosts();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error deleting post', 'error');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        showMessage('Network error', 'error');
    }
}

async function editPost(postId) {
    try {
        // Get the current post content
        const response = await fetch('/api/posts', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }
        
        const data = await response.json();
        const post = data.posts.find(p => p.id === postId);
        
        if (!post) {
            showMessage('Post not found', 'error');
            return;
        }
        
        // Create edit form modal
        const modal = createEditModal(post);
        document.body.appendChild(modal);
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Focus on the textarea
        const textarea = modal.querySelector('#editPostContent');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        
    } catch (error) {
        console.error('Error starting post edit:', error);
        showMessage('Error loading post for editing', 'error');
    }
}

function createEditModal(post) {
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
        <div class="edit-modal-content">
            <div class="edit-modal-header">
                <h3>Edit Post</h3>
                <button class="close-edit-modal" type="button">&times;</button>
            </div>
            <form id="editPostForm">
                <textarea id="editPostContent" rows="6" required>${escapeHtml(post.content)}</textarea>
                <div class="edit-form-actions">
                    <button type="submit" class="save-edit-btn">Save Changes</button>
                    <button type="button" class="cancel-edit-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-edit-modal');
    const cancelBtn = modal.querySelector('.cancel-edit-btn');
    const form = modal.querySelector('#editPostForm');
    
    const closeModal = () => {
        modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newContent = modal.querySelector('#editPostContent').value.trim();
        
        if (!newContent) {
            showMessage('Post content cannot be empty', 'error');
            return;
        }
        
        if (newContent === post.content) {
            showMessage('No changes detected', 'info');
            closeModal();
            return;
        }
        
        await savePostEdit(post.id, newContent, closeModal);
    });
    
    return modal;
}

async function savePostEdit(postId, newContent, closeModal) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-bypass': 'development'
            },
            credentials: 'include',
            body: JSON.stringify({ content: newContent }),
        });
        
        if (response.ok) {
            showMessage('Post updated successfully!', 'success');
            closeModal();
            loadAdminPosts(); // Reload the posts list
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error updating post', 'error');
        }
    } catch (error) {
        console.error('Error updating post:', error);
        showMessage('Network error while updating post', 'error');
    }
}

// News Management
async function loadNewsStatus() {
    try {
        const response = await fetch('/api/admin/news-status', {
            headers: {
                'x-admin-bypass': 'development'
            }
        });
        if (response.ok) {
            const data = await response.json();
            displayNewsStatus(data);
        } else {
            throw new Error('Failed to load news status');
        }
    } catch (error) {
        console.error('Error loading news status:', error);
        document.getElementById('newsStatus').innerHTML = '<div class="error">Error loading news status</div>';
    }
}

function displayNewsStatus(data) {
    const statusContainer = document.getElementById('newsStatus');
    
    statusContainer.innerHTML = `
        <div class="sync-status">
            <div class="status-indicator ${data.status || 'warning'}"></div>
            <strong>Last Sync:</strong> ${data.lastSync ? new Date(data.lastSync).toLocaleString() : 'Never'}
        </div>
        <div class="sync-details">
            <p><strong>Total Posts:</strong> ${data.totalPosts || 0}</p>
            <p><strong>Posts Added Today:</strong> ${data.postsToday || 0}</p>
            <p><strong>Next Scheduled Sync:</strong> ${data.nextSync ? new Date(data.nextSync).toLocaleString() : 'Not scheduled'}</p>
        </div>
    `;
}

async function syncNews() {
    try {
        const response = await fetch('/api/admin/sync-news', {
            method: 'POST',
            headers: {
                'x-admin-bypass': 'development'
            }
        });
        
        if (response.ok) {
            showMessage('News sync started successfully!', 'success');
            // Reload news status after a short delay
            setTimeout(() => loadNewsStatus(), 2000);
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error starting news sync', 'error');
        }
    } catch (error) {
        console.error('Error syncing news:', error);
        showMessage('Network error', 'error');
    }
}

// Statistics
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/scoring-stats', {
            headers: {
                'x-admin-bypass': 'development'
            }
        });
        if (response.ok) {
            const data = await response.json();
            displayAdminStats(data);
        } else {
            throw new Error('Failed to load admin stats');
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        document.getElementById('statsGrid').innerHTML = '<div class="error">Error loading statistics</div>';
    }
}

function displayAdminStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    
    statsGrid.innerHTML = `
        <div class="admin-stat-card">
            <h3>Total Users</h3>
            <div class="stat-value">${data.totalUsers || 0}</div>
            <div class="stat-description">Registered users</div>
        </div>
        <div class="admin-stat-card">
            <h3>Total Posts</h3>
            <div class="stat-value">${data.totalPosts || 0}</div>
            <div class="stat-description">Available posts</div>
        </div>
        <div class="admin-stat-card">
            <h3>LinkedIn Posts</h3>
            <div class="stat-value">${data.linkedinPosts || 0}</div>
            <div class="stat-description">Posted to LinkedIn</div>
        </div>
        <div class="admin-stat-card">
            <h3>Active Users</h3>
            <div class="stat-value">${data.activeUsers || 0}</div>
            <div class="stat-description">Users with activity this week</div>
        </div>
        <div class="admin-stat-card">
            <h3>Average Score</h3>
            <div class="stat-value">${Math.round(data.averageScore || 0)}</div>
            <div class="stat-description">Points per user</div>
        </div>
        <div class="admin-stat-card">
            <h3>Top Streak</h3>
            <div class="stat-value">${data.topStreak || 0}</div>
            <div class="stat-description">Longest current streak</div>
        </div>
    `;
}

// Users Management
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'x-admin-bypass': 'development'
            }
        });
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users || []);
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = '<div class="error">Error loading users</div>';
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-users">No users found</div>';
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <h4>${escapeHtml(user.username)}</h4>
                <p>${escapeHtml(user.email || 'No email')}</p>
                <p>Score: ${user.score || 0} | Streak: ${user.streak || 0}</p>
            </div>
            <div class="user-role ${user.role || 'user'}">${user.role || 'user'}</div>
        </div>
    `).join('');
}

// Utility functions
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

// Functions are now handled by event listeners, no need to expose globally
