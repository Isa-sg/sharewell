// Global variables
let currentUser = null;

// DOM elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotUsernameForm = document.getElementById('forgotUsernameForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const currentUserSpan = document.getElementById('currentUser');
const adminBtn = document.getElementById('adminBtn');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Add event listeners for forms
    if (document.getElementById('loginFormElement')) {
        document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    }
    if (document.getElementById('registerFormElement')) {
        document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    }
    if (document.getElementById('forgotPasswordFormElement')) {
        document.getElementById('forgotPasswordFormElement').addEventListener('submit', handleForgotPassword);
    }
    if (document.getElementById('forgotUsernameFormElement')) {
        document.getElementById('forgotUsernameFormElement').addEventListener('submit', handleForgotUsername);
    }
    if (document.getElementById('resetPasswordFormElement')) {
        document.getElementById('resetPasswordFormElement').addEventListener('submit', handleResetPassword);
    }
    
    // Add event listeners for tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons[0]?.addEventListener('click', function(e) {
        e.preventDefault();
        showLogin();
    });
    tabButtons[1]?.addEventListener('click', function(e) {
        e.preventDefault();
        showRegister();
    });
    tabButtons[2]?.addEventListener('click', function(e) {
        e.preventDefault();
        showForgotPassword();
    });
    tabButtons[3]?.addEventListener('click', function(e) {
        e.preventDefault();
        showForgotUsername();
    });
    
    // Add event listeners for navigation buttons
    setupNavigationButtons();
    
    // Add test login button
    const testLoginBtn = document.getElementById('testLoginBtn');
    if (testLoginBtn) {
        testLoginBtn.addEventListener('click', function() {
            console.log('Test login clicked');
            // Simulate a logged in user
            currentUser = { 
                id: 1, 
                username: 'Isa', 
                email: 'test@example.com', 
                role: 'admin' 
            };
            showMainContent();
            showMessage('Test login successful!', 'success');
        });
    }
    
    // Add event listeners for "Back to Login" buttons
    const backToLoginButtons = document.querySelectorAll('.back-to-login-btn');
    backToLoginButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Back to Login clicked');
            showLogin();
        });
    });
    
    // Check for reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (resetToken) {
        showResetPasswordForm(resetToken);
    }
    
    console.log('App initialization complete');
});

function setupNavigationButtons() {
    // Dashboard button in nav
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dashboard button clicked');
            window.location.href = '/dashboard';
        });
    }
    
    // Admin button in nav
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Admin button clicked');
            window.location.href = '/admin';
        });
    }
    
    // Logout button in nav
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout button clicked');
            handleLogout();
        });
    }
    
    // Go to Dashboard button in card
    const goToDashboardBtn = document.getElementById('goToDashboardBtn');
    if (goToDashboardBtn) {
        goToDashboardBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Go to Dashboard button clicked');
            window.location.href = '/dashboard';
        });
    }
    
    // Go to Admin button in card
    const goToAdminBtn = document.getElementById('goToAdminBtn');
    if (goToAdminBtn) {
        goToAdminBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Go to Admin button clicked');
            window.location.href = '/admin';
        });
    }
}

// Authentication functions - explicitly making them global
window.showLogin = function showLogin() {
    console.log('showLogin called');
    hideAllForms();
    loginForm.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
}

window.showRegister = function showRegister() {
    console.log('showRegister called');
    hideAllForms();
    registerForm.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

window.showForgotPassword = function showForgotPassword() {
    console.log('showForgotPassword called');
    hideAllForms();
    forgotPasswordForm.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[2].classList.add('active');
}

window.showForgotUsername = function showForgotUsername() {
    console.log('showForgotUsername called');
    hideAllForms();
    forgotUsernameForm.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[3].classList.add('active');
}

function showResetPasswordForm(token) {
    hideAllForms();
    resetPasswordForm.classList.remove('hidden');
    document.getElementById('resetToken').value = token;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
}

function hideAllForms() {
    console.log('hideAllForms called');
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
    forgotUsernameForm.classList.add('hidden');
    resetPasswordForm.classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/auth/login', {
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
        const response = await fetch('/auth/register', {
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

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotPasswordEmail').value;
    const resultDiv = document.getElementById('forgotPasswordResult');
    
    try {
        const response = await fetch('/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <p>${data.message}</p>
                    ${data.token ? `<p><strong>Reset Token:</strong> ${data.token}</p>
                    <p><small>Copy this token and use it to reset your password.</small></p>
                    <button onclick="showResetPasswordForm('${data.token}')">Use Token Now</button>` : ''}
                </div>
            `;
            showMessage('Password reset instructions sent!', 'success');
        } else {
            resultDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error-message">Network error. Please try again.</div>`;
    }
}

async function handleForgotUsername(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotUsernameEmail').value;
    const resultDiv = document.getElementById('forgotUsernameResult');
    
    try {
        const response = await fetch('/auth/forgot-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <p>${data.message}</p>
                    ${data.username ? `<p><strong>Your username is:</strong> ${data.username}</p>` : ''}
                </div>
            `;
            showMessage('Username found!', 'success');
        } else {
            resultDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error-message">Network error. Please try again.</div>`;
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    
    const token = document.getElementById('resetToken').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const resultDiv = document.getElementById('resetPasswordResult');
    
    if (newPassword !== confirmPassword) {
        resultDiv.innerHTML = `<div class="error-message">Passwords do not match.</div>`;
        return;
    }
    
    try {
        const response = await fetch('/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, newPassword }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="success-message">
                    <p>${data.message}</p>
                    <p>You can now login with your new password.</p>
                </div>
            `;
            showMessage('Password reset successfully!', 'success');
            setTimeout(() => showLogin(), 2000);
        } else {
            resultDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error-message">Network error. Please try again.</div>`;
    }
}

async function handleLogout() {
    console.log('handleLogout called');
    try {
        await fetch('/auth/logout', { method: 'POST' });
        currentUser = null;
        showAuthSection();
        showMessage('Logged out successfully!', 'success');
    } catch (error) {
        console.error('Error in handleLogout:', error);
        showMessage('Error logging out', 'error');
    }
}

async function checkAuthStatus() {
    // For now, just show auth section by default
    // The user can use the test login button
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
