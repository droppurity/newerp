
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

console.log('API Route Module: /api/initialize-collections/route.ts loaded.');

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper (simplified for this route) ---
async function connectToDatabaseForInit(): Promise<{ db: Db | null, client: MongoClient | null }> {
  console.log('API Route (initialize-collections): connectToDatabaseForInit called.');
  if (!MONGODB_URI) {
    console.error('API Route (initialize-collections) CRITICAL ERROR: MONGODB_URI not found in environment variables. Please check your .env.local file.');
    return { db: null, client: null };
  }
  const maskedMongoUri = MONGODB_URI.replace(/:([^@:]+)@/, ':******@');
  console.log(`API Route (initialize-collections): Using MONGODB_URI (masked): ${maskedMongoUri}`);
  console.log(`API Route (initialize-collections): Using DB_NAME: ${DB_NAME}`);

  console.log('API Route (initialize-collections): Attempting new MongoDB connection to initialize collections...');
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('API Route (initialize-collections): Successfully connected to MongoDB server for initialization.');
    const db = client.db(DB_NAME);
    
    console.log(`API Route (initialize-collections): Attempting to ping MongoDB database: ${DB_NAME} for initialization...`);
    await db.command({ ping: 1 });
    console.log(`API Route (initialize-collections): Successfully pinged MongoDB database: ${DB_NAME} for initialization.`);
    
    return { db, client }; 
  } catch (err: any) {
    console.error(`API Route (initialize-collections) CRITICAL ERROR: Failed to connect to MongoDB or ping database ${DB_NAME} during initialization. Error: ${err.message}`, err);
    if (err.name === 'MongoNetworkError') {
      console.error('Details: This might be a network issue or the MongoDB server is not reachable (check Atlas IP Allowlist, VPN, etc.).');
    } else if (err.name === 'MongoServerError' && err.message.includes('authentication failed')) {
      console.error('Details: MongoDB authentication failed. Check your username and password in MONGODB_URI.');
    } else if (err.name === 'MongoServerError' && (err.message.includes('command find requires authentication') || err.message.includes('not authorized'))) {
       console.error('Details: MongoDB command requires authentication or user is not authorized. This could be a permission issue for the user in Atlas. Ensure the user has roles like readWrite on droppurityDB and potentially read on admin/local databases for cluster operations.');
    }
    await client.close(); 
    return { db: null, client: null };
  }
}

