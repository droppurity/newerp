
// src/app/api/recharges/customer/[customerId]/route.ts
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
    console.error('API Route (recharges/customer) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
      if (mongoClientInstance) await mongoClientInstance.close();
      mongoClientInstance = new MongoClient(MONGODB_URI);
    }
    await mongoClientInstance.connect();
    const db = mongoClientInstance.db(DB_NAME);
    await db.command({ ping: 1 });
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (recharges/customer) CRITICAL ERROR: DB connection. ${err.message}`, err);
    if (mongoClientInstance) try { await mongoClientInstance.close(); } catch (closeErr) { /* ignore */ }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

const ensureIsoString = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue.toISOString();
  try {
    const parsedDate = new Date(dateValue);
    if (isNaN(parsedDate.getTime())) return dateValue.toString();
    return parsedDate.toISOString();
  } catch (e) {
    return dateValue.toString();
  }
};

export async function GET(request: NextRequest, { params }: { params: { customerId: string } }) {
  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    return NextResponse.json({ success: false, message: 'Invalid Customer ID provided for fetching recharges.' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const rechargesCollection = db.collection('recharges');
    
    const customerObjectId = new ObjectId(customerId);
    const rechargeHistory = await rechargesCollection
      .find({ customerId: customerObjectId })
      .sort({ rechargeDate: -1 }) // Sort by most recent recharge first
      .toArray();

    if (!rechargeHistory) { // Should be an empty array if not found, but check anyway
      return NextResponse.json({ success: true, recharges: [] }, { status: 200 });
    }

    const serializableRecharges = rechargeHistory.map(recharge => ({
      ...recharge,
      _id: recharge._id.toString(),
      customerId: recharge.customerId.toString(),
      rechargeDate: ensureIsoString(recharge.rechargeDate),
      newPlanStartDate: ensureIsoString(recharge.newPlanStartDate),
      newPlanEndDate: ensureIsoString(recharge.newPlanEndDate),
    }));
    
    return NextResponse.json({ success: true, recharges: serializableRecharges }, { status: 200 });

  } catch (error: any) {
    console.error(`API Route Error in /api/recharges/customer/${customerId} GET handler:`, error);
    let errorMessage = 'An unexpected error occurred while fetching recharge history.';
    let statusCode = 500;
    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        statusCode = 503;
    }
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}
