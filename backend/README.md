# Hop Bunny Backend

Backend API for the Hop Bunny game, built with Express.js and Firebase, designed to be deployed on Vercel.

## Features

- User authentication (register, login)
- User profile management
- Game score tracking
- CORS enabled to accept requests from any origin

## Setup

### Prerequisites

- Node.js 14+ installed
- Firebase project created with Authentication and Firestore enabled
- Firebase service account key (for local development)

### Local Development

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file based on `.env.example` and add your Firebase configuration:
   ```
   cp .env.example .env
   ```
5. Fill in your Firebase credentials in the `.env` file
6. Start the development server:
   ```
   npm run dev
   ```

The server will run on `http://localhost:3000` by default.

### Vercel Deployment

1. Install the Vercel CLI:
   ```
   npm i -g vercel
   ```
2. Login to Vercel:
   ```
   vercel login
   ```
3. Deploy:
   ```
   vercel
   ```
4. Add the environment variables in Vercel dashboard:
   - Go to your project settings
   - Add the `FIREBASE_SERVICE_ACCOUNT` and `FIREBASE_DATABASE_URL` environment variables
   - Redeploy if necessary

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login an existing user
- `POST /api/auth/verify-token` - Verify a Firebase token

### User

- `GET /api/user/:userId` - Get user data
- `PUT /api/user/:userId` - Update user data

### Score

- `POST /api/update-score` - Update user's high score

## Security

- All endpoints that require authentication use Firebase token verification
- CORS is configured to accept requests from any origin for flexibility

## Client-Side Integration

Here's how to integrate this backend into your game:

### User Registration

```javascript
async function registerUser(email, password, username) {
  try {
    const response = await fetch('https://your-vercel-app.vercel.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        username
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    // Store the token and user ID in localStorage or sessionStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    
    return data;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
}
```

### User Login

```javascript
async function loginUser(email, password) {
  try {
    const response = await fetch('https://your-vercel-app.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store the token and user ID in localStorage or sessionStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    
    return data;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
}
```

### Update Score

```javascript
async function updateScore(score) {
  try {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch('https://your-vercel-app.vercel.app/api/update-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        score
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update score');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating score:', error);
    throw error;
  }
}
```

### Get User Data

```javascript
async function getUserData() {
  try {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`https://your-vercel-app.vercel.app/api/user/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user data');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
}
``` 