const newSamplePlans = [
  // 25L/day plans
  { planId: "25L_7D_TRIAL", planName: "25L/day - 7 Days Trial", price: 0, durationDays: 7, dailyWaterLimitLiters: 25, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "25L_1M", planName: "25L/day - 1 Month", price: 799, durationDays: 30, dailyWaterLimitLiters: 25, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "25L_3M", planName: "25L/day - 3 Months", price: 1077, durationDays: 90, dailyWaterLimitLiters: 25, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "25L_6M", planName: "25L/day - 6 Months", price: 1794, durationDays: 180, dailyWaterLimitLiters: 25, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "25L_13M", planName: "25L/day - 13 Months", price: 3600, durationDays: 390, dailyWaterLimitLiters: 25, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  // 50L/day plans
  { planId: "50L_7D_TRIAL", planName: "50L/day - 7 Days Trial", price: 0, durationDays: 7, dailyWaterLimitLiters: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "50L_1M", planName: "50L/day - 1 Month", price: 899, durationDays: 30, dailyWaterLimitLiters: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "50L_3M", planName: "50L/day - 3 Months", price: 1197, durationDays: 90, dailyWaterLimitLiters: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "50L_6M", planName: "50L/day - 6 Months", price: 2394, durationDays: 180, dailyWaterLimitLiters: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "50L_13M", planName: "50L/day - 13 Months", price: 4800, durationDays: 390, dailyWaterLimitLiters: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  // 100L/day plans
  { planId: "100L_7D_TRIAL", planName: "100L/day - 7 Days Trial", price: 0, durationDays: 7, dailyWaterLimitLiters: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "100L_1M", planName: "100L/day - 1 Month", price: 1000, durationDays: 30, dailyWaterLimitLiters: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "100L_3M", planName: "100L/day - 3 Months", price: 2400, durationDays: 90, dailyWaterLimitLiters: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "100L_6M", planName: "100L/day - 6 Months", price: 4000, durationDays: 180, dailyWaterLimitLiters: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { planId: "100L_13M", planName: "100L/day - 13 Months", price: 9392, durationDays: 390, dailyWaterLimitLiters: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() }
];

const initialZonesData = [
    { zoneCode: "JH09", zoneLabel: "JH09", stateNameMatch: "Jharkhand", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { zoneCode: "JH10", zoneLabel: "JH10", stateNameMatch: "Jharkhand", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { zoneCode: "BR01", zoneLabel: "BR01", stateNameMatch: "Bihar", isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

const initialConfigurationsData = [
  {
    configKey: "termsAndConditions",
    title: "Terms & Conditions", // Corrected: Removed &amp;
    contentBlocks: [
      "1. Rental Agreement",
      "1.1 The rental services provided by Drop Purity are subject to these Terms and Conditions. By signing the rental agreement, the customer agrees to the terms outlined here.",
      "1.2 These Terms and Conditions may be modified or updated from time to time. Any modifications will be communicated to the customer and are effective from the date of notice.",
      "2. Rental Period",
      "2.1 The rental period for the equipment is specified in the rental agreement. Early termination or extension of the rental period may incur additional charges.",
      "2.2 Equipment should be returned in the same condition as it was delivered to the customer. Any damage or malfunction must be reported immediately.",
      "3. Equipment Condition & Damage",
      "3.1 The customer agrees to inspect the rented equipment upon delivery. Any discrepancies or damages must be reported within 24 hours.",
      "3.2 The customer is responsible for the equipment's maintenance and ensuring it remains in good working condition during the rental period.",
      "4. Charges for Damages",
      "Front cover damage: Rs. 1,000",
      "Main body damage: Rs. 1,700",
      "Missing or malfunctioning Pump: Rs. 2,500",
      "Missing or malfunctioning Membrane: Rs. 2,500",
      "Missing or malfunctioning Filter: Rs. 500 per piece",
      "Missing or malfunctioning SMPS (Power supply): Rs. 700",
      "3.3 If the equipment is damaged, lost, or malfunctions during the rental period, the customer must notify Drop Purity immediately. The repair or replacement cost will be billed to the customer as per the damage charges outlined above.",
      "5. Installation & KYC Requirements",
      "5.1 Installation of the equipment will be done by Drop Purity only after submission of the following documents:",
      "Valid identification proof (Aadhaar card, Voter ID, etc.)",
      "Address proof (Utility bills, Rent agreement, etc.)",
      "A signed rental agreement",
      "Any other documents as required by Drop Purity for verification.",
      "5.2 The installation process may involve minor drilling or fitting for the equipment. Drop Purity is not liable for any damages caused to the walls, floors, or any structural components of the property during the installation.",
      "5.3 If any alterations to existing pipelines or plumbing are required for installation, the customer agrees to bear the costs of such alterations. Drop Purity will not be responsible for any damage to the pipelines.",
      "6. Maintenance & Servicing",
      "6.1 The customer is expected to use the equipment as per the manufacturer's instructions and ensure that it remains in working condition.",
      "6.2 In case of a malfunction, the customer should immediately contact Drop Purity for troubleshooting and possible repair services. The company will determine if the issue is covered under the warranty or if it is chargeable based on the damage.",
      "7. Liability",
      "7.1 Drop Purity is not responsible for any direct or indirect damages resulting from the misuse, unauthorized alterations, or negligence of the customer regarding the rented equipment.",
      "7.2 Drop Purity is not liable for any damages to the property (including pipelines or other infrastructure) caused during the installation of the equipment.",
      "7.3 Drop Purity is not liable for any damages or losses resulting from natural calamities (such as floods, earthquakes, or storms) during the rental period.",
      "7.4 The customer is liable for the equipment from the time it is delivered to the time it is returned in good condition.",
      "8. Return of Equipment",
      "8.1 The customer must return the equipment by the due date specified in the rental agreement.",
      "8.2 Failure to return the equipment on time may result in additional rental charges, as outlined in the agreement.",
      "9. Payment Terms",
      "9.1 The customer agrees to pay the rental charges on time, as outlined in the agreement. Late payments may incur penalties.",
      "9.2 All damages will be invoiced to the customer, and payment for repairs or replacement must be made as per the due date.",
      "10. Termination of Rental Agreement",
      "10.1 Either party can terminate the rental agreement by giving written notice in accordance with the terms mentioned in the agreement.",
      "10.2 Upon termination, the customer must return the equipment immediately in good condition. Any outstanding dues will need to be cleared before the return.",
      "11. Governing Law",
      "11.1 This rental agreement and any disputes arising from it will be governed by the laws of Jharkhand, India.",
      "12. Contact Information",
      "For any queries or support related to the rented equipment, please contact us at:",
      "Email: official@droppurity.com",
      "Phone: 7979784087"
    ],
    description: "Terms and Conditions for new customer registration.",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];


export async function GET(request: NextRequest) {
  console.log("======================================================================");
  console.log("API Route: /api/initialize-collections GET handler invoked. STARTING INITIALIZATION.");
  console.log("======================================================================");

  if (!MONGODB_URI) {
    console.error("API Route (initialize-collections) CRITICAL: MONGODB_URI not configured. Cannot proceed with initialization.");
    return NextResponse.json({ success: false, message: 'Server Configuration Error: Database URI not configured. Please check .env.local and server logs.' }, { status: 500 });
  }

  let mongoClient: MongoClient | null = null; 

  try {
    const { db, client: connectedClient } = await connectToDatabaseForInit();
    if (!db || !connectedClient) {
      console.error("API Route (initialize-collections) CRITICAL: Database connection failed in GET handler. Collections not initialized.");
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to connect to the database for initialization. Check Next.js server console logs for connection errors (e.g., Atlas IP allowlist, user permissions for database/collections, or wrong MONGODB_URI).'
        }, 
        { status: 503 }
      );
    }
    mongoClient = connectedClient; 

    console.log(`API Route (initialize-collections): Connected to DB: ${DB_NAME}. Starting 'plans', 'zones', and 'configurations' collection initialization.`);

    const plansCollection = db.collection('plans');
    const zonesCollection = db.collection('zones');
    const configurationsCollection = db.collection('configurations');

    let plansResultSummary = { added: 0, updated: 0, failed: 0, attempted: newSamplePlans.length };
    let zonesResultSummary = { added: 0, updated: 0, failed: 0, attempted: initialZonesData.length };
    let configsResultSummary = { added: 0, updated: 0, failed: 0, attempted: initialConfigurationsData.length };
    let planErrors: string[] = [];
    let zoneErrors: string[] = [];
    let configErrors: string[] = [];

    // Initialize 'plans' collection with upsert
    console.log("API Route (initialize-collections): Processing 'plans' collection entries...");
    for (const plan of newSamplePlans) {
      try {
        const result = await plansCollection.updateOne(
          { planId: plan.planId },
          { $set: plan },
          { upsert: true }
        );
        if (result.upsertedCount > 0) plansResultSummary.added++;
        else if (result.modifiedCount > 0) plansResultSummary.updated++;
        console.log(`API Route (initialize-collections): Plan ${plan.planId} processed. Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
      } catch (e: any) {
        planErrors.push(`Failed to upsert plan ${plan.planId}: ${e.message}`);
        plansResultSummary.failed++;
        console.error(`API Route (initialize-collections): Error upserting plan ${plan.planId}:`, e);
      }
    }
    console.log("API Route (initialize-collections): 'plans' collection processing finished. Summary:", plansResultSummary);
    if (planErrors.length > 0) console.error("API Route (initialize-collections): Errors during 'plans' initialization:", planErrors);

    // Initialize 'zones' collection with upsert
    console.log("API Route (initialize-collections): Processing 'zones' collection entries...");
     for (const zone of initialZonesData) {
      try {
        const result = await zonesCollection.updateOne(
          { zoneCode: zone.zoneCode },
          { $set: zone },
          { upsert: true }
        );
        if (result.upsertedCount > 0) zonesResultSummary.added++;
        else if (result.modifiedCount > 0) zonesResultSummary.updated++;
        console.log(`API Route (initialize-collections): Zone ${zone.zoneCode} processed. Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
      } catch (e: any) {
        zoneErrors.push(`Failed to upsert zone ${zone.zoneCode}: ${e.message}`);
        zonesResultSummary.failed++;
        console.error(`API Route (initialize-collections): Error upserting zone ${zone.zoneCode}:`, e);
      }
    }
    console.log("API Route (initialize-collections): 'zones' collection processing finished. Summary:", zonesResultSummary);
    if (zoneErrors.length > 0) console.error("API Route (initialize-collections): Errors during 'zones' initialization:", zoneErrors);

    // Initialize 'configurations' collection with upsert
    console.log("API Route (initialize-collections): Processing 'configurations' collection entries...");
    for (const config of initialConfigurationsData) {
      try {
        const result = await configurationsCollection.updateOne(
          { configKey: config.configKey },
          { $set: config },
          { upsert: true }
        );
        if (result.upsertedCount > 0) configsResultSummary.added++;
        else if (result.modifiedCount > 0) configsResultSummary.updated++;
        console.log(`API Route (initialize-collections): Configuration ${config.configKey} processed. Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
      } catch (e: any) {
        configErrors.push(`Failed to upsert configuration ${config.configKey}: ${e.message}`);
        configsResultSummary.failed++;
        console.error(`API Route (initialize-collections): Error upserting configuration ${config.configKey}:`, e);
      }
    }
    console.log("API Route (initialize-collections): 'configurations' collection processing finished. Summary:", configsResultSummary);
    if (configErrors.length > 0) console.error("API Route (initialize-collections): Errors during 'configurations' initialization:", configErrors);
    
    if (mongoClient) {
      await mongoClient.close();
      console.log("API Route (initialize-collections): MongoDB client connection closed after operations.");
    }

    const allOperationsAttempted = plansResultSummary.attempted > 0 || zonesResultSummary.attempted > 0 || configsResultSummary.attempted > 0;
    const anyDataChanged = plansResultSummary.added > 0 || plansResultSummary.updated > 0 || zonesResultSummary.added > 0 || zonesResultSummary.updated > 0 || configsResultSummary.added > 0 || configsResultSummary.updated > 0;
    const anyFailures = plansResultSummary.failed > 0 || zoneErrors.length > 0 || configErrors.length > 0;

    let overallMessage: string;
    let responseStatus: number;

    if (anyFailures) {
        overallMessage = 'Collections initialization process completed with some errors. Check Next.js server console logs for details.';
        responseStatus = 207; // Multi-Status
    } else if (!allOperationsAttempted) {
        overallMessage = 'No data provided for initialization. Collections remain unchanged.';
        responseStatus = 200;
    } else if (!anyDataChanged && allOperationsAttempted) {
        overallMessage = 'All data already exists in the database. Collections remain unchanged.';
        responseStatus = 200;
    } else {
        overallMessage = 'Collections initialization process completed successfully.';
        responseStatus = 200;
    }
    
    console.log(`API Route (initialize-collections): Final Status - ${overallMessage}`);
    console.log("======================================================================");
    console.log("API Route: /api/initialize-collections GET handler FINISHED.");
    console.log("======================================================================");

    return NextResponse.json(
      { 
        success: !anyFailures, 
        message: overallMessage,
        plansInitialization: { summary: plansResultSummary, errors: planErrors },
        zonesInitialization: { summary: zonesResultSummary, errors: zoneErrors },
        configurationsInitialization: { summary: configsResultSummary, errors: configErrors },
      }, 
      { status: responseStatus } 
    );

  } catch (error: any) {
    console.error('API Route CRITICAL UNHANDLED Error in /initialize-collections GET handler. Error object:', error);
    if (mongoClient) {
        await mongoClient.close();
        console.log("API Route (initialize-collections): MongoDB client connection closed due to outer unhandled error.");
    }
    return NextResponse.json(
      { 
        success: false, 
        message: 'An critical unexpected error occurred during collection initialization. Check Next.js server console logs.', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

    

    