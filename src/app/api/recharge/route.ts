
// src/app/api/recharge/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, MongoError } from 'mongodb';

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (recharge): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (recharge): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (recharge) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  console.log('API Route (recharge): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (recharge): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (recharge): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (recharge): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (recharge): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (recharge): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (recharge) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (recharge): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

export async function POST(request: NextRequest) {
  console.log("API Route: /api/recharge POST handler invoked.");

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
    customerId, // MongoDB ObjectId string
    customerGeneratedId, // String ID like JH09d...
    planId,      // String planId like 25L_3M
    paymentMethod,
  } = requestBody;

  if (!customerId || !planId || !paymentMethod) {
    return NextResponse.json({ success: false, message: 'Bad Request: Missing required fields (customerId, planId, paymentMethod).' }, { status: 400 });
  }
  if (!ObjectId.isValid(customerId)) {
    return NextResponse.json({ success: false, message: 'Bad Request: Invalid customerId format.' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers');
    const plansCollection = db.collection('plans');
    const rechargesCollection = db.collection('recharges'); // New collection for recharge history

    // 1. Verify Customer Exists
    const customerObjectId = new ObjectId(customerId);
    const customer = await customersCollection.findOne({ _id: customerObjectId });
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }

    // 2. Verify Plan Exists
    const plan = await plansCollection.findOne({ planId: planId, isActive: true });
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found or is inactive.' }, { status: 404 });
    }

    // 3. (Placeholder) Process Payment - In a real app, integrate with a payment gateway here
    // For now, we assume payment is successful if paymentMethod is provided.

    // 4. Update Customer's Plan Information (Example fields - adjust to your schema)
    //    This is a simplified example. You'd likely calculate a new planEndDate.
    const currentDate = new Date();
    const planEndDate = new Date(currentDate);
    planEndDate.setDate(planEndDate.getDate() + plan.durationDays);

    const customerUpdateResult = await customersCollection.updateOne(
      { _id: customerObjectId },
      { 
        $set: { 
          currentPlanId: plan.planId,
          currentPlanName: plan.planName,
          planPricePaid: plan.price,
          planStartDate: currentDate,
          planEndDate: planEndDate,
          lastRechargeDate: currentDate,
          updatedAt: currentDate,
        },
        $inc: { rechargeCount: 1 } // Optional: track number of recharges
      }
    );

    if (customerUpdateResult.modifiedCount === 0 && customerUpdateResult.matchedCount === 0) {
        // This case should be rare if customer was found earlier, but good to handle.
        return NextResponse.json({ success: false, message: 'Failed to update customer record, customer might not exist or no changes were made.' }, { status: 500 });
    } else if (customerUpdateResult.modifiedCount === 0 && customerUpdateResult.matchedCount > 0) {
        console.warn(`API Route (recharge): Customer record for ${customerGeneratedId} matched but was not modified. This might mean the new plan data is identical to existing data, or an issue with the update query.`);
    }


    // 5. Create a recharge record
    const rechargeRecord = {
      customerId: customerObjectId,
      customerGeneratedId: customer.generatedCustomerId || customerGeneratedId, // Use fetched customer's ID
      planId: plan.planId,
      planName: plan.planName,
      planPrice: plan.price,
      planDurationDays: plan.durationDays,
      paymentMethod: paymentMethod,
      rechargeDate: currentDate,
      // transactionId: "placeholder_txn_id_123" // From payment gateway
    };
    await rechargesCollection.insertOne(rechargeRecord);

    console.log(`API Route (recharge): Recharge processed for customer ${customer.customerName} (ID: ${customer.generatedCustomerId}), Plan: ${plan.planName}`);
    
    return NextResponse.json(
        { 
          success: true, 
          message: `Plan "${plan.planName}" successfully recharged for ${customer.customerName}.`,
          rechargeDetails: {
            planEndDate: planEndDate.toISOString(),
          }
        }, 
        { status: 200 }
    );

  } catch (error: any) {
    console.error('API Route Error in /api/recharge POST handler:', error);
    let errorMessage = 'An unexpected error occurred during recharge processing.';
    let statusCode = 500;

    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed during recharge.';
        statusCode = 503; 
    }
    
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}
