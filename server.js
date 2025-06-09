
const express = require('express');
// const admin = require('firebase-admin'); // Firebase Admin SDK is removed
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const path = require('path'); // Added for path.resolve if FIREBASE_SERVICE_ACCOUNT_PATH is used

const app = express();
app.use(cors());
// Increase payload limit for large data like signature data URLs
app.use(express.json({ limit: '2mb' }));


// --- Firebase Admin SDK Initialization (REMOVED) ---
// let firebaseInitialized = false;
// try {
//   const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
//   console.log(`SERVER.JS: Attempting to load Firebase service account from: ${firebaseServiceAccountPath}`);
  
//   try {
//     require('fs').statSync(path.resolve(firebaseServiceAccountPath)); 
//     const serviceAccount = require(path.resolve(firebaseServiceAccountPath));
//     if (admin.apps.length === 0) {
//       admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//       });
//       console.log("SERVER.JS: Firebase Admin SDK initialized successfully.");
//       firebaseInitialized = true;
//     } else {
//       admin.app(); 
//       console.log("SERVER.JS: Firebase Admin SDK already initialized (re-using existing instance).");
//       firebaseInitialized = true;
//     }
//   } catch (fileError) {
//       console.error(`SERVER.JS CRITICAL ERROR: Could not load or access Firebase service account file at ${firebaseServiceAccountPath}. Error: ${fileError.message}`);
//   }
// } catch (error) {
//   console.error("SERVER.JS CRITICAL ERROR: Failed to initialize Firebase Admin SDK. Error:", error.message);
//   console.error("Full Firebase initialization error object:", error);
// }

// --- MongoDB Setup ---
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'droppurityDB';

let mongoClientGlobal; 

async function connectToMongoDBForTest(uri, databaseName) {
  if (!uri) {
    console.error("SERVER.JS CRITICAL ERROR: MONGODB_URI not found in environment variables. Please check your .env.local file.");
    throw new Error("SERVER.JS: MongoDB configuration missing: MONGODB_URI is undefined.");
  }
  console.log(`SERVER.JS: Attempting MongoDB connection test to: ${databaseName}`);
  const testClient = new MongoClient(uri);
  try {
    await testClient.connect();
    console.log(`SERVER.JS: MongoDB connection test successful for database: ${databaseName}`);
    await testClient.db(databaseName).command({ ping: 1 });
    console.log("SERVER.JS: Ping to MongoDB successful.");
    await testClient.close();
    return true;
  } catch (err) {
    console.error(`SERVER.JS CRITICAL ERROR: Failed to connect to MongoDB (${databaseName}) during startup test. Error: ${err.message}`);
    if (err.name === 'MongoNetworkError') {
      console.error('Details: This might be a network issue or the MongoDB server is not reachable (check Atlas IP Allowlist, VPN, etc.).');
    } else if (err.name === 'MongoServerError' && err.message.includes('authentication failed')) {
      console.error('Details: MongoDB authentication failed. Check your username and password in MONGODB_URI.');
    } else if (err.name === 'MongoServerError' && err.message.includes('command find requires authentication')) {
      console.error('Details: MongoDB command requires authentication. This could be a permission issue for the user in Atlas, especially related to roles needed for replica set discovery (e.g., on `local` or `admin` dbs).');
    } else if (err.codeName === 'AtlasError') {
        console.error("Details: This is an Atlas-specific error. Check IP access list, network peering, or connection string options for Atlas.");
    } else {
      console.error("Details: An unexpected MongoDB error occurred:", err);
    }
    throw err; 
  }
}


