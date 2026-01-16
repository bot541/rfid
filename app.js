// Import required modules
const express = require('express');
const path = require('path');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Make sure firebase-service-account.json is in your project root
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://YOUR-PROJECT-ID.firebaseio.com" // Replace with your Firebase project URL
  });
  
  console.log('✓ Firebase initialized successfully');
} catch (error) {
  console.error('⚠️  Firebase initialization failed:', error.message);
  console.log('Server will run without Firebase integration');
}

const db = admin.firestore();

// Create Express application
const app = express();
const PORT = 8080; // Using port 8080 as you mentioned

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

// Enable CORS for ESP8266 requests
app.use(cors());

// Parse incoming JSON data
app.use(express.json());

// Parse URL-encoded data (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Log all incoming requests (helpful for debugging ESP8266)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// IN-MEMORY DATA STORAGE (Backup)
// ==========================================

let attendanceRecords = [];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Fetch student details from Firebase using card ID
 */
async function getStudentDetails(cardId) {
  try {
    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.where('cardId', '==', cardId).get();
    
    if (snapshot.empty) {
      console.log(`No student found with cardId: ${cardId}`);
      return null;
    }
    
    const studentDoc = snapshot.docs[0];
    return {
      id: studentDoc.id,
      ...studentDoc.data()
    };
  } catch (error) {
    console.error('Error fetching student details:', error);
    return null;
  }
}

/**
 * Save attendance record to Firebase
 */
async function saveToFirebase(attendanceData) {
  try {
    const attendanceRef = db.collection('attendance');
    const docRef = await attendanceRef.add({
      ...attendanceData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✓ Saved to Firebase with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving to Firebase:', error);
    return null;
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * POST /attendance
 * Receives attendance from ESP8266 or manual submission
 * Expected: { cardId: "ABC123", time: "2024-01-16T10:30:00" } or just { cardId: "ABC123" }
 */
app.post('/attendance', async (req, res) => {
  // Extract data from request body
  const { cardId, time } = req.body;

  // Validation
  if (!cardId) {
    return res.status(400).json({
      success: false,
      message: 'cardId is required'
    });
  }

  // Use provided time or current time
  const timestamp = time || new Date().toISOString();

  console.log(`📝 Attendance request received for card: ${cardId}`);

  // Fetch student details from Firebase
  const student = await getStudentDetails(cardId);

  // Create attendance record
  const record = {
    id: attendanceRecords.length + 1,
    cardId: cardId,
    timestamp: timestamp,
    recordedAt: new Date().toISOString(),
    student: student || { name: 'Unknown Student', class: 'N/A' }
  };

  // Add to in-memory storage
  attendanceRecords.push(record);

  // Save to Firebase
  const firebaseId = await saveToFirebase({
    cardId: cardId,
    timestamp: timestamp,
    studentId: student ? student.id : null,
    studentName: student ? student.name : 'Unknown',
    class: student ? student.class : 'N/A'
  });

  // Log to console
  console.log('✓ Attendance recorded:', {
    cardId,
    student: student ? student.name : 'Unknown',
    firebaseId
  });

  // Send success response
  res.status(201).json({
    success: true,
    message: 'Attendance recorded successfully',
    data: {
      ...record,
      firebaseId: firebaseId
    }
  });
});

/**
 * GET /attendance
 * Retrieves all attendance records from Firebase
 */
app.get('/attendance', async (req, res) => {
  try {
    const attendanceRef = db.collection('attendance');
    const snapshot = await attendanceRef
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      count: records.length,
      data: records,
      source: 'firebase'
    });
  } catch (error) {
    // Fallback to in-memory if Firebase fails
    console.error('Firebase fetch failed, using local data:', error.message);
    res.json({
      success: true,
      count: attendanceRecords.length,
      data: attendanceRecords,
      source: 'memory'
    });
  }
});

/**
 * GET /attendance/latest
 * Gets the most recent 10 attendance records
 */
app.get('/attendance/latest', async (req, res) => {
  try {
    const attendanceRef = db.collection('attendance');
    const snapshot = await attendanceRef
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    // Fallback to in-memory
    const latest = attendanceRecords.slice(-10).reverse();
    res.json({
      success: true,
      count: latest.length,
      data: latest
    });
  }
});

/**
 * GET /attendance/today
 * Gets today's attendance records
 */
app.get('/attendance/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendanceRef = db.collection('attendance');
    const snapshot = await attendanceRef
      .where('createdAt', '>=', today)
      .orderBy('createdAt', 'desc')
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s attendance'
    });
  }
});

/**
 * POST /students/register
 * Register a new student with RFID card
 */
app.post('/students/register', async (req, res) => {
  const { cardId, name, studentClass, rollNumber } = req.body;

  if (!cardId || !name) {
    return res.status(400).json({
      success: false,
      message: 'cardId and name are required'
    });
  }

  try {
    const studentsRef = db.collection('students');
    const docRef = await studentsRef.add({
      cardId: cardId,
      name: name,
      class: studentClass || 'N/A',
      rollNumber: rollNumber || 'N/A',
      registeredAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✓ Student registered:', name);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        id: docRef.id,
        cardId,
        name
      }
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register student'
    });
  }
});

/**
 * GET /students
 * Get all registered students
 */
app.get('/students', async (req, res) => {
  try {
    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.orderBy('name').get();
    
    const students = [];
    snapshot.forEach(doc => {
      students.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
});

/**
 * DELETE /attendance/clear
 * Clears in-memory records (Firebase data remains)
 */
app.delete('/attendance/clear', (req, res) => {
  const count = attendanceRecords.length;
  attendanceRecords = [];
  
  console.log(`✓ Cleared ${count} in-memory records`);
  
  res.json({
    success: true,
    message: `Cleared ${count} local records (Firebase data unchanged)`
  });
});

/**
 * GET /test
 * Simple endpoint to test if server is running (useful for ESP8266)
 */
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🎓 RFID Attendance System Started');
  console.log('=================================');
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/index.html`);
  console.log(`\nESP8266 Endpoint: http://YOUR_IP:${PORT}/attendance`);
  console.log('\nPress Ctrl+C to stop the server');
  console.log('=================================\n');
});