
// src/app/api/customers/[customerId]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, MongoError } from 'mongodb';

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (customers/[customerId]) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
    }
    
    await mongoClientInstance.connect();
    const db = mongoClientInstance.db(DB_NAME);
    await db.command({ ping: 1 });
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (customers/[customerId]) CRITICAL ERROR: DB connection. ${err.message}`, err);
    if (mongoClientInstance) {
      try { await mongoClientInstance.close(); } catch (closeErr) { /* ignore */ }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

export async function GET(request: NextRequest, { params }: { params: { customerId: string } }) {
  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    return NextResponse.json({ success: false, message: 'Invalid Customer ID provided.' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers');
    
    const customer = await customersCollection.findOne({ _id: new ObjectId(customerId) });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    // Convert ObjectId to string and handle dates for JSON serialization
    const serializableCustomer = {
      ...customer,
      _id: customer._id.toString(),
      registeredAt: customer.registeredAt ? (customer.registeredAt instanceof Date ? customer.registeredAt.toISOString() : new Date(customer.registeredAt).toISOString()) : null,
      installationDate: customer.installationDate ? (customer.installationDate instanceof Date ? customer.installationDate.toISOString() : new Date(customer.installationDate).toISOString()) : null,
      // Ensure any other date fields stored as Date objects are also converted to ISOString
    };
    
    return NextResponse.json({ success: true, customer: serializableCustomer }, { status: 200 });

  } catch (error: any) {
    console.error(`API Route Error in /api/customers/${customerId} GET handler:`, error);
    let errorMessage = 'An unexpected error occurred while fetching customer details.';
    let statusCode = 500;
    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        statusCode = 503;
    }
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}
