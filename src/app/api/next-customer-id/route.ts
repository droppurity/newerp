
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (next-customer-id): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (next-customer-id): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (next-customer-id) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  console.log('API Route (next-customer-id): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (next-customer-id): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (next-customer-id): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (next-customer-id): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (next-customer-id): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (next-customer-id): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (next-customer-id) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (next-customer-id): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

export async function GET(request: NextRequest) {
  console.log("API Route: /api/next-customer-id GET handler invoked.");
  const searchParams = request.nextUrl.searchParams;
  const zone = searchParams.get('zone');
  const division = searchParams.get('division');

  if (!zone || !division) {
    return NextResponse.json({ success: false, message: 'Zone and division parameters are required.' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers');

    const prefix = `${zone}d${division}`;
    // Regex to match IDs starting with the prefix and ending with 2 digits
    // e.g., if prefix is JH09d013, regex looks for JH09d013 followed by two digits.
    const regex = new RegExp(`^${prefix}(\\d{2})$`);

    const customers = await customersCollection.find({ generatedCustomerId: { $regex: regex } }).toArray();
    
    let maxSequential = 0;
    if (customers.length > 0) {
      for (const customer of customers) {
        if (customer.generatedCustomerId) {
          const match = customer.generatedCustomerId.match(regex);
          if (match && match[1]) {
            const sequentialPart = parseInt(match[1], 10);
            if (sequentialPart > maxSequential) {
              maxSequential = sequentialPart;
            }
          }
        }
      }
    }
    
    const nextSequentialNumber = maxSequential + 1;
    const formattedSequential = String(nextSequentialNumber).padStart(2, '0');

    console.log(`API Route (next-customer-id): For prefix ${prefix}, max found: ${maxSequential}, next sequential: ${formattedSequential}`);
    return NextResponse.json({ success: true, sequentialNumber: formattedSequential }, { status: 200 });

  } catch (error: any) {
    console.error('API Route Error in /api/next-customer-id GET handler:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to determine next customer ID.', details: error.message || 'Unknown server error.' },
      { status: 500 }
    );
  }
}
