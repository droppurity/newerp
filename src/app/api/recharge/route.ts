
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, MongoError } from 'mongodb';
import { addDays, parseISO, isFuture, isValid, format as formatDateFns } from 'date-fns';

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
    customerId, 
    planId,     
    paymentMethod,
    rechargeType = 'replace', 
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

    const newPlan = await plansCollection.findOne({ planId: planId, isActive: true });
    if (!newPlan) {
      return NextResponse.json({ success: false, message: `Plan with ID ${planId} not found or is inactive.` }, { status: 404 });
    }
    
    const planDurationDays = newPlan.durationDays || 0;
    const planDailyWaterLimitLiters = newPlan.dailyWaterLimitLiters || 0;
    let planEspCycleMaxHours = newPlan.espCycleMaxHours;

    if ((!planEspCycleMaxHours || planEspCycleMaxHours === 0) && planDurationDays > 0 && planDailyWaterLimitLiters > 0) {
        planEspCycleMaxHours = Math.round(((planDurationDays * planDailyWaterLimitLiters) / 15) * 100) / 100;
    }
    planEspCycleMaxHours = planEspCycleMaxHours || 0;


    const rechargeEventDate = new Date(); 
    let effectiveStartDateForNewPlanDuration = rechargeEventDate; 
    let currentPlanEndDateIsValidAndFuture = false;

    if (rechargeType === 'add' && customer.planEndDate) {
      let parsedCurrentPlanEndDate: Date | null = null;
      try {
        if (customer.planEndDate instanceof Date) {
          parsedCurrentPlanEndDate = customer.planEndDate;
        } else if (typeof customer.planEndDate === 'string') {
          parsedCurrentPlanEndDate = parseISO(customer.planEndDate);
        }
        
        if (parsedCurrentPlanEndDate && isValid(parsedCurrentPlanEndDate) && isFuture(parsedCurrentPlanEndDate)) {
          effectiveStartDateForNewPlanDuration = parsedCurrentPlanEndDate;
          currentPlanEndDateIsValidAndFuture = true;
          console.log(`API Route (recharge 'add'): Current plan valid and future. Effective start for new duration: ${formatDateFns(effectiveStartDateForNewPlanDuration, "PPP")}`);
        } else {
           console.log(`API Route (recharge 'add'): Current plan not future or invalid. Effective start for new duration: ${formatDateFns(effectiveStartDateForNewPlanDuration, "PPP")}`);
        }
      } catch (e) {
        console.warn(`API Route (recharge 'add'): Error parsing customer.planEndDate "${customer.planEndDate}". Defaulting effective start to current date. Error:`, e);
      }
    } else if (rechargeType === 'add') {
        console.log(`API Route (recharge 'add'): No valid customer.planEndDate found or recharge type is not 'add'. Effective start for new duration: ${formatDateFns(effectiveStartDateForNewPlanDuration, "PPP")}`);
    }

    const finalNewPlanEndDate = addDays(effectiveStartDateForNewPlanDuration, planDurationDays);
    const servicePeriodStartDate = (rechargeType === 'add' && currentPlanEndDateIsValidAndFuture)
                                    ? effectiveStartDateForNewPlanDuration 
                                    : rechargeEventDate;                  

    const customerUpdateResult = await customersCollection.updateOne(
      { _id: customerObjectId },
      { 
        $set: { 
          currentPlanId: newPlan.planId,
          currentPlanName: newPlan.planName,
          planPricePaid: newPlan.price, 
          planStartDate: servicePeriodStartDate, 
          planEndDate: finalNewPlanEndDate, 
          dailyWaterLimitLiters: planDailyWaterLimitLiters, // Store daily limit for current plan
          espCycleMaxHours: planEspCycleMaxHours,      // Total hours for this plan cycle
          espCycleMaxDays: planDurationDays,           // Days for this plan cycle
          currentTotalHours: 0, // Reset for new/extended cycle
          currentTotalLitersUsed: 0, // Reset for new/extended cycle
          lastRechargeDate: rechargeEventDate,
          updatedAt: rechargeEventDate,
        },
        $inc: { rechargeCount: 1 } 
      }
    );

    if (customerUpdateResult.modifiedCount === 0 && customerUpdateResult.matchedCount === 0) {
        return NextResponse.json({ success: false, message: 'Failed to update customer record (customer not found during update).' }, { status: 500 });
    }
    if (customerUpdateResult.modifiedCount === 0 && customerUpdateResult.matchedCount > 0) {
        console.warn(`API Route (recharge): Customer ${customer.generatedCustomerId} matched but no fields were modified. This might indicate identical data or an issue.`);
    }

    const rechargeRecord = {
      customerId: customerObjectId,
      customerGeneratedId: customer.generatedCustomerId,
      planId: newPlan.planId,
      planName: newPlan.planName,
      planPrice: newPlan.price,
      planDurationDays: planDurationDays,
      dailyWaterLimitLiters: planDailyWaterLimitLiters,
      espCycleMaxHours: planEspCycleMaxHours,
      paymentMethod: paymentMethod,
      rechargeDate: rechargeEventDate,
      rechargeType: rechargeType, 
      newPlanStartDate: servicePeriodStartDate,
      newPlanEndDate: finalNewPlanEndDate,
    };
    await rechargesCollection.insertOne(rechargeRecord);

    console.log(`API Route (recharge): Recharge (${rechargeType}) processed for customer ${customer.customerName} (ID: ${customer.generatedCustomerId}), New Plan: ${newPlan.planName}. Effective service start: ${formatDateFns(servicePeriodStartDate, "PPP")}, New End Date: ${formatDateFns(finalNewPlanEndDate, "PPP")}`);
    
    return NextResponse.json(
        { 
          success: true, 
          message: `Plan "${newPlan.planName}" successfully recharged for ${customer.customerName} (${rechargeType} mode). New end date: ${formatDateFns(finalNewPlanEndDate, "PPP")}`,
          rechargeDetails: {
            planEndDate: finalNewPlanEndDate.toISOString(),
            newPlanStartDate: servicePeriodStartDate.toISOString(),
            customerName: customer.customerName,
            planName: newPlan.planName,
            rechargeType: rechargeType,
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
    return NextResponse.json({ success: false, message: errorMessage, details: error.message || String(error) }, { status: statusCode });
  }
}
