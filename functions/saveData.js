
// functions/saveData.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const secretKey = process.env.SECRET_KEY;
const dbName = process.env.DB_NAME || 'droppurityDB';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  cachedDb = db;
  return db;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed. Only POST is accepted.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const authHeader = event.headers.authorization;
  if (!secretKey) {
    console.error('SECRET_KEY is not set in Netlify environment variables.');
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error: API key not set.' }), headers: { 'Content-Type': 'application/json' } };
  }
  if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Invalid or missing API key.' }), headers: { 'Content-Type': 'application/json' } };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Invalid JSON body.' }), headers: { 'Content-Type': 'application/json' } };
  }

  // ESP sends customerId (generatedId), dailyHours, totalHours
  const { customerId, dailyHours, totalHours } = data;

  if (!customerId || typeof dailyHours !== 'number' || typeof totalHours !== 'number') {
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Missing or invalid customerId, dailyHours, or totalHours.' }), headers: { 'Content-Type': 'application/json' } };
  }

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
      console.warn(`No customer found for generatedCustomerId: ${customerId} during saveData. Data not saved.`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Customer ID ${customerId} not found. Usage data not saved.` }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    if (result.modifiedCount === 0 && result.matchedCount > 0) {
        console.log(`Customer ${customerId} matched but not modified by saveData. Data might be identical or an issue with update logic.`);
    }


    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usage data saved successfully.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error in saveData function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error saving data.', details: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
    