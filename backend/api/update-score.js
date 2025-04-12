const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

/**
 * @route POST /api/update-score
 * @desc Update user's score
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { userId, score } = req.body;
    
    // Validate input
    if (!userId || score === undefined || score === null) {
      return res.status(400).json({ message: 'User ID and score are required' });
    }
    
    // Make sure score is a number
    const numericScore = parseInt(score);
    if (isNaN(numericScore)) {
      return res.status(400).json({ message: 'Score must be a number' });
    }
    
    // Get the user's current data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in database' });
    }
    
    const userData = userDoc.data();
    const currentScore = userData.score || userData.highScore || 0;
    const currentHighScore = userData.highScore || 0;
    
    // Calculate new cumulative score
    const newCumulativeScore = currentScore + numericScore;
    
    // Keep track of highest single-game score
    const highestSingleScore = Math.max(numericScore, currentHighScore);
    
    // Update the user document
    await userRef.update({
      score: newCumulativeScore,
      highScore: highestSingleScore,
      lastGameScore: numericScore,
      gamesPlayed: (userData.gamesPlayed || 0) + 1,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`User ${userId} score updated: +${numericScore} points (total: ${newCumulativeScore})`);
    
    return res.status(200).json({
      message: 'Score updated successfully',
      previousScore: currentScore,
      addedScore: numericScore,
      totalScore: newCumulativeScore,
      highestSingleGameScore: highestSingleScore,
      gamesPlayed: (userData.gamesPlayed || 0) + 1
    });
    
  } catch (error) {
    console.error('Error updating score:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Error updating score', error: error.message });
  }
});

module.exports = router; 