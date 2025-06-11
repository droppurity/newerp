
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, MongoError } from 'mongodb';
import { addDays } from 'date-fns';

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
    customerId, // MongoDB ObjectId string for the customer
    planId,     // String planId for the new plan
    paymentMethod,
    // customerGeneratedId is implicitly fetched from the customer document
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
    const rechargesCollection = db.collection('recharges');

    const customerObjectId = new ObjectId(customerId);
    const customer = await customersCollection.findOne({ _id: customerObjectId });
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }

    const plan = await plansCollection.findOne({ planId: planId, isActive: true });
    if (!plan) {
      return NextResponse.json({ success: false, message: `Plan with ID ${planId} not found or is inactive.` }, { status: 404 });
    }

    const currentDate = new Date();
    const newPlanStartDate = currentDate;
    const newPlanEndDate = addDays(currentDate, plan.durationDays || 30);

    const customerUpdateResult = await customersCollection.updateOne(
      { _id: customerObjectId },
      { 
        $set: { 
          currentPlanId: plan.planId,
          currentPlanName: plan.planName,
          planPricePaid: plan.price,
          planStartDate: newPlanStartDate,
          planEndDate: newPlanEndDate,
          espCycleMaxHours: plan.espCycleMaxHours || 0,
          espCycleMaxDays: plan.durationDays || 0,
          currentTotalHours: 0, // Reset ESP's total running hours for the new cycle
          lastRechargeDate: currentDate,
          updatedAt: currentDate,
        },
        $inc: { rechargeCount: 1 } 
      }
    );

    if (customerUpdateResult.modifiedCount === 0 && customerUpdateResult.matchedCount === 0) {
        return NextResponse.json({ success: false, message: 'Failed to update customer record (customer not found or no changes needed).' }, { status: 500 });
    }

    const rechargeRecord = {
      customerId: customerObjectId,
      customerGeneratedId: customer.generatedCustomerId,
      planId: plan.planId,
      planName: plan.planName,
      planPrice: plan.price,
      planDurationDays: plan.durationDays,
      paymentMethod: paymentMethod,
      rechargeDate: currentDate,
      newPlanStartDate: newPlanStartDate,
      newPlanEndDate: newPlanEndDate,
      // transactionId: "placeholder_txn_id_from_payment_gateway" 
    };
    await rechargesCollection.insertOne(rechargeRecord);

    console.log(`API Route (recharge): Recharge processed for customer ${customer.customerName} (ID: ${customer.generatedCustomerId}), New Plan: ${plan.planName}`);
    
    return NextResponse.json(
        { 
          success: true, 
          message: `Plan "${plan.planName}" successfully recharged for ${customer.customerName}.`,
          rechargeDetails: {
            planEndDate: newPlanEndDate.toISOString(),
            newPlanStartDate: newPlanStartDate.toISOString(),
            customerName: customer.customerName,
            planName: plan.planName,
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
    