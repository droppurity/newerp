
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, Filter, ObjectId } from 'mongodb';

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (customers): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (customers): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (customers) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  console.log('API Route (customers): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (customers): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (customers): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (customers): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (customers): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (customers): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (customers) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (customers): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

interface CustomerDocument {
  _id: ObjectId; 
  customerName?: string;
  generatedCustomerId?: string;
  customerPhone?: string;
  customerAddress?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  stateName?: string;
  confirmedMapLink?: string | null;
  mapLatitude?: number | null;
  mapLongitude?: number | null;
  modelInstalled?: string;
  serialNumber?: string;
  planSelected?: string;
  registeredAt?: Date;
  [key: string]: any; 
}


export async function GET(request: NextRequest) {
  console.log("API Route: /api/customers GET handler invoked.");
  const searchParams = request.nextUrl.searchParams;
  const searchTerm = searchParams.get('search');

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers');
    
    let query: Filter<CustomerDocument> = {};
    if (searchTerm) {
      const regex = { $regex: searchTerm, $options: 'i' }; // Case-insensitive search
      query = {
        $or: [
          { customerName: regex },
          { generatedCustomerId: regex },
          { customerPhone: regex },
          { city: regex },
          { stateName: regex },
          { pincode: regex },
          { modelInstalled: regex },
          { serialNumber: regex },
        ],
      };
      console.log(`API Route (customers): Searching with term "${searchTerm}"`);
    } else {
      console.log("API Route (customers): Fetching all customers (no search term).");
    }

    const customersArray = await customersCollection.find(query).sort({ registeredAt: -1 }).toArray();
    
    if (customersArray.length === 0) {
        console.warn("API Route (customers): No customers found matching query:", query);
    } else {
        console.log(`API Route (customers): Found ${customersArray.length} customers.`);
    }

    // Convert ObjectId to string for JSON serialization
    const serializableCustomers = customersArray.map(customer => ({
      ...customer,
      _id: customer._id.toString(), // Convert ObjectId to string
      registeredAt: customer.registeredAt ? new Date(customer.registeredAt).toISOString() : null,
    }));

    return NextResponse.json({ success: true, customers: serializableCustomers }, { status: 200 });

  } catch (error: any) {
    console.error('API Route Error in /api/customers GET handler:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch customers.', details: error.message || 'Unknown server error.' },
      { status: 500 }
    );
  }
}
