
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

console.log('API Route Module: /api/terms-and-conditions/route.ts loaded.');

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (terms-and-conditions): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (terms-and-conditions): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (terms-and-conditions) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('API Route (terms-and-conditions): MONGODB_URI not found.');
  }

  console.log('API Route (terms-and-conditions): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (terms-and-conditions): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (terms-and-conditions): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (terms-and-conditions): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (terms-and-conditions): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (terms-and-conditions): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (terms-and-conditions) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (terms-and-conditions): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

export async function GET(request: NextRequest) {
  console.log("API Route: /api/terms-and-conditions GET handler invoked.");
  try {
    const db = await connectToDatabase();
    const configurationsCollection = db.collection('configurations');
    
    console.log("API Route (terms-and-conditions): Fetching T&C from 'configurations' collection with query { configKey: 'termsAndConditions', isActive: true }.");
    const termsAndConditionsData = await configurationsCollection.findOne({ configKey: "termsAndConditions", isActive: true });
    
    if (!termsAndConditionsData) {
      console.warn("API Route (terms-and-conditions): No active 'termsAndConditions' config found in the database. This will result in a 404 response.");
      return NextResponse.json(
        { success: false, message: 'Terms and Conditions not found or not active.', terms: null },
        { status: 404 }
      );
    }

    console.log(`API Route (terms-and-conditions): Found T&C data:`, termsAndConditionsData);
    
    // Convert ObjectId to string for JSON serialization if present
    const serializableData = {
      ...termsAndConditionsData,
      _id: termsAndConditionsData._id.toString(),
    };

    return NextResponse.json({ success: true, terms: serializableData }, { status: 200 });

  } catch (error: any) {
    console.error('API Route Error in /api/terms-and-conditions GET handler:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch Terms and Conditions.', details: error.message || 'Unknown server error.' },
      { status: 500 }
    );
  }
}
