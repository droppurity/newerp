
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

  // 1. Check HTTP Method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed. Only GET is accepted.' }),
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

  // 3. Get customerId from query parameters
  const customerId = event.queryStringParameters && event.queryStringParameters.customerId;

  if (!customerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Bad Request: customerId query parameter is required.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('recharge'); // Your specified collection name

    const customerData = await collection.findOne({ customerId: customerId });

    if (!customerData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Customer with ID ${customerId} not found.` }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Update last contact timestamp for this customer
    await collection.updateOne(
      { customerId: customerId },
      { $set: { lastContact: new Date() } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        customerId: customerData.customerId,
        maxHours: customerData.maxHours, // Ensure these fields exist in your DB documents
        maxDays: customerData.maxDays,   // Ensure these fields exist
        // You could also return currentTotalHours if the ESP needs it for some reason
        // currentTotalHours: customerData.currentTotalHours 
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Error in recharge function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error fetching recharge data.', details: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
