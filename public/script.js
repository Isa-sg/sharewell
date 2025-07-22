// Global variables
let currentUser = null;

// DOM elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const currentUserSpan = document.getElementById('currentUser');
const adminBtn = document.getElementById('adminBtn');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkAuthStatus();
    
    // Add event listeners
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
});

// Authentication functions
function showLogin() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
}

function showRegister() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showMainContent();
            showMessage('Login successful!', 'success');
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            showLogin();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showAuthSection();
        showMessage('Logged out successfully!', 'success');
    } catch (error) {
        showMessage('Error logging out', 'error');
    }
}

function checkAuthStatus() {
    // This would normally check for a valid session
    // For now, we'll just show the auth section
    showAuthSection();
}

function showAuthSection() {
    authSection.classList.remove('hidden');
    mainContent.classList.add('hidden');
}

function showMainContent() {
    authSection.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    if (currentUser) {
        currentUserSpan.textContent = currentUser.username;
        
        // Show admin button if user is admin
        if (currentUser.role === 'admin') {
            adminBtn.classList.remove('hidden');
        }
    }
}

// Navigation functions
function goHome() {
    window.location.href = '/';
}

function goToAdmin() {
    window.location.href = '/admin';
}

function goToDashboard() {
    window.location.href = '/dashboard';
}

// Utility functions
function showMessage(message, type) {
    // Create a simple message display
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
