// Authentication functionality with Firebase integration

// Firebase will be loaded from script tags in the HTML
// The HTML head should include:
// <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase with a valid API key
    const firebaseConfig = {
        apiKey: "AIzaSyCOrNjkzFV8w8uHf1qVj1zwjxJktcgImA",
        authDomain: "hop-bunny.firebaseapp.com",
        projectId: "hop-bunny",
        storageBucket: "hop-bunny.firebasestorage.app",
        messagingSenderId: "852537502069",
        appId: "1:852537502069:web:23662af5d8389e6b3e4b3c",
        measurementId: "G-V52SKLD3ZT"
    };

    // Initialize Firebase with error handling
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
    
    const auth = firebase.auth();

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

    // Check for Firebase authentication state on load
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in, redirect to game page
        window.location.href = 'index.html';
    }
    });

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

        // Call the login function
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

        // Call the register function
        register(registerUsername.value, registerEmail.value, registerPassword.value);
    });

    // Login function using Firebase authentication
    async function login(email, password) {
        loginButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging in...';
        loginButton.disabled = true;
        
        try {
            if (isDevelopment && false) { // Set to false to always use the real Firebase
                // For development, simulate a successful login
                simulateLogin();
                return;
            }

            // Sign in with Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get the Firebase ID token
            const token = await user.getIdToken();
            const userId = user.uid;
            
            // Fetch additional user data from your backend using the Firebase token for authentication
            const userDataResponse = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            let userData = {};
            if (userDataResponse.ok) {
                userData = await userDataResponse.json();
            } else {
                console.warn('Could not fetch user data from backend');
            }
            
            // Store essential user information
            if (rememberMe.checked) {
                localStorage.setItem('token', token);
                localStorage.setItem('userId', userId);
                localStorage.setItem('username', userData.username || user.displayName || email.split('@')[0]);
                localStorage.setItem('highScore', userData.highScore || '0');
                localStorage.setItem('score', userData.score || '0');
                localStorage.setItem('referralCount', userData.referralCount || '0');
                localStorage.setItem('referralBonus', userData.referralBonus || '0');
            } else {
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('userId', userId);
                sessionStorage.setItem('username', userData.username || user.displayName || email.split('@')[0]);
                sessionStorage.setItem('highScore', userData.highScore || '0');
                sessionStorage.setItem('score', userData.score || '0');
                sessionStorage.setItem('referralCount', userData.referralCount || '0');
                sessionStorage.setItem('referralBonus', userData.referralBonus || '0');
            }

            // Flag to force a fresh fetch when visiting the profile page
            sessionStorage.setItem('forceProfileRefresh', 'true');

            // Get the username for welcome message
            const username = userData.username || user.displayName || email.split('@')[0];
            
            let welcomeMessage = `Login successful! Welcome, ${username}!`;
            if (userData.newReferralBonus) {
                welcomeMessage += ` You've earned ${userData.newReferralBonus} bonus points from ${userData.newReferrals || 'new'} referrals since your last login!`;
            }

            // Show success message
            showSuccess(welcomeMessage);

            // Redirect to game page with a flag to prevent flashing
            localStorage.setItem('loginRedirect', 'true');
            
            // Use direct redirect without setTimeout to avoid flashing
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Firebase login error:', error);
            let errorMessage = 'Login failed';
            
            // Handle specific Firebase auth errors
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many unsuccessful login attempts. Please try again later';
                    break;
                default:
                    errorMessage = error.message || 'Login failed';
            }
            
            showError(errorMessage);
        } finally {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> LOGIN';
            loginButton.disabled = false;
        }
    }

    // Register function using Firebase authentication
    async function register(username, email, password) {
        registerButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Registering...';
        registerButton.disabled = true;
        
        try {
            // Check if this user was referred by someone
            const referrerId = sessionStorage.getItem('referrerId');
            const referrerUsername = sessionStorage.getItem('referrerUsername');
            
            if (isDevelopment && false) { // Set to false to always use the real Firebase
                // For development, simulate a successful registration
                simulateRegistration(referrerId, referrerUsername);
                return;
            }

            // Create user with Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get the Firebase ID token
            const token = await user.getIdToken();
            const userId = user.uid;
            
            // Update the display name
            await user.updateProfile({
                displayName: username
            });
            
            // Create the registration payload for your backend
            const registrationData = { 
                username, 
                email, 
                firebaseUid: userId // Send Firebase UID instead of password
            };
            
            // Add referral data if available
            if (referrerId && referrerUsername) {
                registrationData.referrerId = referrerId;
                registrationData.referrerUsername = referrerUsername;
                console.log(`Including referral data: Referred by ${referrerUsername} (${referrerId})`);
            } else if (referrerId) {
                // If we only have referrer ID without username
                registrationData.referrerId = referrerId;
                console.log(`Including referral data with ID only: Referred by ID ${referrerId}`);
            }
            
            // Register user with your backend to store additional user data
            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Use Firebase token for authentication
                },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration with backend failed');
            }
            
            // Save the username in session storage for use after login
            sessionStorage.setItem('registeredUsername', username);
            sessionStorage.setItem('userId', userId);
            sessionStorage.setItem('username', username);
            
            console.log('Registration successful. Username saved:', username);

            // Handle referral bonus if applicable
            let successMessage = 'Registration successful! You can now log in.';
            if (referrerId && data.referralBonus) {
                successMessage += ` You received a ${data.referralBonus} point bonus from your referral!`;
                
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
            console.error('Firebase registration error:', error);
            let errorMessage = 'Registration failed';
            
            // Handle specific Firebase auth errors
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email address is already in use';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak';
                    break;
                default:
                    errorMessage = error.message || 'Registration failed';
            }
            
            showError(errorMessage);
        } finally {
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> REGISTER';
            registerButton.disabled = false;
        }
    }

    // Check if user is already authenticated
    function checkExistingAuth() {
        // Check for Firebase auth first
        const currentUser = auth.currentUser;
        if (currentUser) {
            return true;
        }
        
        // Fall back to checking local/session storage
        const tokenFromStorage = localStorage.getItem('token');
        const tokenFromSession = sessionStorage.getItem('token');
        
        // Don't redirect if we just got redirected from login (prevent flashing)
        const isRedirecting = localStorage.getItem('loginRedirect');
        if (isRedirecting) {
            localStorage.removeItem('loginRedirect');
            return true; // Already authenticated but we'll handle this differently
        }
        
        // If authenticated with token in storage, fetch the username from the database
        if (tokenFromStorage || tokenFromSession) {
            const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
            if (userId) {
                // Fetch user data from the database
                fetchUserDataFromDB(userId);
            }
            return true;
        }
        
        // Return false if not authenticated
        return false;
    }
    
    // Function to fetch user data from the database
    async function fetchUserDataFromDB(userId) {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            
            const userData = await response.json();
            
            // Update the username in storage with the one from the database
            const username = userData.username || userData.displayName;
            if (username) {
                if (localStorage.getItem('token')) {
                    localStorage.setItem('username', username);
                } else {
                    sessionStorage.setItem('username', username);
                }
                console.log('Username fetched from database:', username);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
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

    // Function to update username from database that can be called from outside
    function updateUsernameFromDatabase() {
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (userId && token) {
            fetch(`${API_BASE_URL}/api/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                return response.json();
            })
            .then(userData => {
                const username = userData.username || userData.displayName;
                if (username) {
                    // Update the username in storage
                    if (localStorage.getItem('token')) {
                        localStorage.setItem('username', username);
                    } else {
                        sessionStorage.setItem('username', username);
                    }
                    
                    // Update any UI elements displaying the username
                    const usernameDisplayElements = document.querySelectorAll('.user-display-name');
                    usernameDisplayElements.forEach(element => {
                        element.textContent = username;
                    });
                    
                    console.log('Username updated from database:', username);
                }
            })
            .catch(error => {
                console.error('Error updating username from database:', error);
            });
        }
    }

    // Expose the function to the global scope so it can be called from other scripts
    window.updateUsernameFromDatabase = updateUsernameFromDatabase;

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
});