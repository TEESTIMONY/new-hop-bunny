/**
 * Profile JavaScript for Hop Bunny
 * Handles loading and displaying user profile data
 */

// API Configuration
const API_BASE_URL = 'https://new-backend-hop.vercel.app/api';
const API_ENDPOINTS = {
    users: '/users',
    userProfile: '/user/{userId}',
    userGameHistory: '/users/{userId}/games',
    userAchievements: '/users/{userId}/achievements'
};

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const profileData = document.getElementById('profileData');

// Current user info
const currentUsername = document.getElementById('currentUsername');
const currentUserScore = document.getElementById('currentUserScore');

// Profile elements
const profileUsername = document.getElementById('profileUsername');
const joinDate = document.getElementById('joinDate');
const highScore = document.getElementById('highScore');
const gamesPlayed = document.getElementById('gamesPlayed');
const playerRank = document.getElementById('playerRank');
const highestJump = document.getElementById('highestJump');
const achievementsList = document.getElementById('achievementsList');
const gameHistoryList = document.getElementById('gameHistoryList');

document.addEventListener('DOMContentLoaded', function() {
    // Initialize profile
    initProfile();
    
    // Set up particle animations
    setupParticleAnimations();
    
    // Add improved button styles
    enhanceButtonStyles();

    // Add button feedback on mobile
    const buttons = document.querySelectorAll('.game-button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.classList.add('active');
        });
        button.addEventListener('touchend', function() {
            this.classList.remove('active');
        });
    });
});

/**
 * Initialize the profile page
 */
function initProfile() {
    console.log('Initializing profile page');
    
    // Load current user info from local storage
    loadUserInfo();
    
    // Get the current logged-in user's ID from localStorage or sessionStorage
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (userId) {
        // Load profile data for the current user
        loadProfileData(userId);
    } else {
        // If no user is logged in, show a guest profile or error
        showError('Please log in to view your profile');
    }
}

/**
 * Load and display user information on the top bar
 */
