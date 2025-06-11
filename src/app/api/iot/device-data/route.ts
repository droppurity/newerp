
// src/app/api/iot/device-data/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, MongoError, ObjectId } from 'mongodb';

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (iot/device-data): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (iot/device-data): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (iot/device-data) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  console.log('API Route (iot/device-data): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (iot/device-data): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (iot/device-data): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (iot/device-data): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (iot/device-data): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (iot/device-data): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (iot/device-data) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (iot/device-data): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

export async function POST(request: NextRequest) {
  console.log("API Route: /api/iot/device-data POST handler invoked.");

  if (!MONGODB_URI) {
    return NextResponse.json({ success: false, message: 'Server Configuration Error: Database URI not configured.' }, { status: 500 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (jsonError: any) {
    return NextResponse.json({ success: false, message: 'Bad Request: Invalid JSON format.', details: jsonError.message }, { status: 400 });
  }
  
  const { 
    deviceId, 
    payload,
    deviceTimestamp // Optional: ISO string date from device
  } = requestBody;

  if (!deviceId || !payload) {
    return NextResponse.json({ success: false, message: 'Bad Request: Missing required fields (deviceId, payload).' }, { status: 400 });
  }
  
  if (typeof payload !== 'object' || payload === null) {
     return NextResponse.json({ success: false, message: 'Bad Request: Payload must be a JSON object.' }, { status: 400 });
  }

  let parsedDeviceTimestamp: Date | null = null;
  if (deviceTimestamp) {
    parsedDeviceTimestamp = new Date(deviceTimestamp);
    if (isNaN(parsedDeviceTimestamp.getTime())) {
      return NextResponse.json({ success: false, message: 'Bad Request: Invalid deviceTimestamp format. Please use ISO 8601 format.' }, { status: 400 });
    }
  }

  try {
    const db = await connectToDatabase();
    const iotDeviceDataCollection = db.collection('iotDeviceData');

    const iotDataDocument = {
      deviceId: String(deviceId), // Ensure deviceId is a string
      payload,
      receivedAt: new Date(), // Server timestamp
      ...(parsedDeviceTimestamp && { deviceTimestamp: parsedDeviceTimestamp }), // Include if valid
    };
    
    const result = await iotDeviceDataCollection.insertOne(iotDataDocument);
    const insertedId = result.insertedId;

    console.log(`API Route (iot/device-data): Data for device ${deviceId} saved to MongoDB. Inserted ID: ${insertedId}`);
    
    return NextResponse.json(
        { success: true, message: 'Device data received and stored successfully.', dataId: insertedId }, 
        { status: 201 }
    );

  } catch (error: any) {
    console.error('API Route Error in /api/iot/device-data POST handler:', error);
    let errorMessage = 'An unexpected error occurred while storing device data.';
    let statusCode = 500;

    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        statusCode = 503; 
    }
    
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}

// Optional: GET endpoint to retrieve data for a device (example)
export async function GET(request: NextRequest) {
  console.log("API Route: /api/iot/device-data GET handler invoked.");
  const searchParams = request.nextUrl.searchParams;
  const deviceId = searchParams.get('deviceId');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 10; // Default limit 10

  if (!deviceId) {
    return NextResponse.json({ success: false, message: 'deviceId query parameter is required.' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const iotDeviceDataCollection = db.collection('iotDeviceData');
    
    const data = await iotDeviceDataCollection
      .find({ deviceId: String(deviceId) })
      .sort({ receivedAt: -1 }) // Get latest data first
      .limit(isNaN(limit) || limit <=0 ? 10 : limit)
      .toArray();

    const serializableData = data.map(d => ({
      ...d,
      _id: d._id.toString(),
    }));

    return NextResponse.json({ success: true, data: serializableData }, { status: 200 });

  } catch (error: any) {
    console.error(`API Route Error in /api/iot/device-data GET handler for device ${deviceId}:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch device data.', details: error.message || 'Unknown server error.' },
      { status: 500 }
    );
  }
}
