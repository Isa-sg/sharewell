// DOM elements
const dashboardPosts = document.getElementById('dashboardPosts');
const postModal = document.getElementById('postModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const modalImage = document.getElementById('modalImage');
const linkedinLink = document.getElementById('linkedinLink');

// Global variables
let currentPost = null;
let linkedinConnected = false;
let postedPosts = [];
let personalizedVersion = null;
let isShowingPersonalized = false;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadPosts();
    checkAdminStatus();
    checkLinkedInStatus();
    loadPostedStatus();
    loadPersonalizationTemplates();
    
    // Add quick post form handler
    document.getElementById('quickPostForm').addEventListener('submit', handleQuickPost);
});

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
    dashboardPosts.innerHTML = '';
    
    if (posts.length === 0) {
        dashboardPosts.innerHTML = '<p>No posts available yet.</p>';
        return;
    }
    
    posts.forEach(post => {
        const postDiv = document.createElement('div');
        const isPosted = postedPosts.includes(post.id);
        postDiv.className = `dashboard-post ${isPosted ? 'posted' : ''}`;
        postDiv.onclick = () => openModal(post);
        
        postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <small>By: ${post.author}${post.source_url ? ` • <a href="${post.source_url}" target="_blank">Read original</a>` : ''}</small>
            ${isPosted ? '<div class="posted-badge">✓ Posted</div>' : ''}
        `;
        
        dashboardPosts.appendChild(postDiv);
    });
}

function openModal(post) {
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
    
    postModal.classList.remove('hidden');
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
            postedPosts = data.postedPosts;
            // Refresh posts display to show posted status
            if (dashboardPosts.children.length > 0) {
                loadPosts();
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

    const modifyBtn = document.getElementById('customAIBtn');
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