// --- Route: Register customer ---
app.post('/register-customer', async (req, res) => {
  console.log("SERVER.JS: /register-customer endpoint hit (MongoDB only).");
  // Firebase check removed
  // if (!firebaseInitialized) {
  //   console.error("SERVER.JS /register-customer: Firebase Admin SDK not available.");
  //   return res.status(500).send({ success: false, message: 'Internal Server Error: Firebase Admin SDK not available.' });
  // }
  if (!mongoUri) {
      console.error("SERVER.JS /register-customer: MongoDB URI not configured.");
      return res.status(500).send({ success: false, message: 'Internal Server Error: Database URI not configured.' });
  }

  // All data from the frontend form is expected in req.body
  const customerDocument = {
    ...req.body, // Captures all fields sent from the frontend
    registeredAt: new Date(),
  };

  // Basic validation for a few key fields from the comprehensive form
  if (!customerDocument.customerName || !customerDocument.customerPhone || !customerDocument.generatedCustomerId) {
    console.warn("SERVER.JS /register-customer: Missing required fields (name, phone, or customerId). Body:", req.body);
    return res.status(400).send({ success: false, message: 'Bad Request: Missing required customer details.' });
  }
  
  let currentRequestClient; 
  try {
    currentRequestClient = new MongoClient(mongoUri);
    await currentRequestClient.connect();
    const db = currentRequestClient.db(dbName);
    const customersCollection = db.collection('customers'); // Collection name is 'customers'
    
    // No Firebase user fetching logic
    
    const result = await customersCollection.insertOne(customerDocument);
    
    const customerIdFromResult = result.insertedId;
    console.log('SERVER.JS: Customer registration data saved to MongoDB. Result acknowledged:', result.acknowledged, 'Saved Customer ID:', customerIdFromResult);
    res.status(201).send({ success: true, customerId: customerIdFromResult, message: 'Customer registered successfully with MongoDB.' });

  } catch (err) {
    console.error('SERVER.JS Error during /register-customer:', err);
    if (err.name && (err.name.includes('MongoNetworkError') || err.name.includes('MongoServerSelectionError') || err.name.includes('MongoNotConnectedError') || err.name.includes('MongoTimeoutError'))) {
      res.status(503).send({ success: false, message: 'Database connection error. Please try again later.', details: err.message });
    } else if (err.code === 11000) { 
      res.status(409).send({ success: false, message: 'Duplicate entry. This customer might already be registered.', details: err.message });
    }
    else {
      res.status(500).send({ success: false, message: 'Error registering customer.', details: err.message });
    }
  } finally {
    if (currentRequestClient) {
      await currentRequestClient.close();
    }
  }
});

// --- Route: Sync Firebase user to MongoDB users collection (REMOVED as Firebase integration is removed) ---
// app.post('/sync-user', async (req, res) => { ... });

// --- Server Start ---
const PORT = process.env.PORT || 3001;

async function startServer() {
  console.log("SERVER.JS: Attempting to start server (MongoDB only)...");
  try {
    // Firebase related checks removed
    // if (!firebaseInitialized && process.env.REQUIRE_FIREBASE_FOR_SERVER_START === 'true') { ... }

    await connectToMongoDBForTest(mongoUri, dbName);
    
    mongoClientGlobal = new MongoClient(mongoUri); 

    app.listen(PORT, () => {
      console.log(`SERVER.JS: DropPurity Backend Server (MongoDB only) running on http://localhost:${PORT}`);
      console.log(`SERVER.JS: Target Database: ${dbName}`);
      console.log("SERVER.JS: Endpoints available:");
      console.log(`  POST http://localhost:${PORT}/register-customer`);
      // console.log(`  POST http://localhost:${PORT}/sync-user`); // Removed
    });
  } catch (error) {
    console.error("SERVER.JS: SERVER FAILED TO START due to critical errors (likely MongoDB initialization). Please check logs above.");
    process.exit(1); 
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SERVER.JS: SIGINT signal received: Shutting down server.');
  if (mongoClientGlobal && typeof mongoClientGlobal.isConnected === 'function' && mongoClientGlobal.isConnected()) {
    await mongoClientGlobal.close();
    console.log('SERVER.JS: MongoDB global client connection closed.');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SERVER.JS: SIGTERM signal received: Shutting down server.');
  if (mongoClientGlobal && typeof mongoClientGlobal.isConnected === 'function' && mongoClientGlobal.isConnected()) {
    await mongoClientGlobal.close();
    console.log('SERVER.JS: MongoDB global client connection closed.');
  }
  process.exit(0);
});
