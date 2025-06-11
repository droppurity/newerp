
// functions/saveData.js
const { MongoClient } = require('mongodb');

// Ensure MONGODB_URI and SECRET_KEY are set in Netlify environment variables
const uri = process.env.MONGODB_URI;
const secretKey = process.env.SECRET_KEY;
const dbName = process.env.DB_NAME || 'droppurityDB'; // Or your specific DB name

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

  // 1. Check HTTP Method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed. Only POST is accepted.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // 2. Security Check: Authorization Header
  const authHeader = event.headers.authorization;
  if (!secretKey) {
    console.error('SECRET_KEY is not set in Netlify environment variables.');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server configuration error: API key not set.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized: Invalid or missing API key.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // 3. Parse Request Body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Bad Request: Invalid JSON body.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const { customerId, dailyHours, totalHours } = data;

  if (!customerId || typeof dailyHours !== 'number' || typeof totalHours !== 'number') {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Bad Request: Missing or invalid customerId, dailyHours, or totalHours.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('recharge'); // Your specified collection name

    const newUsageEntry = {
      timestamp: new Date(),
      dailyHoursReported: dailyHours,
      totalHoursReported: totalHours,
    };

    const result = await collection.updateOne(
      { customerId: customerId },
      {
        $set: {
          currentTotalHours: totalHours, // Update the main current total hours
          lastContact: new Date(),
        },
        $push: {
          lastUsage: {
            $each: [newUsageEntry],
            $slice: -20 // Keep only the last 20 usage entries, adjust as needed
          }
        }
      }
      // If you want to create the customer document if it doesn't exist (e.g., first contact)
      // you can add { upsert: true } as the third argument to updateOne.
      // However, usually, a customer record would be created when they initially "recharge" or are set up.
      // For now, assuming the record exists.
    );

    if (result.matchedCount === 0) {
        // Optionally, if you want to create the record if it's missing:
        // await collection.insertOne({
        //   customerId: customerId,
        //   currentTotalHours: totalHours,
        //   lastUsage: [newUsageEntry],
        //   maxHours: 0, // Default or fetch from a default plan
        //   maxDays: 0,  // Default or fetch
        //   rechargeDate: new Date(),
        //   lastContact: new Date()
        // });
        // return { statusCode: 201, body: JSON.stringify({ message: 'Data saved (new customer record created).' }), headers: { 'Content-Type': 'application/json' }};
      console.warn(`No customer found for ID: ${customerId} during saveData. Data not saved.`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Customer ID ${customerId} not found. Usage data not saved.` }),
        headers: { 'Content-Type': 'application/json' },
      };
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
