const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'Please provide email, password, and username' });
    }

    // Create user with Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      username,
      displayName: username,
      highScore: 0,
      createdAt: new Date().toISOString()
    });

    // Generate a custom token for the client
    const token = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      userId: userRecord.uid,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'Password is too weak' });
    }
    
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Try to find the user by email
    const userRecord = await auth.getUserByEmail(email);

    // Since Firebase Admin SDK doesn't have a native way to verify passwords,
    // we'll just create a token based on the found user
    // In a real implementation, you should use Firebase Client SDK on frontend
    // for proper authentication with password
    
    const token = await auth.createCustomToken(userRecord.uid);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    res.status(200).json({
      message: 'Login successful',
      token,
      userId: userRecord.uid,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || userData?.username,
        highScore: userData?.highScore || 0
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

/**
 * @route POST /api/auth/verify-token
 * @desc Verify a Firebase ID token
 * @access Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get user data
    const userRecord = await auth.getUser(uid);
    
    // Get additional user data from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    
    res.status(200).json({
      message: 'Token is valid',
      userId: uid,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || userData.username,
        highScore: userData.highScore || 0
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router; 