
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

console.log('API Route Module: /api/plans/route.ts loaded.');

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (plans): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (plans): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (plans) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('API Route (plans): MONGODB_URI not found.');
  }

  console.log('API Route (plans): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (plans): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (plans): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (plans): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (plans): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (plans): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (plans) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (plans): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

export async function GET(request: NextRequest) {
  console.log("API Route: /api/plans GET handler invoked.");
  try {
    const db = await connectToDatabase();
    const plansCollection = db.collection('plans');
    
    console.log("API Route (plans): Fetching active plans from 'plans' collection, sorted by price.");
    const activePlans = await plansCollection.find({ isActive: true }).sort({ dailyWaterLimitLiters: 1, price: 1 }).toArray();
    
    if (activePlans.length === 0) {
        console.warn("API Route (plans): No active plans found in the database.");
    } else {
        console.log(`API Route (plans): Found ${activePlans.length} active plans.`);
    }

    const serializablePlans = activePlans.map(plan => {
      let espCycleMaxHours = plan.espCycleMaxHours;
      // Calculate espCycleMaxHours if not present or zero, based on 1 hour = 15 liters
      if ((!espCycleMaxHours || espCycleMaxHours === 0) && plan.durationDays && plan.dailyWaterLimitLiters) {
        espCycleMaxHours = Math.round(((plan.durationDays * plan.dailyWaterLimitLiters) / 15) * 100) / 100;
      }

      return {
        ...plan,
        _id: plan._id.toString(),
        espCycleMaxHours: espCycleMaxHours || 0, // Ensure it's a number, defaults to 0
        dailyWaterLimitLiters: plan.dailyWaterLimitLiters || 0, // Ensure it's a number, defaults to 0
      };
    });

    return NextResponse.json({ success: true, plans: serializablePlans }, { status: 200 });

  } catch (error: any) {
    console.error('API Route Error in /api/plans GET handler:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch plans.', details: error.message || 'Unknown server error.' },
      { status: 500 }
    );
  }
}
