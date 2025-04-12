const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper function to format timestamp into a readable date string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  
  let date;
  if (timestamp._seconds) {
    // Firestore Timestamp format
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp.seconds) {
    // Another possible Firestore format
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'string') {
    // ISO string format
    date = new Date(timestamp);
  } else {
    // If it's already a Date object or timestamp in milliseconds
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return null;
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * @route GET /api/users
 * @desc Get all registered users with pagination and filtering
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc', username } = req.query;
    
    // Convert parameters to appropriate types
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    // Start building the query
    let query = db.collection('users');
    
    // Apply filtering if username is provided
    if (username) {
      // Firebase doesn't support case-insensitive filtering natively
      // We're using a simple "starts with" filter here
      query = query.orderBy('username')
                   .startAt(username)
                   .endAt(username + '\uf8ff');
    } else {
      // Apply sorting
      query = query.orderBy(sortBy, sortDir);
    }
    
    // Apply pagination
    query = query.limit(limitNum).offset(offsetNum);
    
    // Execute the query
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.status(200).json({ users: [], total: 0 });
    }
    
    // Get total count for pagination info
    const totalSnapshot = await db.collection('users').count().get();
    const total = totalSnapshot.data().count;
    
    // Process the results
    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        score: userData.score || userData.highScore || 0,
        highScore: userData.highScore || 0,
        lastGameScore: userData.lastGameScore || 0,
        gamesPlayed: userData.gamesPlayed || 0,
        createdAt: formatTimestamp(userData.createdAt)
      });
    });
    
    res.status(200).json({
      users,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: users.length + offsetNum < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

module.exports = router; 