
// functions/recharge.js
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

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed. Only GET is accepted.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const authHeader = event.headers.authorization;
   if (!secretKey) {
    console.error('SECRET_KEY is not set in Netlify environment variables.');
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error: API key not set.' }), headers: { 'Content-Type': 'application/json' } };
  }
  if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Invalid or missing API key.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const customerId = event.queryStringParameters && event.queryStringParameters.customerId; // This is generatedCustomerId

  if (!customerId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: customerId query parameter is required.' }), headers: { 'Content-Type': 'application/json' } };
  }

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers'); 

    const customerData = await customersCollection.findOne({ generatedCustomerId: customerId });

    if (!customerData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Customer with generated ID ${customerId} not found.` }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Update last contact timestamp for this customer
    await customersCollection.updateOne(
      { generatedCustomerId: customerId },
      { $set: { lastContact: new Date(), updatedAt: new Date() } }
    );

    // Return espCycleMaxHours and espCycleMaxDays from the customer's current plan details
    return {
      statusCode: 200,
      body: JSON.stringify({
        customerId: customerData.generatedCustomerId, // Echo back the ID
        maxHours: customerData.espCycleMaxHours || 0, // Total hours for the ESP cycle
        maxDays: customerData.espCycleMaxDays || 0,   // Days for the ESP cycle
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error in recharge function (fetching limits for ESP):', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error fetching recharge data for ESP.', details: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
    