function loadUserInfo() {
    // Get user info from localStorage or sessionStorage
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    // First try to show localStorage data while we fetch the latest
    const cachedScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || 0;
    
    // Update the UI elements with cached data first
    if (username) {
        currentUsername.textContent = username;
        currentUserScore.textContent = formatNumber(cachedScore);
        
        // If we have a userId, we can try to fetch the latest score
        if (userId) {
            // Fetch the latest score from the API
            const userEndpoint = API_ENDPOINTS.userProfile.replace('{userId}', userId);
            fetch(`${API_BASE_URL}${userEndpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                return response.json();
            })
            .then(data => {
                console.log('User data fetched for header:', data);
                
                // Update the score display with the latest from the database
                if (data.score !== undefined && !isNaN(data.score)) {
                    const dbScore = parseInt(data.score);
                    currentUserScore.textContent = formatNumber(dbScore);
                }
            })
            .catch(error => {
                console.error('Error fetching user header data:', error);
                // If there's an error, we'll keep showing the cached score
            });
        }
    } else {
        currentUsername.textContent = "Guest Player";
        currentUserScore.textContent = "0";
    }
}

/**
 * Load profile data for a specific user
 */
async function loadProfileData(userId) {
    try {
        // Show loading state
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        profileData.style.display = 'none';
        
        // Try to fetch user data from the API
        const userEndpoint = API_ENDPOINTS.userProfile.replace('{userId}', userId);
        fetch(`${API_BASE_URL}${userEndpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        })
        .then(data => {
            console.log('User profile data fetched from API:', data);
            
            // Process API data to match our expected format
            const userData = processApiUserData(data, userId);
            
            // Display the profile with data from the API
            displayProfileData(userData);
        })
        .catch(error => {
            console.error('Error fetching profile data from API:', error);
            console.log('Falling back to localStorage data');
            
            // Fallback to localStorage data if the API call fails
            const userData = getCurrentUserData();
            displayProfileData(userData);
        });
        
    } catch (error) {
        console.error('Error in loadProfileData:', error);
        // Still try to show some data even if there's an error
        try {
            const userData = getCurrentUserData();
            displayProfileData(userData);
        } catch (innerError) {
            console.error('Failed to display profile:', innerError);
            showError('Could not load profile data');
        }
    }
}

/**
 * Process API user data into the format our profile display expects
 */
function processApiUserData(apiData, userId) {
    console.log('Processing API data:', apiData);
    
    // Get username with fallback
    const username = apiData.username || localStorage.getItem('username') || sessionStorage.getItem('username') || 'Guest Player';
    
    // Get high score from API data
    let highScore = 0;
    if (apiData.score !== undefined && !isNaN(apiData.score)) {
        highScore = parseInt(apiData.score);
        
        // Update localStorage for consistency
        localStorage.setItem('highScore', highScore);
    } else {
        // Fallback to localStorage
        const localScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore');
        highScore = parseInt(localScore || '0');
    }
    
    // Get rank with fallback
    let rank = apiData.rank || 1;
    try {
        if (apiData.rank === undefined) {
            rank = parseInt(localStorage.getItem('rank') || sessionStorage.getItem('rank') || '1');
        }
    } catch (e) {
        console.error('Error parsing rank:', e);
    }
    
    // Get join date from API or use stored value
    let joinDate;
    if (apiData.joinDate) {
        joinDate = formatDate(new Date(apiData.joinDate));
        localStorage.setItem('joinDate', joinDate);
    } else {
        const storedJoinDate = localStorage.getItem('joinDate') || sessionStorage.getItem('joinDate');
        if (storedJoinDate) {
            joinDate = storedJoinDate;
        } else {
            joinDate = formatDate(new Date());
        }
    }
    
    // Get games played from API or estimate
    let gamesPlayed = apiData.gamesPlayed || 5;
    if (apiData.gamesPlayed === undefined) {
        try {
            const storedGames = localStorage.getItem('gamesPlayed') || sessionStorage.getItem('gamesPlayed');
            if (storedGames) {
                gamesPlayed = parseInt(storedGames);
            } else {
                gamesPlayed = Math.max(5, Math.floor(highScore / 500));
            }
        } catch (e) {
            console.error('Error parsing games played:', e);
        }
    }
    
    // Get referral data with fallback
    let referralCount = apiData.referralCount || 0;
    let referralBonus = apiData.referralBonus || 0;
    
    if (apiData.referralCount === undefined) {
        try {
            referralCount = parseInt(localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount') || '0');
        } catch (e) {
            console.error('Error parsing referral count:', e);
        }
    }
    
    if (apiData.referralBonus === undefined) {
        try {
            referralBonus = parseInt(localStorage.getItem('referralBonus') || sessionStorage.getItem('referralBonus') || '0');
        } catch (e) {
            console.error('Error parsing referral bonus:', e);
        }
    }
    
    // Create achievements based on the user's score and rank
    const achievements = [];
    
    // Basic achievement for all users
    achievements.push({
        icon: 'fas fa-play-circle',
        name: 'Hop Bunny Player',
        description: 'Joined the hopping adventure'
    });
    
    // Achievement based on rank
    if (rank === 1) {
        achievements.push({
            icon: 'fas fa-crown',
            name: 'Top Hopper',
            description: 'Reached #1 on the leaderboard'
        });
    } else if (rank <= 3) {
        achievements.push({
            icon: 'fas fa-medal',
            name: 'Leaderboard Elite',
            description: `Reached #${rank} on the leaderboard`
        });
    } else if (rank <= 10) {
        achievements.push({
            icon: 'fas fa-award',
            name: 'Top 10',
            description: `Ranked #${rank} on the leaderboard`
        });
    }
    
    // Achievements based on score
    if (highScore >= 5000) {
        achievements.push({
            icon: 'fas fa-fire',
            name: '5K Master',
            description: 'Scored over 5,000 points'
        });
    } else if (highScore >= 1000) {
        achievements.push({
            icon: 'fas fa-star',
            name: '1K Club',
            description: 'Scored over 1,000 points'
        });
    }
    
    // Achievements based on referrals
    if (referralCount >= 10) {
        achievements.push({
            icon: 'fas fa-user-friends',
            name: 'Community Builder',
            description: 'Referred 10+ players to Hop Bunny'
        });
    } else if (referralCount >= 5) {
        achievements.push({
            icon: 'fas fa-user-plus',
            name: 'Friend Bringer',
            description: 'Referred 5+ players to Hop Bunny'
        });
    } else if (referralCount >= 1) {
        achievements.push({
            icon: 'fas fa-share-alt',
            name: 'Word Spreader',
            description: 'Referred their first player to Hop Bunny'
        });
    }
    
    // Get game history from API or generate it
    let gameHistory = apiData.gameHistory || [];
    
    // If no game history from API, generate some
    if (!gameHistory.length) {
        const today = new Date();
        
        // Add the best score game
        gameHistory.push({
            date: formatDate(today),
            score: highScore,
            isHighScore: true
        });
        
        // Add some additional game entries
        for (let i = 1; i <= 3; i++) {
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - i);
            
            gameHistory.push({
                date: formatDate(pastDate),
                score: Math.floor(highScore * 0.8), // 80% of high score
                isHighScore: false
            });
        }
    }
    
    console.log('Profile data prepared from API');
    
    return {
        userId: userId || 'guest',
        username: username,
        joinDate: joinDate,
        highScore: highScore,
        gamesPlayed: gamesPlayed,
        rank: rank,
        highestJump: Math.floor(highScore / 30), // Estimate based on score
        referralCount: referralCount,
        referralBonus: referralBonus,
        achievements: achievements,
        gameHistory: gameHistory,
        referralLink: generateReferralLink(userId || 'guest', username)
    };
}

/**
 * Format a date to YYYY-MM-DD format
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    if (isNaN(date.getTime())) {
        // If date is invalid, return today's date
        date = new Date();
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Get current user's data from localStorage/sessionStorage
 */
function getCurrentUserData() {
    console.log('Getting current user data from localStorage/sessionStorage');
    
    // Try to get user ID
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    console.log('User ID:', userId);
    
    if (!userId) {
        console.warn('No user ID found in localStorage or sessionStorage');
    }
    
    // Get username with fallback
    const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Guest Player';
    console.log('Username:', username);
    
    // Get score with fallback
    let highScore = 0;
    try {
        const fromLocalStorage = localStorage.getItem('highScore');
        const fromSessionStorage = sessionStorage.getItem('highScore');
        highScore = parseInt(fromLocalStorage || fromSessionStorage || '0');
        console.log('Score source:', fromLocalStorage ? 'localStorage' : (fromSessionStorage ? 'sessionStorage' : 'default'));
    } catch (e) {
        console.error('Error parsing score:', e);
    }
    console.log('Score:', highScore);
    
    // Get rank with fallback
    let rank = 1;
    try {
        rank = parseInt(localStorage.getItem('rank') || sessionStorage.getItem('rank') || '1');
    } catch (e) {
        console.error('Error parsing rank:', e);
    }
    console.log('Rank:', rank);
    
    // Calculate a join date (use today's date)
    const today = new Date();
    let joinDate;
    const storedJoinDate = localStorage.getItem('joinDate') || sessionStorage.getItem('joinDate');
    if (storedJoinDate) {
        joinDate = storedJoinDate;
        console.log('Using stored join date:', joinDate);
    } else {
        joinDate = formatDate(today);
        console.log('Generated join date:', joinDate);
    }
    console.log('Join Date:', joinDate);
    
    // Get games played or estimate
    let gamesPlayed = 5;
    try {
        const storedGames = localStorage.getItem('gamesPlayed') || sessionStorage.getItem('gamesPlayed');
        if (storedGames) {
            gamesPlayed = parseInt(storedGames);
        } else {
            gamesPlayed = Math.max(5, Math.floor(highScore / 500));
        }
    } catch (e) {
        console.error('Error parsing games played:', e);
    }
    console.log('Games Played:', gamesPlayed);
    
    // Get referral count with fallback
    let referralCount = 0;
    try {
        referralCount = parseInt(localStorage.getItem('referralCount') || sessionStorage.getItem('referralCount') || '0');
    } catch (e) {
        console.error('Error parsing referral count:', e);
    }
    console.log('Referral Count:', referralCount);
    
    // Get referral bonus with fallback
    let referralBonus = 0;
    try {
        referralBonus = parseInt(localStorage.getItem('referralBonus') || sessionStorage.getItem('referralBonus') || '0');
    } catch (e) {
        console.error('Error parsing referral bonus:', e);
    }
    console.log('Referral Bonus:', referralBonus);
    
    // Create achievements based on the user's score and rank
    const achievements = [];
    
    // Basic achievement for all users
    achievements.push({
        icon: 'fas fa-play-circle',
        name: 'Hop Bunny Player',
        description: 'Joined the hopping adventure'
    });
    
    // Achievement based on rank
    if (rank === 1) {
        achievements.push({
            icon: 'fas fa-crown',
            name: 'Top Hopper',
            description: 'Reached #1 on the leaderboard'
        });
    } else if (rank <= 3) {
        achievements.push({
            icon: 'fas fa-medal',
            name: 'Leaderboard Elite',
            description: `Reached #${rank} on the leaderboard`
        });
    } else if (rank <= 10) {
        achievements.push({
            icon: 'fas fa-award',
            name: 'Top 10',
            description: `Ranked #${rank} on the leaderboard`
        });
    }
    
    // Achievements based on score
    if (highScore >= 5000) {
        achievements.push({
            icon: 'fas fa-fire',
            name: '5K Master',
            description: 'Scored over 5,000 points'
        });
    } else if (highScore >= 1000) {
        achievements.push({
            icon: 'fas fa-star',
            name: '1K Club',
            description: 'Scored over 1,000 points'
        });
    }
    
    // Achievements based on referrals
    if (referralCount >= 10) {
        achievements.push({
            icon: 'fas fa-user-friends',
            name: 'Community Builder',
            description: 'Referred 10+ players to Hop Bunny'
        });
    } else if (referralCount >= 5) {
        achievements.push({
            icon: 'fas fa-user-plus',
            name: 'Friend Bringer',
            description: 'Referred 5+ players to Hop Bunny'
        });
    } else if (referralCount >= 1) {
        achievements.push({
            icon: 'fas fa-share-alt',
            name: 'Word Spreader',
            description: 'Referred their first player to Hop Bunny'
        });
    }
    
    // Generate some recent game history
    const gameHistory = [];
    
    // Add the best score game
    gameHistory.push({
        date: formatDate(today),
        score: highScore,
        isHighScore: true
    });
    
    // Add some additional game entries
    for (let i = 1; i <= 3; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(pastDate.getDate() - i);
        
        gameHistory.push({
            date: formatDate(pastDate),
            score: Math.floor(highScore * 0.8), // 80% of high score
            isHighScore: false
        });
    }
    
    console.log('Profile data prepared successfully');
    
    return {
        userId: userId || 'guest',
        username: username,
        joinDate: joinDate,
        highScore: highScore,
        gamesPlayed: gamesPlayed,
        rank: rank,
        highestJump: Math.floor(highScore / 30), // Estimate based on score
        referralCount: referralCount,
        referralBonus: referralBonus,
        achievements: achievements,
        gameHistory: gameHistory,
        referralLink: generateReferralLink(userId || 'guest', username)
    };
}

/**
 * Display the profile data
 */
function displayProfileData(userData) {
    // Hide loading state, show profile data
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    profileData.style.display = 'block';
    
    // Update profile elements with user data
    profileUsername.textContent = userData.username;
    joinDate.textContent = userData.joinDate;
    highScore.textContent = formatNumber(userData.highScore);
    gamesPlayed.textContent = formatNumber(userData.gamesPlayed);
    highestJump.textContent = formatNumber(userData.highestJump);
    
    // Format rank display with special icons for top 3
    const rankElement = document.getElementById('playerRank');
    const rank = userData.rank;
    let rankDisplay = '';
    
    if (rank === 1) {
        rankDisplay = `<i class="fas fa-crown" style="color: gold;"></i> ${rank}`;
        document.querySelector('.rank-card').classList.add('gold-rank');
    } else if (rank === 2) {
        rankDisplay = `<i class="fas fa-medal" style="color: silver;"></i> ${rank}`;
        document.querySelector('.rank-card').classList.add('silver-rank');
    } else if (rank === 3) {
        rankDisplay = `<i class="fas fa-award" style="color: #cd7f32;"></i> ${rank}`;
        document.querySelector('.rank-card').classList.add('bronze-rank');
    } else {
        rankDisplay = `<i class="fas fa-hashtag"></i> ${rank}`;
    }
    
    rankElement.innerHTML = rankDisplay;
    
    // Add top player class to profile header if in top 3
    if (rank <= 3) {
        const profileHeader = document.querySelector('.profile-header');
        if (profileHeader) {
            profileHeader.classList.add(`top-${rank}-player`);
        }
    }
    
    // Display achievements
    displayAchievements(userData.achievements);
    
    // Display game history
    displayGameHistory(userData.gameHistory);
    
    // Create and display referral section
    displayReferralSection(userData);
    
    // Add styles for top players
    addTopPlayerStyles(rank);
    
    // Animate in the content
    animateProfileContent();
}

/**
 * Display the referral section with stats and referral link
 */
function displayReferralSection(userData) {
    // Create referral section if it doesn't exist
    let referralSection = document.querySelector('.referral-section');
    
    if (!referralSection) {
        // Create the referral section
        referralSection = document.createElement('div');
        referralSection.className = 'referral-section';
        
        // Create section title
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = '<i class="fas fa-user-plus"></i> Invite Friends';
        
        // Create referral stats 
        const referralStats = document.createElement('div');
        referralStats.className = 'referral-stats';
        
        // Create referral link container
        const referralLinkContainer = document.createElement('div');
        referralLinkContainer.className = 'referral-link-container';
        
        // Add the elements to the section
        referralSection.appendChild(sectionTitle);
        referralSection.appendChild(referralStats);
        referralSection.appendChild(referralLinkContainer);
        
        // Insert the referral section before the actions row
        const actionsRow = document.querySelector('.actions-row');
        profileData.insertBefore(referralSection, actionsRow);
    }
    
    // Populate referral stats
    const referralStats = referralSection.querySelector('.referral-stats');
    referralStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-icon"><i class="fas fa-users"></i></div>
            <div class="stat-info">
                <div class="stat-value">${userData.referralCount || 0}</div>
                <div class="stat-label">Friends Referred</div>
            </div>
        </div>
        <div class="stat-item">
            <div class="stat-icon"><i class="fas fa-gift"></i></div>
            <div class="stat-info">
                <div class="stat-value">${userData.referralBonus || 0}</div>
                <div class="stat-label">Bonus Points</div>
            </div>
        </div>
    `;
    
    // Populate referral link container
    const referralLinkContainer = referralSection.querySelector('.referral-link-container');
    referralLinkContainer.innerHTML = `
        <p class="referral-info">Share your unique link with friends. When they sign up, you'll both earn 500 bonus points!</p>
        <div class="referral-link-group">
            <input type="text" id="referralLinkInput" value="${userData.referralLink}" readonly>
            <div class="referral-buttons">
                <button id="copyReferralButton" class="game-button small-button" onclick="copyReferralLink()">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button id="shareReferralButton" class="game-button small-button primary-button" onclick="shareReferralLink()">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        </div>
    `;
    
    // Add styles if not added already
    if (!document.getElementById('referral-styles')) {
        addReferralStyles();
    }
}

/**
 * Add CSS styles for top ranked players
 */
function addTopPlayerStyles(rank) {
    // Check if styles have already been added
    if (document.getElementById('top-player-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'top-player-styles';
    
    // Define styles for top players
    const css = `
        .gold-rank {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)) !important;
            border: 2px solid rgba(255, 215, 0, 0.3) !important;
        }
        
        .gold-rank .stat-icon {
            color: gold !important;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.7) !important;
        }
        
        .silver-rank {
            background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.05)) !important;
            border: 2px solid rgba(192, 192, 192, 0.3) !important;
        }
        
        .silver-rank .stat-icon {
            color: silver !important;
            text-shadow: 0 0 10px rgba(192, 192, 192, 0.7) !important;
        }
        
        .bronze-rank {
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.05)) !important;
            border: 2px solid rgba(205, 127, 50, 0.3) !important;
        }
        
        .bronze-rank .stat-icon {
            color: #cd7f32 !important;
            text-shadow: 0 0 10px rgba(205, 127, 50, 0.7) !important;
        }
        
        .top-1-player {
            border: 2px solid rgba(255, 215, 0, 0.5) !important;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)) !important;
        }
        
        .top-2-player {
            border: 2px solid rgba(192, 192, 192, 0.5) !important;
            background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.05)) !important;
        }
        
        .top-3-player {
            border: 2px solid rgba(205, 127, 50, 0.5) !important;
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.05)) !important;
        }
        
        .score-card {
            ${rank === 1 ? 'background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)) !important; border: 2px solid rgba(255, 215, 0, 0.3) !important;' : ''}
            ${rank === 2 ? 'background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.05)) !important; border: 2px solid rgba(192, 192, 192, 0.3) !important;' : ''}
            ${rank === 3 ? 'background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.05)) !important; border: 2px solid rgba(205, 127, 50, 0.3) !important;' : ''}
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Display achievements
 */
function displayAchievements(achievements) {
    // Clear previous achievements
    achievementsList.innerHTML = '';
    
    if (!achievements || achievements.length === 0) {
        achievementsList.innerHTML = `
            <div class="achievement" style="grid-column: 1 / -1; justify-content: center;">
                <p>No achievements yet.</p>
            </div>
        `;
        return;
    }
    
    // Add achievement items
    achievements.forEach(achievement => {
        const achievementItem = document.createElement('div');
        achievementItem.className = 'achievement';
        
        achievementItem.innerHTML = `
            <div class="achievement-icon">
                <i class="${achievement.icon}"></i>
            </div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        achievementsList.appendChild(achievementItem);
    });
}

/**
 * Display game history
 */
function displayGameHistory(gameHistory) {
    // Clear previous game history
    gameHistoryList.innerHTML = '';
    
    if (!gameHistory || gameHistory.length === 0) {
        gameHistoryList.innerHTML = `
            <div class="game-record" style="justify-content: center;">
                <p>No game history available.</p>
            </div>
        `;
        return;
    }
    
    // Add game history items
    gameHistory.forEach(game => {
        const gameRecord = document.createElement('div');
        gameRecord.className = 'game-record';
        
        // Determine if this was a high score game
        const isHighScore = game.isHighScore;
        
        gameRecord.innerHTML = `
            <div class="game-date">${game.date}</div>
            <div class="game-score">${formatNumber(game.score)} pts</div>
            <div class="score-badge ${isHighScore ? 'high-score' : ''}">
                ${isHighScore ? 'Best Score' : 'Regular Game'}
            </div>
        `;
        
        gameHistoryList.appendChild(gameRecord);
    });
}

/**
 * Animate profile content when it loads
 */
function animateProfileContent() {
    // Animate stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 100 + (index * 100));
    });
    
    // Animate other sections
    const sections = [
        document.querySelector('.profile-header'),
        document.querySelector('.achievement-section'),
        document.querySelector('.game-history'),
        document.querySelector('.actions-row')
    ];
    
    sections.forEach((section, index) => {
        if (!section) return;
        
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.4s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
    });
}

/**
 * Show error message
 */
function showError(message) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    profileData.style.display = 'none';
    
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message || 'Could not load the requested profile. The user may not exist or there was a connection error.';
    }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Set up animations for particles to match the blue bubble style
 */
function setupParticleAnimations() {
    const particles = document.querySelectorAll('.particle');
    
    particles.forEach((particle, index) => {
        // Random size between 8px and 30px
        const size = 8 + Math.random() * 22;
        
        // Random starting position
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        
        // Random animation duration between 20-40s
        const duration = 20 + Math.random() * 20;
        
        // Random delay
        const delay = Math.random() * 5;
        
        // Random opacity
        const opacity = 0.1 + Math.random() * 0.15;
        
        // Apply styles
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${startX}%`;
        particle.style.top = `${startY}%`;
        particle.style.opacity = opacity;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        // Add custom animation path
        if (index % 3 === 0) {
            // Floating up animation
            particle.style.animation = `floatUp ${duration}s ${delay}s infinite linear`;
        } else if (index % 3 === 1) {
            // Diagonal animation
            particle.style.animation = `floatDiagonal ${duration}s ${delay}s infinite linear`;
        } else {
            // Circular animation
            particle.style.animation = `floatCircular ${duration}s ${delay}s infinite linear`;
        }
    });
}

/**
 * Generate a referral link for a user
 */
function generateReferralLink(userId, username) {
    // Create a base URL for the referral
    const baseUrl = window.location.origin;
    const path = window.location.pathname.replace('profile.html', 'index.html');
    const referralCode = btoa(`${userId}:${username}`); // Simple encoding of userId and username
    
    return `${baseUrl}${path}?ref=${referralCode}`;
}

/**
 * Copy referral link to clipboard
 */
function copyReferralLink() {
    const referralLink = document.getElementById('referralLinkInput').value;
    
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = referralLink;
    document.body.appendChild(tempInput);
    
    // Select and copy the text
    tempInput.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(tempInput);
    
    // Show success message
    const copyButton = document.getElementById('copyReferralButton');
    const originalText = copyButton.innerHTML;
    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
    copyButton.classList.add('success');
    
    // Reset after 2 seconds
    setTimeout(() => {
        copyButton.innerHTML = originalText;
        copyButton.classList.remove('success');
    }, 2000);
}

/**
 * Share referral link using Web Share API (if available)
 */
function shareReferralLink() {
    const referralLink = document.getElementById('referralLinkInput').value;
    const shareText = `Join me on Hop Bunny and get a bonus! Use my referral link:`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join me on Hop Bunny!',
            text: shareText,
            url: referralLink
        })
        .then(() => console.log('Shared successfully'))
        .catch(error => console.log('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support Web Share API
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + referralLink)}`, '_blank');
    }
}

/**
 * Get mock user data for demo purposes
 * In a real app, this would be replaced with API calls
 */
function getMockUserData(userId) {
    // For demo purposes, we'll have a few mock users
    const mockUsers = [
        {
            userId: '1',
            username: 'MasterHopper',
            joinDate: '2023-05-15',
            highScore: 45780,
            gamesPlayed: 156,
            rank: 1,
            highestJump: 1250,
            achievements: [
                {
                    icon: 'fas fa-crown',
                    name: 'Top Player',
                    description: 'Reached #1 on the leaderboard'
                },
                {
                    icon: 'fas fa-fire',
                    name: 'Hot Streak',
                    description: 'Played 20 games in one day'
                },
                {
                    icon: 'fas fa-bolt',
                    name: 'Speed Runner',
                    description: 'Reached 1000 points in under 30 seconds'
                },
                {
                    icon: 'fas fa-star',
                    name: '10K Club',
                    description: 'Scored over 10,000 points'
                }
            ],
            gameHistory: [
                { date: '2023-08-10', score: 45780, isHighScore: true },
                { date: '2023-08-09', score: 42150, isHighScore: false },
                { date: '2023-08-08', score: 38920, isHighScore: false },
                { date: '2023-08-07', score: 35670, isHighScore: false },
                { date: '2023-08-06', score: 31540, isHighScore: false }
            ]
        },
        {
            userId: '2',
            username: 'BunnyJumper',
            joinDate: '2023-06-22',
            highScore: 38950,
            gamesPlayed: 89,
            rank: 2,
            highestJump: 1150,
            achievements: [
                {
                    icon: 'fas fa-medal',
                    name: 'Silver League',
                    description: 'Reached #2 on the leaderboard'
                },
                {
                    icon: 'fas fa-star',
                    name: '10K Club',
                    description: 'Scored over 10,000 points'
                },
                {
                    icon: 'fas fa-heart',
                    name: 'Dedicated Player',
                    description: 'Played 50+ games'
                }
            ],
            gameHistory: [
                { date: '2023-08-09', score: 38950, isHighScore: true },
                { date: '2023-08-08', score: 36780, isHighScore: false },
                { date: '2023-08-07', score: 33400, isHighScore: false },
                { date: '2023-08-05', score: 31200, isHighScore: false }
            ]
        },
        {
            userId: '3',
            username: 'HopKing',
            joinDate: '2023-04-30',
            highScore: 36240,
            gamesPlayed: 112,
            rank: 3,
            highestJump: 1080,
            achievements: [
                {
                    icon: 'fas fa-award',
                    name: 'Bronze League',
                    description: 'Reached #3 on the leaderboard'
                },
                {
                    icon: 'fas fa-star',
                    name: '10K Club',
                    description: 'Scored over 10,000 points'
                },
                {
                    icon: 'fas fa-calendar-check',
                    name: 'Consistency',
                    description: 'Played every day for a week'
                }
            ],
            gameHistory: [
                { date: '2023-08-10', score: 36240, isHighScore: true },
                { date: '2023-08-09', score: 34150, isHighScore: false },
                { date: '2023-08-08', score: 32980, isHighScore: false },
                { date: '2023-08-07', score: 30500, isHighScore: false }
            ]
        }
    ];
    
    // Find the user
    return mockUsers.find(user => user.userId === userId) || null;
}

/**
 * Add styles for the referral section
 */
function addReferralStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.id = 'referral-styles';
    
    // Define styles for referral section
    const css = `
        .referral-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(5px);
        }
        
        .referral-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            margin: 5px;
            flex: 1;
            min-width: 180px;
            max-width: 250px;
        }
        
        .stat-item .stat-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(52, 152, 219, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
        }
        
        .stat-item .stat-icon i {
            font-size: 18px;
            color: #3498db;
        }
        
        .stat-item .stat-info {
            flex: 1;
        }
        
        .stat-item .stat-value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 3px;
            color: #ffffff;
        }
        
        .stat-item .stat-label {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .referral-info {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 15px;
            text-align: center;
            padding: 0 10px;
        }
        
        .referral-link-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        #referralLinkInput {
            background: rgba(30, 30, 30, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 12px;
            border-radius: 10px;
            color: white;
            font-size: 14px;
            width: 100%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .referral-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .game-button.small-button {
            padding: 8px 12px;
            font-size: 14px;
            min-width: 100px;
        }
        
        .game-button.success {
            background-color: #2ecc71;
            box-shadow: 0 4px 0 #27ae60;
        }
        
        .game-button.success:hover {
            background-color: #27ae60;
            box-shadow: 0 4px 0 #219d55;
        }
        
        @media (max-width: 500px) {
            .referral-link-group {
                flex-direction: column;
            }
            
            #referralLinkInput {
                margin-bottom: 10px;
                font-size: 12px;
                padding: 10px;
            }
            
            .stat-item {
                min-width: 100%;
                margin: 5px 0;
            }
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Add enhanced styles for buttons
 */
function enhanceButtonStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.id = 'enhanced-button-styles';
    
    // Define the improved button styles
    const css = `
        .game-button {
            background: linear-gradient(135deg, #ff5f6d, #ff8e52) !important;
            border: none !important;
            border-radius: 30px !important;
            box-shadow: 0 8px 20px rgba(255, 95, 109, 0.5) !important;
            padding: 16px 25px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            letter-spacing: 1px !important;
            color: white !important;
            transition: all 0.3s ease !important;
            position: relative !important;
            overflow: hidden !important;
            z-index: 1 !important;
            transform: translateY(0) !important;
        }
        
        .game-button::before {
            content: '' !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: linear-gradient(135deg, #ff8e52, #ff5f6d) !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
            z-index: -1 !important;
            border-radius: 30px !important;
        }
        
        .game-button:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 10px 25px rgba(255, 95, 109, 0.6) !important;
        }
        
        .game-button:hover::before {
            opacity: 1 !important;
        }
        
        .game-button:active {
            transform: translateY(1px) !important;
            box-shadow: 0 5px 15px rgba(255, 95, 109, 0.4) !important;
        }
        
        .game-button.primary-button {
            background: linear-gradient(135deg, #5b9be2, #3498db) !important;
            box-shadow: 0 8px 20px rgba(52, 152, 219, 0.5) !important;
        }
        
        .game-button.primary-button::before {
            background: linear-gradient(135deg, #3498db, #2980b9) !important;
        }
        
        .game-button.primary-button:hover {
            box-shadow: 0 10px 25px rgba(52, 152, 219, 0.6) !important;
        }
        
        .game-button.primary-button:active {
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4) !important;
        }
        
        .game-button i {
            margin-right: 10px !important;
            font-size: 18px !important;
            vertical-align: middle !important;
        }
        
        .actions-row {
            display: flex !important;
            justify-content: center !important;
            gap: 20px !important;
            margin-top: 30px !important;
            margin-bottom: 30px !important;
        }
        
        .actions-row .game-button {
            min-width: 180px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* For mobile */
        @media (max-width: 480px) {
            .game-button {
                padding: 14px 20px !important;
                font-size: 14px !important;
            }
            
            .actions-row {
                flex-direction: column !important;
                align-items: center !important;
            }
            
            .actions-row .game-button {
                width: 100% !important;
                max-width: 280px !important;
            }
        }
    `;
    
    // Add the styles to the style element
    style.textContent = css;
    
    // Append the style element to the head
    document.head.appendChild(style);
    
    console.log('Enhanced button styles applied');
} 