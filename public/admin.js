// DOM elements
const createPostForm = document.getElementById('createPostForm');
const postsList = document.getElementById('postsList');

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    loadPosts();
    loadNewsStatus();
    createPostForm.addEventListener('submit', handleCreatePost);
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
            showMessage('Post created successfully!', 'success');
            createPostForm.reset();
            loadPosts();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
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
