
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, MongoError } from 'mongodb';

console.log('API Route Module: /api/register-customer/route.ts loaded.');

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route: connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route: Using cached MongoDB connection and client is connected.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route CRITICAL ERROR: MONGODB_URI not found in environment variables.');
    throw new Error('API Route: MONGODB_URI not found in environment variables.');
  }

  console.log('API Route: Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route: Existing MongoDB client found but not connected, attempting to close and re-initialize.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route: New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route: Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route: Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route: Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route CRITICAL ERROR: Failed to connect to MongoDB or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route: Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}


export async function POST(request: NextRequest) {
  console.log("API Route: /api/register-customer POST handler invoked (MongoDB only).");

  if (!MONGODB_URI) {
    console.error("API Route /register-customer: MongoDB URI not configured. Cannot process request.");
    const errorResponse = { success: false, message: 'Server Configuration Error: Database URI not configured. Check server logs.', details: 'MONGODB_URI is not set in environment variables.' };
    console.log("API Route /register-customer: Sending error response:", errorResponse);
     return NextResponse.json(errorResponse, { status: 500 });
  }

  let requestBody;
  try {
    console.log("API Route /register-customer: Attempting to parse request body...");
    requestBody = await request.json();
    console.log("API Route /register-customer: Request body parsed successfully:", requestBody);
  } catch (jsonError: any) {
    console.error('API Route /register-customer: Invalid JSON in request body.', jsonError);
    // It's good practice to log the invalid JSON if possible for debugging,
    // but be cautious with logging potentially sensitive data.
    // console.error('Invalid JSON content:', await request.text().catch(() => 'Could not read body as text'));


    const errorResponse = { success: false, message: 'Bad Request: Invalid JSON format.', details: jsonError.message };
    console.log("API Route /register-customer: Sending error response for invalid JSON:", errorResponse);
    return NextResponse.json(errorResponse, { status: 400 });
  }
  
  try {
    const { 
      customerName, 
      customerPhone, 
      generatedCustomerId,
      // ... all other fields from registrationData are in requestBody
    } = requestBody;
    
    // Basic validation, can be expanded
    if (!customerName || !customerPhone || !generatedCustomerId) {
      console.warn("API Route /register-customer: Missing required fields in request body:", {customerNameExists: !!customerName, customerPhoneExists: !!customerPhone, customerIdExists: !!generatedCustomerId});
      const errorResponse = { success: false, message: 'Bad Request: Missing required fields (e.g., name, phone, or customer ID).', details: 'Validation failed on server for core fields.' };
      console.log("API Route /register-customer: Sending error response for missing fields:", errorResponse);
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    console.log("API Route /register-customer: Attempting to connect to database...");
    const db = await connectToDatabase();
    console.log("API Route /register-customer: Database connection established.");
    
    // Use 'customers' as the collection name, consistent with your server.js
    const customersCollection = db.collection('customers'); 

    // The entire requestBody is the customerDocument as prepared by the frontend
    // Create a new document object to exclude image data URLs
    const customerDocument: any = {
      ...requestBody,
      registeredAt: new Date(), // Add a server-side timestamp
    };

    // Explicitly remove image data URLs to prevent saving them in MongoDB
    // This is crucial for keeping the database size manageable and secure
    delete customerDocument.aadhaarFrontPhotoDataUrl;
    delete customerDocument.customerPhotoDataUrl;
    delete customerDocument.aadhaarBackPhotoDataUrl;
    // Also remove signature if present and not intended for DB
    delete customerDocument.signatureDataUrl;
    delete customerDocument.mapLatitude;
    delete customerDocument.mapLongitude;
    delete customerDocument.termsContentSnapshot;

    
    console.log("API Route /register-customer: Attempting to insert document into 'customers' collection:", customerDocument);
    const result = await customersCollection.insertOne(customerDocument);
    
    const customerIdFromResult = result.insertedId;
    console.log('API Route: Customer registration data saved to MongoDB. Result acknowledged:', result.acknowledged, 'Saved Customer ID:', customerIdFromResult);

    return NextResponse.json(
        { success: true, customerId: customerIdFromResult, message: 'Customer registered successfully with MongoDB.' }, 
        { status: 201 }
    );

  } catch (error: any) {
    console.error('API Route Error in /register-customer POST handler. Error object:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    let errorDetails = 'No specific details available.';

    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        errorDetails = `MongoDB Error (${error.codeName || error.code || 'N/A'}): ${error.message}`;
        // Let MongoDB errors often be 503, but some like duplicate key might be 409
        if (error.code === 11000) { 
            errorMessage = 'Duplicate entry. A record with this identifier might already exist.';
            errorDetails = error.message; // MongoError message is usually good for duplicates
        }
    } else if (error instanceof Error) { // Standard JavaScript Error
        errorDetails = error.message;
    } else if (typeof error === 'string') { // If error is just a string
        errorDetails = error;
    } else { // Fallback for other types of errors
        errorDetails = 'An unknown error structure was caught. Check server logs for the complete error object.';
    }
    
    const statusCode = (error instanceof MongoError && error.code === 11000) ? 409 : 503; // Default to 503 for DB issues, 409 for duplicate

    const errorResponse = { success: false, message: errorMessage, details: errorDetails };
    console.log(`API Route /register-customer: Constructing error response. Status: ${statusCode}, Payload:`, errorResponse);
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
