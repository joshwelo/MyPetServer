require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Firebase Admin SDK using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI
  })
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint to store and send push notifications
app.post('/register-token', async (req, res) => {
  try {
    const { token, userId } = req.body;

    // Validate input
    if (!token || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and userId are required' 
      });
    }

    // Save token to your database (example using Firestore)
    await admin.firestore().collection('user-tokens').doc(userId).set({
      token: token,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      success: true, 
      message: 'Token registered successfully' 
    });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to register token' 
    });
  }
});

// Endpoint to send push notification
app.post('/send-notification', async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    // Retrieve user's FCM token
    const userTokenDoc = await admin.firestore()
      .collection('user-tokens')
      .doc(userId)
      .get();
    if (!userTokenDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'No token found for user' 
      });
    }

    const registrationToken = userTokenDoc.data().token;

    // Comprehensive notification payload
    const message = {
      notification: {
        title: title,
        body: body
      },
      token: registrationToken,
      webpush: {
        notification: {
          requireInteraction: true
        }
      }
    };

    // Send notification
    const response = await admin.messaging().send(message);

    res.status(200).json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });
  } catch (error) {
    console.error('Notification sending error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification' 
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});