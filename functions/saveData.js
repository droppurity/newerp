
// functions/saveData.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const secretKey = process.env.SECRET_KEY; // Use environment variable
const dbName = process.env.DB_NAME || 'droppurityDB';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  if (!uri) {
    console.error('SAVE_DATA.JS: MONGODB_URI is not defined in environment variables.');
    throw new Error('MONGODB_URI is not defined.');
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  cachedDb = db;
  console.log('SAVE_DATA.JS: Successfully connected to MongoDB and cached DB instance.');
  return db;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log('SAVE_DATA.JS: Function invoked. Method:', event.httpMethod, 'Path:', event.path);

  if (event.httpMethod !== 'POST') {
    console.log('SAVE_DATA.JS: Method Not Allowed. Only POST is accepted.');
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed. Only POST is accepted.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const authHeader = event.headers.authorization;
  const effectiveSecretKey = process.env.SECRET_KEY || "1234"; // Use env var, fallback to "1234"

  if (!authHeader || authHeader !== `Bearer ${effectiveSecretKey}`) {
    const logMsg = `SAVE_DATA.JS: Unauthorized access attempt. Invalid or missing API key. Auth Header Received: ${authHeader ? authHeader.substring(0,15) + '...' : 'NONE'}. Using key: ${process.env.SECRET_KEY ? 'env SECRET_KEY' : 'fallback "1234"'}`;
    console.warn(logMsg);
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Invalid or missing API key.' }), headers: { 'Content-Type': 'application/json' } };
  }
  console.log('SAVE_DATA.JS: Authorization successful.');


  let data;
  try {
    data = JSON.parse(event.body);
    console.log('SAVE_DATA.JS: Received data:', JSON.stringify(data));
  } catch (error) {
    console.error('SAVE_DATA.JS: Bad Request - Invalid JSON body.', error);
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Invalid JSON body.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const { customerId, dailyHours, totalHours, dailyLiters, totalLiters } = data;

  // Validate core identifier
  if (!customerId) {
    console.warn('SAVE_DATA.JS: Bad Request - customerId is required.', data);
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: customerId is required.' }), headers: { 'Content-Type': 'application/json' } };
  }

  // Validate that we have either hours or liters, but not necessarily both.
  const hasHourData = typeof dailyHours === 'number' && typeof totalHours === 'number';
  const hasLiterData = typeof dailyLiters === 'number' && typeof totalLiters === 'number';

  if (!hasHourData && !hasLiterData) {
    console.warn('SAVE_DATA.JS: Bad Request - Missing or invalid usage data. Provide either (dailyHours, totalHours) or (dailyLiters, totalLiters).', data);
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Missing or invalid usage data. Provide either hour-based or liter-based readings.' }), headers: { 'Content-Type': 'application/json' } };
  }

  let finalDailyLitersUsed;
  let finalTotalLitersUsedInCycle;
  let usageEntry = { timestamp: new Date() };

  if (hasLiterData) {
    console.log(`SAVE_DATA.JS: Processing direct liter data for customerId: ${customerId}. DailyLiters: ${dailyLiters}, TotalLiters: ${totalLiters}`);
    finalDailyLitersUsed = parseFloat(dailyLiters.toFixed(2));
    finalTotalLitersUsedInCycle = parseFloat(totalLiters.toFixed(2));
    usageEntry.dailyLitersReported = finalDailyLitersUsed;
    usageEntry.totalLitersReportedInCycle = finalTotalLitersUsedInCycle;
    if (hasHourData) { // If hours are also sent, log them
        usageEntry.dailyHoursReported = parseFloat(dailyHours.toFixed(2));
        usageEntry.totalHoursReported = parseFloat(totalHours.toFixed(2));
    }
  } else if (hasHourData) { // Only hour data is present, calculate liters
    console.log(`SAVE_DATA.JS: Processing hour-based data for customerId: ${customerId}. DailyHours: ${dailyHours}, TotalHours: ${totalHours}. Calculating liters.`);
    finalDailyLitersUsed = parseFloat((dailyHours * 15).toFixed(2));
    finalTotalLitersUsedInCycle = parseFloat((totalHours * 15).toFixed(2));
    usageEntry.dailyHoursReported = parseFloat(dailyHours.toFixed(2));
    usageEntry.totalHoursReported = parseFloat(totalHours.toFixed(2));
    usageEntry.dailyLitersCalculated = finalDailyLitersUsed; // Mark as calculated
    usageEntry.totalLitersCalculatedInCycle = finalTotalLitersUsedInCycle; // Mark as calculated
  }


  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers');

    const updateSet = {
      currentTotalLitersUsed: finalTotalLitersUsedInCycle,
      lastContact: new Date(),
      updatedAt: new Date()
    };

    // Only update currentTotalHours if totalHours was provided by the ESP
    if (typeof totalHours === 'number') {
      updateSet.currentTotalHours = parseFloat(totalHours.toFixed(2));
    }

    const result = await customersCollection.updateOne(
      { generatedCustomerId: customerId },
      {
        $set: updateSet,
        $push: {
          lastUsage: {
            $each: [usageEntry],
            $slice: -50
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      console.warn(`SAVE_DATA.JS: No customer found for generatedCustomerId: ${customerId} during saveData. Data not saved.`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Customer ID ${customerId} not found. Usage data not saved.` }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    if (result.modifiedCount === 0 && result.matchedCount > 0) {
        console.log(`SAVE_DATA.JS: Customer ${customerId} matched but not modified by saveData. Data might be identical or an issue with update logic.`);
    } else if (result.modifiedCount > 0) {
        console.log(`SAVE_DATA.JS: Customer ${customerId} usage data updated successfully. Modified count: ${result.modifiedCount}`);
    }

    console.log('SAVE_DATA.JS: Successfully processed saveData for customerId:', customerId);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usage data saved successfully.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('SAVE_DATA.JS: Error in saveData function:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error saving data.', details: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

