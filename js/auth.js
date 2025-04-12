// Authentication functionality with backend integration

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authScreen = document.getElementById('authScreen');
    const startScreen = document.getElementById('startScreen');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');

    // Form inputs
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerUsername = document.getElementById('registerUsername');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const rememberMe = document.getElementById('rememberMe');

    // Check if we're in development mode (running locally)
    const isDevelopment = window.location.hostname === "127.0.0.1" || 
                           window.location.hostname === "localhost";
    
    // API URLs - Using the new backend URL
    const API_BASE_URL = 'https://new-backend-hop.vercel.app';
    const REGISTER_URL = `${API_BASE_URL}/api/auth/register`;
    const LOGIN_URL = `${API_BASE_URL}/api/auth/login`;

    // Tab switching functionality
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Check if user is already logged in - do this check only once
    const isAlreadyAuthenticated = checkExistingAuth();
    if (isAlreadyAuthenticated) {
        // If already authenticated, redirect immediately and stop script execution
        window.location.href = 'index.html';
        return; // Stop further execution
    }

    // Form submission
    loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!loginEmail.value || !loginPassword.value) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(loginEmail.value)) {
            showError('Please enter a valid email');
            return;
        }

        // Call the login API
        login(loginEmail.value, loginPassword.value);
    });

    registerButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!registerUsername.value || !registerEmail.value || 
            !registerPassword.value || !confirmPassword.value) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(registerEmail.value)) {
            showError('Please enter a valid email');
            return;
        }

        if (registerPassword.value !== confirmPassword.value) {
            showError('Passwords do not match');
            return;
        }

        if (registerPassword.value.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        // Call the register API
        register(registerUsername.value, registerEmail.value, registerPassword.value);
    });

    // Login function
    async function login(email, password) {
        loginButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging in...';
        loginButton.disabled = true;
        
        try {
            if (isDevelopment && false) { // Set to false to always use the real API
                // For development, simulate a successful login
                simulateLogin();
                return;
            }

            const response = await fetch(LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Extract username from response, checking all possible locations
            const username = data.username || 
                             (data.user && data.user.displayName) || 
                             (data.user && data.user.username) || 
                             email.split('@')[0]; // Fallback to email username part
            
            console.log('Login successful. Username extracted:', username);

            // Store user data in localStorage or sessionStorage based on "remember me"
            if (rememberMe.checked) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId || (data.user && data.user.uid));
                localStorage.setItem('username', username);
                localStorage.setItem('highScore', data.highScore || (data.user && data.user.highScore) || 0);
                localStorage.setItem('referralCount', data.referralCount || 0);
                localStorage.setItem('referralBonus', data.referralBonus || 0);
            } else {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('userId', data.userId || (data.user && data.user.uid));
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('highScore', data.highScore || (data.user && data.user.highScore) || 0);
                sessionStorage.setItem('referralCount', data.referralCount || 0);
                sessionStorage.setItem('referralBonus', data.referralBonus || 0);
            }

            // Check for new referral bonuses
            let welcomeMessage = `Login successful! Welcome, ${username}!`;
            if (data.newReferralBonus) {
                welcomeMessage += ` You've earned ${data.newReferralBonus} bonus points from ${data.newReferrals || 'new'} referrals since your last login!`;
            }

            // Show success message
            showSuccess(welcomeMessage);

            // Redirect to game page with a flag to prevent flashing
            localStorage.setItem('loginRedirect', 'true');
            
            // Use direct redirect without setTimeout to avoid flashing
            window.location.href = 'index.html';
            
        } catch (error) {
            showError(error.message || 'Login failed');
            console.error('Login error:', error);
        } finally {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> LOGIN';
            loginButton.disabled = false;
        }
    }

    // Register function
    async function register(username, email, password) {
        registerButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Registering...';
        registerButton.disabled = true;
        
        try {
            // Check if this user was referred by someone
            const referrerId = sessionStorage.getItem('referrerId');
            const referrerUsername = sessionStorage.getItem('referrerUsername');
            
            // Create the registration payload
            const registrationData = { 
                username, 
                email, 
                password 
            };
            
            // Add referral data if available
            if (referrerId && referrerUsername) {
                registrationData.referrerId = referrerId;
                registrationData.referrerUsername = referrerUsername;
                console.log(`Including referral data: Referred by ${referrerUsername} (${referrerId})`);
            }
            
            if (isDevelopment && false) { // Set to false to always use the real API
                // For development, simulate a successful registration
                simulateRegistration(referrerId, referrerUsername);
                return;
            }

            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            // Save the username in session storage for use after login
            sessionStorage.setItem('registeredUsername', username);
            sessionStorage.setItem('userId', data.userId || (data.user && data.user.uid));
            sessionStorage.setItem('username', username);
            
            console.log('Registration successful. Username saved:', username);

            // If registration was successful and there was a referral, update the referral count
            if (referrerId && referrerUsername) {
                try {
                    // Call the referral count API to update the referrer's stats
                    const response = await fetch('https://new-backend-hop.vercel.app/api/referalcount', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          referrerId: referrerId,           // Firebase user ID of the referrer
                          referredUsername: username // Username of the newly registered user (the one who just registered)
                        })
                      });
                    
                    const referralData = await response.json();
                    
                    if (response.ok) {
                        console.log(`Referral count updated for ${referrerUsername}. New count: ${referralData.newCount}`);
                    } else {
                        console.error('Failed to update referral count:', referralData.message);
                    }
                } catch (referralError) {
                    // Log the error but don't interrupt the registration flow
                    console.error('Error updating referral count:', referralError);
                }
            }

            // Handle referral bonus display if applicable
            let successMessage = data.message || 'Registration successful! You can now log in.';
            if (referrerId && data.referralBonus) {
                successMessage += ` You received a ${data.referralBonus} point bonus from ${referrerUsername}'s referral!`;
                
                // Clear the referral data after successful use
                sessionStorage.removeItem('referrerId');
                sessionStorage.removeItem('referrerUsername');
            }

            // Show success message
            showSuccess(successMessage);

            // Clear form fields manually instead of using reset()
            if (registerUsername) registerUsername.value = '';
            if (registerEmail) registerEmail.value = '';
            if (registerPassword) registerPassword.value = '';
            if (confirmPassword) confirmPassword.value = '';
            
            // Switch to login tab after successful registration
            setTimeout(() => {
                loginTab.click();
            }, 1500);
            
        } catch (error) {
            showError(error.message || 'Registration failed');
            console.error('Registration error:', error);
        } finally {
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> REGISTER';
            registerButton.disabled = false;
        }
    }

    // Simulate login for development
    function simulateLogin() {
        console.log('Development mode: Simulating login success');
        
        // Extract a username from the email
        const username = loginEmail.value.split('@')[0];
        console.log('Development login: Using username', username);
        
        // Store user data for development
        if (rememberMe.checked) {
            localStorage.setItem('token', 'dev-token');
            localStorage.setItem('userId', 'dev-user-123');
            localStorage.setItem('username', username);
            localStorage.setItem('highScore', '0');
        } else {
            sessionStorage.setItem('token', 'dev-token');
            sessionStorage.setItem('userId', 'dev-user-123');
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('highScore', '0');
        }

        setTimeout(() => {
            // Redirect to game page
            window.location.href = 'index.html';
            
            // Reset form
            loginForm.reset();
            
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> LOGIN';
            loginButton.disabled = false;
        }, 1500);
    }

    // Simulate registration for development
    function simulateRegistration(referrerId, referrerUsername) {
        console.log('Development mode: Simulating registration success');
        
        // Use the provided username for consistent display
        const username = registerUsername.value;
        console.log('Development registration: Using username', username);
        
        // Store username in session storage
        sessionStorage.setItem('registeredUsername', username);
        sessionStorage.setItem('userId', 'dev-user-456');
        sessionStorage.setItem('username', username);
        
        let successMessage = 'Registration successful! You can now log in.';
        
        if (referrerId && referrerUsername) {
            successMessage += ` You received a 500 point bonus from ${referrerUsername}'s referral!`;
        }
        
        showSuccess(successMessage);
        
        setTimeout(() => {
            // Switch to login tab
            loginTab.click();
            
            // Prefill the login form with the registration email for convenience
            if (loginEmail) {
                loginEmail.value = registerEmail.value;
            }
            
            // Reset register form
            registerForm.reset();
            
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> REGISTER';
            registerButton.disabled = false;
        }, 1500);
    }

    // Social login buttons functionality
    const socialButtons = document.querySelectorAll('.social-button');
    socialButtons.forEach(button => {
        button.addEventListener('click', () => {
            // For now, we'll just show an alert
            alert('Social login will be implemented in a future update');
        });
    });

    // Check if user is already authenticated
    function checkExistingAuth() {
        const tokenFromStorage = localStorage.getItem('token');
        const tokenFromSession = sessionStorage.getItem('token');
        
        // Don't redirect if we just got redirected from login (prevent flashing)
        const isRedirecting = localStorage.getItem('loginRedirect');
        if (isRedirecting) {
            localStorage.removeItem('loginRedirect');
            return true; // Already authenticated but we'll handle this differently
        }
        
        // Return true if authenticated, false otherwise
        return !!(tokenFromStorage || tokenFromSession);
    }

    // Success message function
    function showSuccess(message) {
        // Create success element
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        
        // Get the form that's currently visible
        const currentForm = loginForm.classList.contains('hidden') ? registerForm : loginForm;
        
        // Remove any existing messages
        const existingMessage = currentForm.querySelector('.success-message, .error-message');
        if (existingMessage) existingMessage.remove();
        
        // Add the new success message at the top of the form
        currentForm.insertBefore(successElement, currentForm.firstChild);
        
        // Automatically remove after 3 seconds
        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }

    // Error message function
    function showError(message) {
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // Get the form that's currently visible
        const currentForm = loginForm.classList.contains('hidden') ? registerForm : loginForm;
        
        // Remove any existing messages
        const existingMessage = currentForm.querySelector('.success-message, .error-message');
        if (existingMessage) existingMessage.remove();
        
        // Add the new error message at the top of the form
        currentForm.insertBefore(errorElement, currentForm.firstChild);
        
        // Automatically remove after 3 seconds
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }

    // Validation helper functions
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Add animation classes to particles
    const particles = document.querySelectorAll('.particle');
    particles.forEach(particle => {
        // Random animation duration between 15-25s
        const duration = 15 + Math.random() * 10;
        // Random delay so they don't all move together
        const delay = Math.random() * 5;
        
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
    });
}); 