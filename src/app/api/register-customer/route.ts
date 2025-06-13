
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, MongoError, ObjectId } from 'mongodb';
import { format, addDays } from 'date-fns';

console.log('API Route Module: /api/register-customer/route.ts loaded.');

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  console.log('API Route (register-customer): connectToDatabase called.');
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    console.log('API Route (register-customer): Using cached MongoDB connection.');
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (register-customer) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  console.log('API Route (register-customer): Attempting new MongoDB connection...');
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            console.log('API Route (register-customer): Existing MongoDB client found but not connected, closing.');
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
        console.log('API Route (register-customer): New MongoClient instance created.');
    }
    
    await mongoClientInstance.connect();
    console.log('API Route (register-customer): Successfully connected to MongoDB server.');
    const db = mongoClientInstance.db(DB_NAME);
    
    console.log(`API Route (register-customer): Attempting to ping MongoDB database: ${DB_NAME}...`);
    await db.command({ ping: 1 });
    console.log(`API Route (register-customer): Successfully pinged MongoDB database: ${DB_NAME}`);
    
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (register-customer) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try {
        await mongoClientInstance.close();
      } catch (closeErr) {
        console.error('API Route (register-customer): Error closing MongoDB client after connection failure:', closeErr);
      }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}


export async function POST(request: NextRequest) {
  console.log("API Route: /api/register-customer POST handler invoked.");

  if (!MONGODB_URI) {
    console.error("API Route /register-customer: MongoDB URI not configured.");
    return NextResponse.json({ success: false, message: 'Server Configuration Error: Database URI not configured.' }, { status: 500 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (jsonError: any) {
    console.error('API Route /register-customer: Invalid JSON in request body.', jsonError);
    return NextResponse.json({ success: false, message: 'Bad Request: Invalid JSON format.', details: jsonError.message }, { status: 400 });
  }
  
  try {
    const { 
      customerName, customerPhone, generatedCustomerId, planSelected, installationDate, // planSelected is planId
      ...otherRegistrationData 
    } = requestBody;
    
    if (!customerName || !customerPhone || !generatedCustomerId || !planSelected || !installationDate) {
      console.warn("API Route /register-customer: Missing required fields:", {customerName, customerPhone, generatedCustomerId, planSelected, installationDate});
      return NextResponse.json({ success: false, message: 'Bad Request: Missing required fields (name, phone, customer ID, plan, or installation date).' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers'); 
    const plansCollection = db.collection('plans');
    const rechargesCollection = db.collection('recharges');

    // Fetch selected plan details
    const plan = await plansCollection.findOne({ planId: planSelected, isActive: true });
    if (!plan) {
      return NextResponse.json({ success: false, message: `Plan with ID ${planSelected} not found or is inactive.` }, { status: 400 });
    }

    const parsedInstallationDate = new Date(installationDate);
    if (isNaN(parsedInstallationDate.getTime())) {
        return NextResponse.json({ success: false, message: 'Invalid installation date format.' }, { status: 400 });
    }
    const planEndDate = addDays(parsedInstallationDate, plan.durationDays || 30); 

    let planTotalLitersLimit = plan.totalLitersLimitForCycle;
    if ((!planTotalLitersLimit || planTotalLitersLimit === 0) && plan.durationDays && plan.dailyWaterLimitLiters) {
      planTotalLitersLimit = plan.durationDays * plan.dailyWaterLimitLiters;
    }

    const customerDocument: any = {
      ...otherRegistrationData, 
      customerName,
      customerPhone,
      generatedCustomerId,
      registeredAt: new Date(),
      updatedAt: new Date(),
      currentPlanId: plan.planId,
      currentPlanName: plan.planName,
      planPricePaid: plan.price, 
      planStartDate: parsedInstallationDate,
      planEndDate: planEndDate,
      dailyWaterLimitLiters: plan.dailyWaterLimitLiters || 0,
      currentPlanDailyLitersLimit: plan.dailyWaterLimitLiters || 0,
      currentPlanTotalLitersLimit: planTotalLitersLimit || 0,
      espCycleMaxHours: plan.espCycleMaxHours || 0, 
      espCycleMaxDays: plan.durationDays || 0,     
      currentTotalHours: 0, 
      currentTotalLitersUsed: 0,
      lastRechargeDate: parsedInstallationDate, 
      rechargeCount: 1,
      lastUsage: [],
      lastContact: new Date(),
    };

    delete customerDocument.aadhaarFrontPhotoDataUrl;
    delete customerDocument.customerPhotoDataUrl;
    delete customerDocument.aadhaarBackPhotoDataUrl;
    delete customerDocument.signatureDataUrl;
    delete customerDocument.termsContentSnapshot;
    if (typeof customerDocument.mapLatitude !== 'number') delete customerDocument.mapLatitude;
    if (typeof customerDocument.mapLongitude !== 'number') delete customerDocument.mapLongitude;


    const result = await customersCollection.insertOne(customerDocument);
    const customerMongoId = result.insertedId;

    const initialRechargeLog = {
      customerId: customerMongoId,
      customerGeneratedId: generatedCustomerId,
      planId: plan.planId,
      planName: plan.planName,
      planPrice: plan.price,
      planDurationDays: plan.durationDays,
      dailyWaterLimitLiters: plan.dailyWaterLimitLiters || 0,
      totalLitersLimitForCycle: planTotalLitersLimit || 0,
      espCycleMaxHours: plan.espCycleMaxHours || 0,
      paymentMethod: otherRegistrationData.paymentType || 'InitialSetup',
      rechargeDate: parsedInstallationDate,
      newPlanStartDate: parsedInstallationDate,
      newPlanEndDate: planEndDate,
      transactionId: `REG-${generatedCustomerId}` 
    };
    await rechargesCollection.insertOne(initialRechargeLog);
    
    console.log('API Route: Customer registered and initial plan logged. MongoDB ID:', customerMongoId);

    return NextResponse.json(
        { success: true, customerId: customerMongoId, message: 'Customer registered successfully.' }, 
        { status: 201 }
    );

  } catch (error: any) {
    console.error('API Route Error in /register-customer POST handler:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    let statusCode = 500;

    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        statusCode = 503;
        if (error.code === 11000) { 
            errorMessage = 'Duplicate entry. This customer ID might already be registered.';
            statusCode = 409;
        }
    }
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}
    
