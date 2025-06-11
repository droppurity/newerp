
// functions/saveData.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
// const secretKey = process.env.SECRET_KEY; // Original line using environment variable
const secretKey = "1234"; // TEMPORARY hardcoded key for testing
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
  if (!secretKey) { // This check is less relevant now with hardcoding but kept for structure
    console.error('SAVE_DATA.JS: SERVER ERROR - SECRET_KEY is not set (hardcoded for test).');
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error: API key not set.' }), headers: { 'Content-Type': 'application/json' } };
  }
  // Using your temporary secret key "1234"
  if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
    console.warn('SAVE_DATA.JS: Unauthorized access attempt. Invalid or missing API key. Auth Header Received:', authHeader ? authHeader.substring(0,15) + '...' : 'NONE');
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Invalid or missing API key.' }), headers: { 'Content-Type': 'application/json' } };
  }
  console.log('SAVE_DATA.JS: Authorization successful.');

  let data;
  try {
    data = JSON.parse(event.body);
    console.log('SAVE_DATA.JS: Received data:', data);
  } catch (error) {
    console.error('SAVE_DATA.JS: Bad Request - Invalid JSON body.', error);
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Invalid JSON body.' }), headers: { 'Content-Type': 'application/json' } };
  }

  // ESP sends customerId (generatedId), dailyHours, totalHours
  const { customerId, dailyHours, totalHours } = data;

  if (!customerId || typeof dailyHours !== 'number' || typeof totalHours !== 'number') {
    console.warn('SAVE_DATA.JS: Bad Request - Missing or invalid customerId, dailyHours, or totalHours.', data);
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Missing or invalid customerId, dailyHours, or totalHours.' }), headers: { 'Content-Type': 'application/json' } };
  }
  console.log('SAVE_DATA.JS: Processing for customerId:', customerId, 'dailyHours:', dailyHours, 'totalHours:', totalHours);

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers');

    const newUsageEntry = {
      timestamp: new Date(),
      dailyHoursReported: dailyHours,
      totalHoursReported: totalHours, // This is total for the ESP's current cycle
    };

    const result = await customersCollection.updateOne(
      { generatedCustomerId: customerId }, // Find customer by generatedCustomerId
      {
        $set: {
          currentTotalHours: totalHours, // Update ESP's current cycle total hours
          lastContact: new Date(),
          updatedAt: new Date()
        },
        $push: {
          lastUsage: {
            $each: [newUsageEntry],
            $slice: -50 // Keep only the last 50 usage entries to manage document size
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
